'use client';

/**
 * BackgroundMosaic — Fills the page background with tiny tiles of
 * simulated user-generated CPPN designs, sorted by hue.
 * Clicking a tile uses that genome as a parent for breeding.
 */

import { useEffect, useRef, useCallback } from 'react';
import { generateSimulatedDesigns, type SimulatedDesign } from '@/lib/cppn/simulate';
import { evaluate } from '@/lib/cppn/network';
import type { Genome } from '@/lib/cppn/genome';

const TILE_SIZE = 32;     // pixels per tile
const USER_COUNT = 100;
const GENERATIONS = 50;

interface BackgroundMosaicProps {
  onSelectParent: (genome: Genome) => void;
}

export default function BackgroundMosaic({ onSelectParent }: BackgroundMosaicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const designsRef = useRef<SimulatedDesign[]>([]);
  const colsRef = useRef(0);

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

    setTimeout(() => {
      const designs = generateSimulatedDesigns(USER_COUNT, GENERATIONS);
      designsRef.current = designs;

      for (let i = 0; i < totalTiles; i++) {
        const design = designs[i % designs.length];
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
            pixels[idx]     = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
            pixels[idx + 1] = Math.round(Math.max(0, Math.min(1, out.g)) * 255);
            pixels[idx + 2] = Math.round(Math.max(0, Math.min(1, out.b)) * 255);
            pixels[idx + 3] = 255;
          }
        }

        ctx.putImageData(imgData, ox, oy);
      }
    }, 100);
  }, []);

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
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="fixed inset-0 w-full h-full opacity-25 cursor-pointer"
      style={{ zIndex: 0 }}
      title="Click a tile to use as parent"
    />
  );
}
