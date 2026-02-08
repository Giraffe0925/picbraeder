'use client';

/**
 * Gallery — Displays preset designs + user's saved works.
 * Users can click to branch (use as parent) or delete saved works.
 */

import PicCanvas from './PicCanvas';
import { PRESETS } from '@/lib/cppn/presets';
import type { Genome } from '@/lib/cppn/genome';
import type { SavedWork } from '@/lib/cppn/savedWorks';

interface GalleryProps {
  onSelectParent: (genome: Genome) => void;
  savedWorks: SavedWork[];
  onDeleteSaved: (index: number) => void;
}

export default function Gallery({ onSelectParent, savedWorks, onDeleteSaved }: GalleryProps) {
  return (
    <div className="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-1">
      {/* Saved works (user's own) */}
      {savedWorks.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm tracking-widest uppercase text-neutral-400">
            My Works
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {savedWorks.map((work, i) => (
              <div key={`saved-${i}`} className="flex flex-col gap-1 relative group">
                <PicCanvas
                  genome={work.genome}
                  onClick={() => onSelectParent(work.genome)}
                />
                <span className="text-[10px] text-neutral-500 text-center truncate">
                  {work.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteSaved(i); }}
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center
                             bg-red-900/80 text-red-300 text-[10px]
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm tracking-widest uppercase text-neutral-400">
          Community Designs
        </h2>
        <p className="text-xs text-neutral-500">
          Click to branch
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(preset => (
            <div key={preset.id} className="flex flex-col gap-1">
              <PicCanvas
                genome={preset}
                onClick={() => onSelectParent(preset)}
              />
              <span className="text-[10px] text-neutral-500 text-center">
                {preset.displayName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
