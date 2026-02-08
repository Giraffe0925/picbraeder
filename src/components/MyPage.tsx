'use client';

/**
 * MyPage.tsx — マイページ（履歴管理画面）
 * ユーザーのセッション履歴と保存作品を一覧表示・管理する
 */

import { useUser, type SessionHistory, type SavedWork } from '@/store/userStore';
import type { Genome } from '@/lib/cppn/genome';
import { evaluate } from '@/lib/cppn/network';
import { useEffect, useRef, useState } from 'react';

interface MyPageProps {
    onResumeSession: (session: SessionHistory) => void;
    onNewSession: () => void;
}

/** サムネイルを描画するためのキャンバス */
function ThumbnailCanvas({ genome }: { genome: Genome }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const SIZE = 80;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imgData = ctx.createImageData(SIZE, SIZE);
        const pixels = imgData.data;

        for (let iy = 0; iy < SIZE; iy++) {
            const y = (iy / (SIZE - 1)) * 2 - 1;
            for (let ix = 0; ix < SIZE; ix++) {
                const x = (ix / (SIZE - 1)) * 2 - 1;
                const out = evaluate(genome.nodes, genome.connections, x, y, 0);
                const idx = (iy * SIZE + ix) * 4;
                pixels[idx] = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
                pixels[idx + 1] = Math.round(Math.max(0, Math.min(1, out.g)) * 255);
                pixels[idx + 2] = Math.round(Math.max(0, Math.min(1, out.b)) * 255);
                pixels[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }, [genome]);

    return (
        <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="w-full aspect-square object-cover rounded bg-neutral-800"
        />
    );
}

/** 日時をフォーマット */
function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MyPage({ onResumeSession, onNewSession }: MyPageProps) {
    const { currentUser, userData, deleteHistory, deleteSavedWork } = useUser();
    const [activeTab, setActiveTab] = useState<'history' | 'works'>('history');

    if (!userData) {
        return (
            <div className="text-center text-neutral-400 py-8 animate-pulse">
                データを読み込み中...
            </div>
        );
    }

    const { history, session, savedWorks } = userData;

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            {/* ヘッダーエリア */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-light tracking-wide text-white">
                        {currentUser}&apos;s My Page
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                        保存した履歴と作品を管理します
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onNewSession}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-medium rounded-full shadow-lg hover:shadow-orange-500/20 hover:scale-105 transition-all duration-300"
                >
                    🎲 新しく始める
                </button>
            </div>

            {/* タブ切り替え */}
            <div className="flex border-b border-neutral-800 mb-8">
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-sm tracking-widest uppercase transition-colors relative
            ${activeTab === 'history' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    履歴 ({history.length})
                    {activeTab === 'history' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('works')}
                    className={`flex-1 py-3 text-sm tracking-widest uppercase transition-colors relative
            ${activeTab === 'works' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    作品 ({savedWorks?.length ?? 0})
                    {activeTab === 'works' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    )}
                </button>
            </div>

            {/* コンテンツエリア */}
            <div className="min-h-[400px]">
                {/* === 履歴タブ === */}
                {activeTab === 'history' && (
                    <div className="space-y-8">
                        {/* 前回の続き */}
                        {session && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    前回の続き
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => onResumeSession({
                                        id: 'current',
                                        name: '前回のセッション',
                                        session,
                                        createdAt: session.savedAt,
                                    })}
                                    className="w-full p-1 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-xl border border-neutral-700 hover:border-orange-500/50 hover:from-neutral-800 hover:to-neutral-800 transition-all duration-300 group overflow-hidden shadow-lg"
                                >
                                    <div className="flex items-center gap-5 p-4 relative z-10">
                                        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-neutral-600 shadow-inner bg-black/50">
                                            {session.population && session.population.length > 0 ? (
                                                <ThumbnailCanvas genome={session.population[0] as Genome} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">No Image</div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-lg text-white font-medium group-hover:text-orange-400 transition-colors">
                                                第{session.generation}世代から再開
                                            </div>
                                            <div className="text-sm text-neutral-400 mt-1 flex items-center gap-3">
                                                <span>🕒 {formatDate(session.savedAt)}</span>
                                                <span className="text-neutral-600">|</span>
                                                <span>📦 Archive: {session.archiveSize}</span>
                                            </div>
                                        </div>
                                        <div className="mr-4 text-3xl text-neutral-700 group-hover:text-orange-500 group-hover:translate-x-1 transition-all">
                                            →
                                        </div>
                                    </div>
                                    {/* 背景装飾 */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </button>
                            </div>
                        )}

                        {/* 保存済み履歴リスト */}
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            <h3 className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-4">
                                保存済み履歴
                            </h3>

                            {history.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
                                    <p className="text-neutral-500 text-sm">保存された履歴はありません</p>
                                    <p className="text-neutral-600 text-xs mt-2">気に入った状態を保存して、あとから再開できます</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {history.map((h) => (
                                        <div
                                            key={h.id}
                                            className="relative group bg-neutral-900/50 border border-neutral-800 rounded-lg hover:border-neutral-600 hover:bg-neutral-800 transition-all duration-200 overflow-hidden"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onResumeSession(h)}
                                                className="w-full p-4 text-left flex gap-4"
                                            >
                                                <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-black/50 border border-neutral-700">
                                                    {h.session.population && h.session.population.length > 0 && (
                                                        <ThumbnailCanvas genome={h.session.population[0] as Genome} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                                                        {h.name}
                                                    </h4>
                                                    <div className="text-xs text-neutral-400 mt-1">
                                                        第{h.session.generation}世代
                                                    </div>
                                                    <div className="text-xs text-neutral-600 mt-0.5">
                                                        {formatDate(h.createdAt)}
                                                    </div>
                                                </div>
                                            </button>

                                            {/* 削除ボタン */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`履歴「${h.name}」を削除しますか？`)) {
                                                        deleteHistory(h.id);
                                                    }
                                                }}
                                                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full
                                   bg-black/60 text-neutral-400 hover:bg-red-900/80 hover:text-red-200
                                   opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm transform scale-90 hover:scale-100"
                                                title="削除"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* === 作品タブ === */}
                {activeTab === 'works' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {(!savedWorks || savedWorks.length === 0) ? (
                            <div className="text-center py-16 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
                                <div className="text-4xl mb-4 opacity-20">🎨</div>
                                <p className="text-neutral-500 text-sm">まだ保存された作品はありません</p>
                                <p className="text-neutral-600 text-xs mt-2">
                                    進化の過程で「購入する」ボタンを押すと<br />ここに作品が保存されます
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {savedWorks.map((work, idx) => (
                                    <div
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={`${work.savedAt}-${idx}`}
                                        className="group relative aspect-square bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden hover:border-neutral-600 transition-colors"
                                    >
                                        {/* サムネイル */}
                                        <div className="absolute inset-0">
                                            <ThumbnailCanvas genome={work.genome as Genome} />
                                        </div>

                                        {/* オーバーレイ情報 */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                            <div className="text-white text-xs font-medium truncate">
                                                {work.name}
                                            </div>
                                            <div className="text-[10px] text-neutral-400">
                                                {formatDate(work.savedAt)}
                                            </div>
                                        </div>

                                        {/* 削除ボタン */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`作品「${work.name}」を削除しますか？`)) {
                                                    deleteSavedWork(idx);
                                                }
                                            }}
                                            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full
                                 bg-black/60 text-white shadow-lg
                                 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 transform scale-90 hover:scale-100"
                                            title="削除"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
