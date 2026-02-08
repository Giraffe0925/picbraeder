'use client';

/**
 * PicCanvas — Renders a CPPN as a 2D colour pattern on an HTML canvas.
 * Evaluates the network at every pixel with inputs (x, y, d, bias)
 * and uses the R, G, B outputs for colour.
 */

import { useEffect, useRef } from 'react';
import type { Genome } from '@/lib/cppn/genome';
import { evaluate } from '@/lib/cppn/network';

const CANVAS_SIZE = 128; // pixels per side (rendered, CSS scales up)

interface PicCanvasProps {
  genome: Genome;
  onClick?: (e: React.MouseEvent) => void;
}

export default function PicCanvas({ genome, onClick }: PicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const pixels = imgData.data;

    for (let iy = 0; iy < CANVAS_SIZE; iy++) {
      const y = (iy / (CANVAS_SIZE - 1)) * 2 - 1; // [-1, 1]
      for (let ix = 0; ix < CANVAS_SIZE; ix++) {
        const x = (ix / (CANVAS_SIZE - 1)) * 2 - 1; // [-1, 1]

        const out = evaluate(genome.nodes, genome.connections, x, y, 0);

        const idx = (iy * CANVAS_SIZE + ix) * 4;
        pixels[idx]     = Math.round(Math.max(0, Math.min(1, out.r)) * 255);
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
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={onClick}
      className="w-full aspect-square cursor-pointer border border-neutral-800 hover:border-white transition-colors"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
