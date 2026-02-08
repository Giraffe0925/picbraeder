'use client';

/**
 * BackgroundMosaic — Fills the page background with tiny tiles of
 * simulated user-generated CPPN designs, sorted by hue.
 * Clicking a tile uses that genome as a parent for breeding.
 * 
 * パフォーマンス改善:
 * - シミュレーション数削減 (100→30, 50→20)
 * - 遅延読み込み（requestIdleCallback）
 * - 段階的描画
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { generateSimulatedDesigns, type SimulatedDesign } from '@/lib/cppn/simulate';
import { evaluate } from '@/lib/cppn/network';
import type { Genome } from '@/lib/cppn/genome';
import { useUser } from '@/store/userStore';

const TILE_SIZE = 32;     // pixels per tile
const USER_COUNT = 30;    // 100 → 30 パフォーマンス改善
const GENERATIONS = 20;   // 50 → 20 パフォーマンス改善
const BATCH_SIZE = 10;    // 一度に描画するタイル数

interface BackgroundMosaicProps {
  onSelectParent: (genome: Genome) => void;
}

export default function BackgroundMosaic({ onSelectParent }: BackgroundMosaicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const designsRef = useRef<SimulatedDesign[]>([]);
  const colsRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const { userData } = useUser();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = Math.ceil(window.innerWidth / TILE_SIZE);
    const rows = Math.ceil(window.innerHeight / TILE_SIZE);
    const totalTiles = cols * rows;
    colsRef.current = cols;

    canvas.width = cols * TILE_SIZE;
    canvas.height = rows * TILE_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 初期状態: 暗い背景で塗りつぶし
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 遅延読み込み: requestIdleCallbackがあれば使用
    const scheduleWork = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: IdleRequestCallback) => void })
          .requestIdleCallback(callback, { timeout: 500 });
      } else {
        setTimeout(callback, 50);
      }
    };

    scheduleWork(() => {
      // ユーザーの保存済み作品を優先表示
      const userDesigns: SimulatedDesign[] = [];
      if (userData?.savedWorks) {
        for (const work of userData.savedWorks) {
          if (work.genome) {
            userDesigns.push({
              genome: work.genome as Genome,
              hue: 0  // hue計算は省略
            });
          }
        }
      }

      // シミュレーションデータを生成
      const simulatedDesigns = generateSimulatedDesigns(USER_COUNT, GENERATIONS);

      // ユーザー作品を先頭に配置
      const allDesigns = [...userDesigns, ...simulatedDesigns];
      designsRef.current = allDesigns;

      // 段階的描画
      let currentTile = 0;

      const drawBatch = () => {
        if (currentTile >= totalTiles) {
          setIsLoading(false);
          return;
        }

        const endTile = Math.min(currentTile + BATCH_SIZE, totalTiles);

        for (let i = currentTile; i < endTile; i++) {
          const design = allDesigns[i % allDesigns.length];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const ox = col * TILE_SIZE;
          const oy = row * TILE_SIZE;

          const imgData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
          const pixels = imgData.data;

          for (let iy = 0; iy < TILE_SIZE; iy++) {
            const y = (iy / (TILE_SIZE - 1)) * 2 - 1;
            for (let ix = 0; ix < TILE_SIZE; ix++) {
              const x = (ix / (TILE_SIZE - 1)) * 2 - 1;
              const out = evaluate(
                design.genome.nodes,
                design.genome.connections,
                x, y, 0,
              );
              const idx = (iy * TILE_SIZE + ix) * 4;
              pixels[idx] = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
              pixels[idx + 1] = Math.round(Math.max(0, Math.min(1, out.g)) * 255);
              pixels[idx + 2] = Math.round(Math.max(0, Math.min(1, out.b)) * 255);
              pixels[idx + 3] = 255;
            }
          }

          ctx.putImageData(imgData, ox, oy);
        }

        currentTile = endTile;

        // 次のバッチを遅延実行
        scheduleWork(drawBatch);
      };

      // 最初のバッチを開始
      drawBatch();
    });
  }, [userData?.savedWorks]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const designs = designsRef.current;
    if (designs.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    const index = row * colsRef.current + col;
    const design = designs[index % designs.length];

    if (design) {
      onSelectParent(design.genome);
    }
  }, [onSelectParent]);

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="fixed inset-0 w-full h-full opacity-25 cursor-pointer"
        style={{ zIndex: 0 }}
        title="Click a tile to use as parent"
      />
      {isLoading && (
        <div className="fixed bottom-4 right-4 text-xs text-neutral-500 z-10">
          Loading patterns...
        </div>
      )}
    </>
  );
}
