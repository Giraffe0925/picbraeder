'use client';

/**
 * SuzuriOrderPanel — SUZURI で注文するためのパネル
 * 2Dパターンを画像化してSUZURIにアップロード
 */

import { useState, useRef, useEffect } from 'react';
import type { Genome } from '@/lib/cppn/genome';
import { evaluate } from '@/lib/cppn/network';

const EXPORT_SIZE = 512;  // 高解像度で出力

interface SuzuriOrderPanelProps {
    genome: Genome;
    onOrder?: () => void;
}

export default function SuzuriOrderPanel({ genome, onOrder }: SuzuriOrderPanelProps) {
    const [loading, setLoading] = useState(false);
    const [productUrl, setProductUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 高解像度の2Dパターンを生成
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imgData = ctx.createImageData(EXPORT_SIZE, EXPORT_SIZE);
        const pixels = imgData.data;

        for (let iy = 0; iy < EXPORT_SIZE; iy++) {
            const y = (iy / (EXPORT_SIZE - 1)) * 2 - 1;
            for (let ix = 0; ix < EXPORT_SIZE; ix++) {
                const x = (ix / (EXPORT_SIZE - 1)) * 2 - 1;
                const out = evaluate(genome.nodes, genome.connections, x, y, 0);
                const idx = (iy * EXPORT_SIZE + ix) * 4;
                pixels[idx] = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
                pixels[idx + 1] = Math.round(Math.max(0, Math.min(1, out.g)) * 255);
                pixels[idx + 2] = Math.round(Math.max(0, Math.min(1, out.b)) * 255);
                pixels[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }, [genome]);

    const handleOrder = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setLoading(true);
        setError(null);

        try {
            const imageBase64 = canvas.toDataURL('image/png');

            const res = await fetch('/api/suzuri', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64,
                    title: `Picbraeder #${genome.id.slice(0, 8)}`,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // より分かりやすいエラーメッセージを表示
                if (data.error === 'SUZURI API key not configured') {
                    throw new Error('SUZURI APIキーが設定されていません（管理者に連絡してください）');
                }
                throw new Error(data.error || 'APIエラーが発生しました');
            }

            if (data.productUrl) {
                setProductUrl(data.productUrl);
            } else {
                setError('商品URLを取得できませんでした');
            }
            // 注文成功時にコールバックを実行
            if (onOrder) onOrder();
        } catch (e) {
            console.error('SUZURI order error:', e);
            setError(e instanceof Error ? e.message : '注文に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 border border-neutral-800 p-4">
            <h3 className="text-xs tracking-widest uppercase text-neutral-400">
                Order Keychain
            </h3>

            {/* 隠しキャンバス（高解像度出力用） */}
            <canvas
                ref={canvasRef}
                width={EXPORT_SIZE}
                height={EXPORT_SIZE}
                className="hidden"
            />

            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}

            {productUrl ? (
                <a
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-orange-600 text-white px-4 py-2 text-center text-sm
                     hover:bg-orange-500 transition-colors"
                >
                    Order on SUZURI
                </a>
            ) : (
                <button
                    onClick={handleOrder}
                    disabled={loading}
                    className="bg-orange-600 text-white px-4 py-2 text-sm
                     hover:bg-orange-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Preparing...' : 'Order Keychain'}
                </button>
            )}

            <p className="text-[10px] text-neutral-500">
                ※ Create an Acrylic Keychain on SUZURI
            </p>
        </div>
    );
}
