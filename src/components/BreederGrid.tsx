'use client';

/**
 * BreederGrid — Left: HowTo. Right: 3×3 evolution grid.
 * Supports: single-click evolve, Shift+click multi-select, save, auto-explore, purchase.
 */

import { useState } from 'react';
import PicCanvas from './PicCanvas';
import InspectorModal from './InspectorModal';
import { useEvolutionStore } from '@/store/evolutionStore';
import type { Genome } from '@/lib/cppn/genome';

export default function BreederGrid() {
  const [inspecting, setInspecting] = useState<Genome | null>(null);
  const {
    generation,
    population,
    select,
    toggleSelect,
    breedFromSelected,
    selectedIds,
    reset,
    autoExplore,
    archiveSize,
    save,
  } = useEvolutionStore();

  const handleGridClick = (genome: Genome, e: React.MouseEvent) => {
    if (e.shiftKey) {
      toggleSelect(genome.id);
    } else {
      select(genome);
    }
  };

  return (
    <>
      <div className="flex gap-8 w-full max-w-[1100px] mx-auto relative z-10">
        {/* Left: How to Use - スタイリッシュな説明 */}
        <div className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="border-l-2 border-orange-500 pl-4">
              <h3 className="text-xs uppercase tracking-[0.2em] text-orange-400 mb-3">
                How to Use
              </h3>
              <ul className="space-y-4 text-sm text-neutral-400">
                <li className="flex gap-3">
                  <span className="text-orange-500 font-bold">01</span>
                  <span>好きなパターンを<br />クリック</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-orange-500 font-bold">02</span>
                  <span>進化を<br />繰り返す</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-orange-500 font-bold">03</span>
                  <span>気に入ったら<br />「購入する」をクリック</span>
                </li>
              </ul>
            </div>

            <div className="border-l-2 border-neutral-700 pl-4">
              <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">
                Tips
              </h3>
              <ul className="space-y-3 text-xs text-neutral-500">
                <li className="flex items-start gap-2">
                  <span className="text-neutral-600">▸</span>
                  <span>Shift+クリックで複数選択、交配可能</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neutral-600">▸</span>
                  <span>「自動探索」で新規性の高いパターンを発見</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neutral-600">▸</span>
                  <span>「+」ボタンで作品を保存</span>
                </li>
              </ul>
            </div>

            {/* 購入に関する安心情報 */}
            <div className="border-l-2 border-emerald-600 pl-4 bg-emerald-950/30 py-2 -ml-[2px] rounded-r">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                「購入する」ボタンを押しても<br />
                <span className="text-emerald-400">まだ購入は確定しません。</span><br />
                SUZURIのサイトに移動後、<br />
                お支払い手続きで確定します。
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-800">
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                CPPN-NEAT AIが生成<br />
                唯一無二のキーホルダー
              </p>
            </div>
          </div>
        </div>

        {/* Right: Breeder Grid */}
        <div className="flex-1 flex flex-col items-center gap-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <h2 className="text-sm tracking-widest uppercase text-neutral-400">
              Generation {generation}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="text-xs border border-neutral-700 px-3 py-1 hover:bg-white hover:text-black transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={autoExplore}
              className="text-xs border border-emerald-600 bg-emerald-900/50 text-emerald-300 px-3 py-1
                         hover:bg-emerald-500 hover:text-white transition-colors"
              title="新規性の高いパターンを自動で探索します"
            >
              自動探索
            </button>
            {/* Multi-parent breed button */}
            {selectedIds.size >= 2 && (
              <button
                type="button"
                onClick={breedFromSelected}
                className="text-xs border border-blue-600 bg-blue-900/50 text-blue-300 px-3 py-1
                           hover:bg-blue-500 hover:text-white transition-colors"
              >
                選択した{selectedIds.size}個を交配
              </button>
            )}
          </div>

          {/* Instructions (mobile) */}
          <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap justify-center lg:hidden">
            <p>クリックで進化 / Shift+クリックで複数選択</p>
          </div>

          {/* Archive info */}
          {archiveSize > 0 && (
            <div className="text-xs text-neutral-600">
              Archive: {archiveSize}
            </div>
          )}

          {/* 3×3 Grid */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[720px]">
            {population.map(genome => {
              const isSelected = selectedIds.has(genome.id);
              return (
                <div
                  key={genome.id}
                  className={`relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <PicCanvas
                    genome={genome}
                    onClick={(e) => handleGridClick(genome, e)}
                  />
                  {/* Novelty score */}
                  {genome.novelty !== undefined && (
                    <div className="absolute top-1 left-1 bg-black/70 text-[10px] text-neutral-400 px-1 rounded">
                      N: {genome.novelty.toFixed(2)}
                    </div>
                  )}
                  {/* Save button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const name = prompt('作品の名前を入力してください:');
                      if (name) save(genome, name);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center
                               bg-black/60 border border-neutral-700 text-neutral-400
                               opacity-0 group-hover:opacity-100 transition-opacity
                               hover:bg-white hover:text-black hover:border-white text-[10px]"
                    title="保存する"
                  >
                    +
                  </button>
                  {/* Purchase button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspecting(genome);
                    }}
                    className="w-full text-xs py-1.5 bg-neutral-900 border border-neutral-700
                               text-neutral-300 hover:bg-white hover:text-black transition-colors"
                  >
                    購入する
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inspector Modal for 3D preview + purchase */}
      {inspecting && (
        <InspectorModal
          genome={inspecting}
          onClose={() => setInspecting(null)}
        />
      )}
    </>
  );
}
