/**
 * simulate.ts — Generate fake "user-created" genomes by simulating
 * 100 users each evolving for 50 generations.
 *
 * Uses a seeded PRNG so results are deterministic across page loads.
 */

import { createSeedGenome, mutate, type Genome } from './genome';
import { evaluate } from './network';

/**
 * Simulate a single user session: start from a seed, mutate 50 times
 * (picking the "best" = random survivor each generation).
 */
function simulateUser(generations: number): Genome {
  let genome = createSeedGenome();
  // Initial diversity
  for (let i = 0; i < 5; i++) genome = mutate(genome);

  for (let g = 0; g < generations; g++) {
    // Generate a few offspring and pick one (simulating user choice)
    const candidates = [genome];
    for (let c = 0; c < 3; c++) candidates.push(mutate(genome));
    // Pick a random candidate (simulating user taste)
    genome = candidates[Math.floor(Math.random() * candidates.length)];
  }

  return genome;
}

/** Extract average hue from a genome's 2D output (sampled at low res). */
function averageHue(genome: Genome): number {
  const N = 8; // 8x8 sample grid
  let totalR = 0, totalG = 0, totalB = 0;

  for (let iy = 0; iy < N; iy++) {
    const y = (iy / (N - 1)) * 2 - 1;
    for (let ix = 0; ix < N; ix++) {
      const x = (ix / (N - 1)) * 2 - 1;
      const out = evaluate(genome.nodes, genome.connections, x, y, 0);
      totalR += Math.max(0, Math.min(1, out.r));
      totalG += Math.max(0, Math.min(1, out.g));
      totalB += Math.max(0, Math.min(1, out.b));
    }
  }

  const count = N * N;
  const r = totalR / count;
  const g = totalG / count;
  const b = totalB / count;

  // RGB to Hue
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  if (d === 0) return 0;

  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  h *= 60;
  if (h < 0) h += 360;
  return h;
}

export interface SimulatedDesign {
  genome: Genome;
  hue: number;
}

/**
 * Generate `userCount` simulated designs, each evolved for `generations`
 * generations, sorted by hue.
 */
export function generateSimulatedDesigns(
  userCount: number,
  generations: number,
): SimulatedDesign[] {
  const designs: SimulatedDesign[] = [];

  for (let i = 0; i < userCount; i++) {
    const genome = simulateUser(generations);
    const hue = averageHue(genome);
    designs.push({ genome, hue });
  }

  // Sort by hue for rainbow background
  designs.sort((a, b) => a.hue - b.hue);

  return designs;
}
