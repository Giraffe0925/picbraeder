/**
 * Voxelizer — Query a CPPN over a 3D grid and produce a density volume.
 *
 * Includes morphological opening (erode → dilate) to remove floating
 * noise before mesh generation, as specified in the design doc.
 */

import { evaluate, type NodeGene, type ConnectionGene } from '../cppn/network';

// ── Types ─────────────────────────────────────────────────────────

export interface VoxelGrid {
  /** Flat Float32Array of length res³ — density per voxel */
  data: Float32Array;
  /** Grid resolution per axis */
  resolution: number;
}

// ── Voxelise ──────────────────────────────────────────────────────

/**
 * Evaluate the CPPN at every voxel in a `res × res × res` grid.
 * Coordinates are normalised to [-1, 1].
 */
export function voxelize(
  nodes: NodeGene[],
  connections: ConnectionGene[],
  resolution: number,
): VoxelGrid {
  const data = new Float32Array(resolution * resolution * resolution);
  const step = 2.0 / (resolution - 1); // maps [0, res-1] → [-1, 1]

  let idx = 0;
  for (let iz = 0; iz < resolution; iz++) {
    const z = -1.0 + iz * step;
    for (let iy = 0; iy < resolution; iy++) {
      const y = -1.0 + iy * step;
      for (let ix = 0; ix < resolution; ix++) {
        const x = -1.0 + ix * step;
        const out = evaluate(nodes, connections, x, y, z);

        // Spherical envelope: smoothly fade to negative beyond radius 0.9
        const d = Math.sqrt(x * x + y * y + z * z);
        const envelope = Math.max(0, 1.0 - d / 0.9);

        data[idx++] = out.density * envelope;
      }
    }
  }

  return { data, resolution };
}

// ── Morphological operations ──────────────────────────────────────

/** 6-connected neighbour offsets (±x, ±y, ±z) */
function neighbours6(idx: number, res: number): number[] {
  const total = res * res * res;
  const ix = idx % res;
  const iy = Math.floor(idx / res) % res;
  const iz = Math.floor(idx / (res * res));
  const result: number[] = [];

  if (ix > 0) result.push(idx - 1);
  if (ix < res - 1) result.push(idx + 1);
  if (iy > 0) result.push(idx - res);
  if (iy < res - 1) result.push(idx + res);
  if (iz > 0) result.push(idx - res * res);
  if (iz < res - 1) result.push(idx + res * res);

  return result;
}

/** Erode: output is min of self and all 6-neighbours. */
function erode(src: Float32Array, res: number): Float32Array {
  const len = res * res * res;
  const dst = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let minVal = src[i];
    const nbrs = neighbours6(i, res);
    for (const n of nbrs) {
      if (src[n] < minVal) minVal = src[n];
    }
    dst[i] = minVal;
  }
  return dst;
}

/** Dilate: output is max of self and all 6-neighbours. */
function dilate(src: Float32Array, res: number): Float32Array {
  const len = res * res * res;
  const dst = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let maxVal = src[i];
    const nbrs = neighbours6(i, res);
    for (const n of nbrs) {
      if (src[n] > maxVal) maxVal = src[n];
    }
    dst[i] = maxVal;
  }
  return dst;
}

/**
 * Morphological opening (erode then dilate).
 * Removes isolated 1-voxel noise / thin protrusions.
 */
export function morphOpen(grid: VoxelGrid): VoxelGrid {
  const eroded = erode(grid.data, grid.resolution);
  const opened = dilate(eroded, grid.resolution);
  return { data: opened, resolution: grid.resolution };
}

// ── Largest connected component ───────────────────────────────────

/**
 * Keep only the largest 6-connected solid region.
 * Voxels with density >= isoLevel are considered solid.
 * Non-largest components are set to -1 (well below any iso-level).
 */
export function keepLargestComponent(grid: VoxelGrid, isoLevel: number = 0.0): VoxelGrid {
  const res = grid.resolution;
  const len = res * res * res;
  const labels = new Int32Array(len).fill(-1); // -1 = unlabelled
  let currentLabel = 0;
  const componentSizes: number[] = [];

  // Flood-fill labelling
  for (let i = 0; i < len; i++) {
    if (grid.data[i] < isoLevel) continue; // not solid
    if (labels[i] >= 0) continue;           // already labelled

    // BFS
    const queue = [i];
    labels[i] = currentLabel;
    let size = 0;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      size++;
      for (const n of neighbours6(idx, res)) {
        if (grid.data[n] >= isoLevel && labels[n] < 0) {
          labels[n] = currentLabel;
          queue.push(n);
        }
      }
    }

    componentSizes.push(size);
    currentLabel++;
  }

  if (componentSizes.length === 0) return grid;

  // Find largest component
  let largestLabel = 0;
  let largestSize = 0;
  for (let l = 0; l < componentSizes.length; l++) {
    if (componentSizes[l] > largestSize) {
      largestSize = componentSizes[l];
      largestLabel = l;
    }
  }

  // Zero out non-largest components
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    data[i] = labels[i] === largestLabel ? grid.data[i] : isoLevel - 1;
  }

  return { data, resolution: res };
}
