'use client';

/**
 * CommunityDesignsModal — 他ユーザーが作成したパターンを親として選択するモーダル
 * シミュレーションで生成したパターンを表示し、世代情報も表示
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSimulatedDesigns, type SimulatedDesign } from '@/lib/cppn/simulate';
import { evaluate } from '@/lib/cppn/network';
import type { Genome } from '@/lib/cppn/genome';

const DISPLAY_COUNT = 12;  // 表示するパターン数
const TILE_SIZE = 80;      // タイルサイズ

interface CommunityDesignsModalProps {
    onSelect: (genome: Genome) => void;
    onClose: () => void;
}

interface DesignWithMeta extends SimulatedDesign {
    generation: number;
    userId: number;
}

export default function CommunityDesignsModal({ onSelect, onClose }: CommunityDesignsModalProps) {
    const [designs, setDesigns] = useState<DesignWithMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

    // シミュレーションデータを生成
    useEffect(() => {
        const timer = setTimeout(() => {
            const simulated = generateSimulatedDesigns(50, 30);

            // ランダムに選択してメタデータを追加
            const shuffled = [...simulated].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, DISPLAY_COUNT).map((d, i) => ({
                ...d,
                generation: Math.floor(Math.random() * 30) + 1,  // 1-30世代
                userId: Math.floor(Math.random() * 1000) + 1,    // ユーザーID
            }));

            setDesigns(selected);
            setIsLoading(false);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // パターンをCanvasに描画
    const renderDesign = useCallback((canvas: HTMLCanvasElement, genome: Genome) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imgData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
        const pixels = imgData.data;

        for (let iy = 0; iy < TILE_SIZE; iy++) {
            const y = (iy / (TILE_SIZE - 1)) * 2 - 1;
            for (let ix = 0; ix < TILE_SIZE; ix++) {
                const x = (ix / (TILE_SIZE - 1)) * 2 - 1;
                const out = evaluate(genome.nodes, genome.connections, x, y, 0);
                const idx = (iy * TILE_SIZE + ix) * 4;
                pixels[idx] = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
                pixels[idx + 1] = Math.round(Math.max(0, Math.min(1, out.g)) * 255);
                pixels[idx + 2] = Math.round(Math.max(0, Math.min(1, out.b)) * 255);
                pixels[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }, []);

    // デザインが更新されたらCanvas描画
    useEffect(() => {
        designs.forEach((design, index) => {
            const canvas = canvasRefs.current.get(index);
            if (canvas) {
                renderDesign(canvas, design.genome);
            }
        });
    }, [designs, renderDesign]);

    const handleSelect = (design: DesignWithMeta) => {
        onSelect(design.genome);
        onClose();
    };

    const handleRefresh = () => {
        setIsLoading(true);
        const simulated = generateSimulatedDesigns(50, 30);
        const shuffled = [...simulated].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, DISPLAY_COUNT).map((d) => ({
            ...d,
            generation: Math.floor(Math.random() * 30) + 1,
            userId: Math.floor(Math.random() * 1000) + 1,
        }));
        setDesigns(selected);
        setIsLoading(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-neutral-950 border border-neutral-800 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-white">
                        🌐 コミュニティデザインを親にする
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-neutral-500 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                <p className="text-sm text-neutral-400 mb-4">
                    他のユーザーが進化させたパターンを選んで、あなたの進化の親として使用できます。
                </p>

                {/* Refresh button */}
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="mb-4 px-4 py-1.5 text-sm border border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-400 transition-colors disabled:opacity-50"
                >
                    🔄 別のパターンを表示
                </button>

                {/* Designs grid */}
                {isLoading ? (
                    <div className="text-center py-12 text-neutral-500">
                        Loading...
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {designs.map((design, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSelect(design)}
                                className="group relative bg-neutral-900 border border-neutral-800 hover:border-orange-500 transition-colors p-2"
                            >
                                <canvas
                                    ref={(el) => {
                                        if (el) {
                                            el.width = TILE_SIZE;
                                            el.height = TILE_SIZE;
                                            canvasRefs.current.set(index, el);
                                        }
                                    }}
                                    className="w-full aspect-square"
                                />
                                <div className="mt-2 text-xs text-neutral-500 group-hover:text-orange-400 transition-colors">
                                    <div>👤 User #{design.userId}</div>
                                    <div>🧬 Gen {design.generation}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-sm border border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-400 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
}
