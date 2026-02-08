'use client';

/**
 * ExportPanel — STL download and cost estimate for a selected genome.
 */

import { useCallback, useState } from 'react';
import * as THREE from 'three';
import type { Genome } from '@/lib/cppn/genome';
import { voxelize, morphOpen, keepLargestComponent } from '@/lib/mesher/voxelizer';
import { marchingCubes } from '@/lib/mesher/marchingCubes';

// ── Constants ─────────────────────────────────────────────────────

const EXPORT_RES = 50;
const BOUNDING_MM = 50; // 50mm bounding box
const MATERIAL_COST_PER_CM3 = 100; // JPY
const BASE_FEE = 500; // JPY

// ── STL export helpers ────────────────────────────────────────────

function geometryToSTLBinary(geometry: THREE.BufferGeometry): ArrayBuffer {
  const posAttr = geometry.getAttribute('position');
  const norAttr = geometry.getAttribute('normal');
  const triCount = posAttr.count / 3;

  // Scale: mesh coords [-1,1] → [0, BOUNDING_MM]
  const scale = BOUNDING_MM / 2;
  const offset = BOUNDING_MM / 2;

  const bufferLength = 80 + 4 + triCount * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // 80-byte header (zeros)
  // Triangle count
  view.setUint32(80, triCount, true);

  let byteOffset = 84;
  for (let t = 0; t < triCount; t++) {
    const i = t * 3;

    // Normal (from first vertex of triangle)
    const nx = norAttr.getX(i);
    const ny = norAttr.getY(i);
    const nz = norAttr.getZ(i);
    view.setFloat32(byteOffset, nx, true); byteOffset += 4;
    view.setFloat32(byteOffset, ny, true); byteOffset += 4;
    view.setFloat32(byteOffset, nz, true); byteOffset += 4;

    // 3 vertices
    for (let v = 0; v < 3; v++) {
      const vi = i + v;
      view.setFloat32(byteOffset, posAttr.getX(vi) * scale + offset, true); byteOffset += 4;
      view.setFloat32(byteOffset, posAttr.getY(vi) * scale + offset, true); byteOffset += 4;
      view.setFloat32(byteOffset, posAttr.getZ(vi) * scale + offset, true); byteOffset += 4;
    }

    // Attribute byte count
    view.setUint16(byteOffset, 0, true); byteOffset += 2;
  }

  return buffer;
}

/** Estimate volume from voxel count (simpler and faster than mesh volume). */
function estimateVolumeCm3(solidVoxels: number, resolution: number): number {
  const voxelSizeMm = BOUNDING_MM / resolution;
  const voxelVolMm3 = voxelSizeMm ** 3;
  const totalMm3 = solidVoxels * voxelVolMm3;
  return totalMm3 / 1000; // mm³ → cm³
}

// ── Component ─────────────────────────────────────────────────────

interface ExportPanelProps {
  genome: Genome | null;
}

export default function ExportPanel({ genome }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (!genome) return;
    setExporting(true);

    // Run heavy work in a setTimeout to not block the UI
    setTimeout(() => {
      const raw = voxelize(genome.nodes, genome.connections, EXPORT_RES);
      const cleaned = keepLargestComponent(morphOpen(raw), 0.3);
      const geo = marchingCubes(cleaned, 0.3);

      const stl = geometryToSTLBinary(geo);
      const blob = new Blob([stl], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `keychain_${genome.id}.stl`;
      a.click();
      URL.revokeObjectURL(url);

      setExporting(false);
    }, 50);
  }, [genome]);

  if (!genome) return null;

  // Quick volume estimate from preview-res grid
  const raw = voxelize(genome.nodes, genome.connections, 30);
  const cleaned = keepLargestComponent(morphOpen(raw), 0.3);
  const solidCount = cleaned.data.reduce((s, v) => s + (v >= 0.3 ? 1 : 0), 0);
  const volumeCm3 = estimateVolumeCm3(solidCount, 30);
  const cost = Math.round(volumeCm3 * MATERIAL_COST_PER_CM3 + BASE_FEE);

  return (
    <div className="flex flex-col gap-3 border border-neutral-800 p-4 text-sm">
      <h3 className="text-xs tracking-widest uppercase text-neutral-400">Export</h3>

      <div className="flex justify-between text-neutral-300">
        <span>Volume</span>
        <span>{volumeCm3.toFixed(2)} cm&sup3;</span>
      </div>

      <div className="flex justify-between text-neutral-300">
        <span>Est. cost</span>
        <span>&yen;{cost.toLocaleString()}</span>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="mt-2 border border-neutral-700 px-4 py-2 hover:bg-white hover:text-black transition-colors disabled:opacity-40"
      >
        {exporting ? 'Generating...' : 'Download STL'}
      </button>
    </div>
  );
}
