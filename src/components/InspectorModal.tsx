'use client';

/**
 * InspectorModal — モーダルで2Dパターンプレビューを表示
 * SuzuriOrderPanel でキーホルダー注文が可能
 */

import { useEffect, useRef } from 'react';
import type { Genome } from '@/lib/cppn/genome';
import { evaluate } from '@/lib/cppn/network';
import SuzuriOrderPanel from './SuzuriOrderPanel';
import { useEvolutionStore } from '@/store/evolutionStore';

const PREVIEW_SIZE = 400;  // プレビュー用のサイズ

interface InspectorModalProps {
  genome: Genome;
  onClose: () => void;
}

export default function InspectorModal({ genome, onClose }: InspectorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { save } = useEvolutionStore();

  const handleOrderComplete = () => {
    // 注文が完了したら、自動的に作品として保存する
    const now = new Date();
    const timestamp = now.toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\//g, '-');

    save(genome, `注文作品 ${timestamp}`);
  };

  // 2Dパターンを生成してキャンバスに描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(PREVIEW_SIZE, PREVIEW_SIZE);
    const pixels = imgData.data;

    for (let iy = 0; iy < PREVIEW_SIZE; iy++) {
      const y = (iy / (PREVIEW_SIZE - 1)) * 2 - 1;
      for (let ix = 0; ix < PREVIEW_SIZE; ix++) {
        const x = (ix / (PREVIEW_SIZE - 1)) * 2 - 1;
        const out = evaluate(genome.nodes, genome.connections, x, y, 0);
        const idx = (iy * PREVIEW_SIZE + ix) * 4;
        pixels[idx] = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
        pixels[idx + 1] = Math.round(Math.max(0, Math.min(1, out.g)) * 255);
        pixels[idx + 2] = Math.round(Math.max(0, Math.min(1, out.b)) * 255);
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [genome]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col bg-neutral-950 border border-neutral-800 w-[90vw] max-w-[900px] h-[80vh] max-h-[700px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-4 py-3 border-b border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* 2D Pattern Preview */}
          <div className="flex-1 flex items-center justify-center p-8">
            <canvas
              ref={canvasRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="max-w-full max-h-full object-contain border border-neutral-700 shadow-lg"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Side panel */}
          <div className="w-56 shrink-0 border-l border-neutral-800 p-4 flex flex-col gap-4 overflow-y-auto">
            <SuzuriOrderPanel genome={genome} onOrder={handleOrderComplete} />
            <p className="text-xs text-neutral-600 mt-auto">
              ※ SUZURIでアクリルキーホルダーを作成します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
