/**
 * Preset genomes — hand-crafted "community" designs that produce
 * visually interesting 2D patterns. Users can select these as parents.
 */

import type { Genome } from './genome';
import type { NodeGene, ConnectionGene } from './network';
import {
  INPUT_X, INPUT_Y, INPUT_Z, INPUT_D, INPUT_BIAS,
  OUTPUT_DENSITY, OUTPUT_R, OUTPUT_G, OUTPUT_B,
  INPUT_COUNT, OUTPUT_COUNT,
} from './network';
import type { ActivationType } from './activation';

function makeGenome(
  id: string,
  name: string,
  hiddenNodes: { id: number; activation: ActivationType; bias: number }[],
  conns: [number, number, number][], // [in, out, weight]
): Genome & { displayName: string } {
  const nodes: NodeGene[] = [];

  // Input nodes
  for (let i = 0; i < INPUT_COUNT; i++) {
    nodes.push({ id: i, type: 'input', activation: 'linear', bias: 0 });
  }

  // Output nodes
  const outputIds = [OUTPUT_DENSITY, OUTPUT_R, OUTPUT_G, OUTPUT_B];
  const outputActs: ActivationType[] = ['linear', 'sigmoid', 'sigmoid', 'sigmoid'];
  for (let i = 0; i < OUTPUT_COUNT; i++) {
    nodes.push({ id: outputIds[i], type: 'output', activation: outputActs[i], bias: 0 });
  }

  // Hidden nodes
  for (const h of hiddenNodes) {
    nodes.push({ id: h.id, type: 'hidden', activation: h.activation, bias: h.bias });
  }

  const connections: ConnectionGene[] = conns.map((c, i) => ({
    inNodeId: c[0],
    outNodeId: c[1],
    weight: c[2],
    enabled: true,
    innovationId: 1000 + i,
  }));

  return { id, displayName: name, nodes, connections, fitness: 0 };
}

export type PresetGenome = Genome & { displayName: string };

export const PRESETS: PresetGenome[] = [
  makeGenome('preset-nebula', 'Nebula', [
    { id: 9, activation: 'gaussian', bias: 0 },
    { id: 10, activation: 'sin', bias: 0 },
    { id: 11, activation: 'cos', bias: 0 },
  ], [
    [INPUT_D, 9, 3.0],
    [INPUT_X, 10, 4.0],
    [INPUT_Y, 11, 4.0],
    [9, OUTPUT_R, 2.0],
    [10, OUTPUT_R, -1.0],
    [9, OUTPUT_G, 0.5],
    [11, OUTPUT_G, 1.5],
    [10, OUTPUT_B, 1.8],
    [11, OUTPUT_B, -0.8],
    [INPUT_D, OUTPUT_R, -1.2],
  ]),

  makeGenome('preset-waves', 'Waves', [
    { id: 9, activation: 'sin', bias: 0 },
    { id: 10, activation: 'cos', bias: 0 },
    { id: 11, activation: 'gaussian', bias: 0 },
  ], [
    [INPUT_X, 9, 6.0],
    [INPUT_Y, 9, 3.0],
    [INPUT_Y, 10, 5.0],
    [INPUT_X, 10, -2.0],
    [INPUT_D, 11, 2.5],
    [9, OUTPUT_R, 1.5],
    [10, OUTPUT_G, 1.5],
    [9, OUTPUT_B, 0.8],
    [10, OUTPUT_B, 0.8],
    [11, OUTPUT_R, -0.6],
    [11, OUTPUT_G, 0.8],
  ]),

  makeGenome('preset-mandala', 'Mandala', [
    { id: 9, activation: 'sin', bias: 0 },
    { id: 10, activation: 'cos', bias: 0 },
    { id: 11, activation: 'abs', bias: 0 },
    { id: 12, activation: 'gaussian', bias: 0 },
  ], [
    [INPUT_X, 9, 5.0],
    [INPUT_Y, 9, 5.0],
    [INPUT_D, 10, 8.0],
    [INPUT_X, 11, 3.0],
    [INPUT_Y, 11, -3.0],
    [INPUT_D, 12, 2.0],
    [9, OUTPUT_R, 1.0],
    [10, OUTPUT_R, 0.6],
    [10, OUTPUT_G, 1.2],
    [11, OUTPUT_G, -0.5],
    [12, OUTPUT_B, 2.0],
    [9, OUTPUT_B, -0.7],
  ]),

  makeGenome('preset-crystal', 'Crystal', [
    { id: 9, activation: 'abs', bias: 0 },
    { id: 10, activation: 'sin', bias: 0 },
    { id: 11, activation: 'gaussian', bias: 0 },
  ], [
    [INPUT_X, 9, 2.0],
    [INPUT_Y, 9, -2.0],
    [INPUT_X, 10, 3.0],
    [INPUT_Y, 10, 3.0],
    [INPUT_D, 11, 1.5],
    [9, OUTPUT_R, 1.8],
    [10, OUTPUT_R, -0.5],
    [10, OUTPUT_G, 1.5],
    [9, OUTPUT_G, 0.3],
    [11, OUTPUT_B, 2.0],
    [INPUT_BIAS, OUTPUT_B, -0.5],
  ]),

  makeGenome('preset-flame', 'Flame', [
    { id: 9, activation: 'gaussian', bias: 0 },
    { id: 10, activation: 'sin', bias: 0 },
    { id: 11, activation: 'sigmoid', bias: 0 },
  ], [
    [INPUT_Y, 9, 2.0],
    [INPUT_X, 10, 7.0],
    [INPUT_Y, 10, 2.0],
    [INPUT_D, 11, -3.0],
    [9, OUTPUT_R, 2.5],
    [10, OUTPUT_R, 0.3],
    [11, OUTPUT_R, 1.0],
    [9, OUTPUT_G, 1.5],
    [10, OUTPUT_G, -0.5],
    [11, OUTPUT_B, 0.8],
    [INPUT_Y, OUTPUT_G, -0.8],
  ]),

  makeGenome('preset-cells', 'Cells', [
    { id: 9, activation: 'sin', bias: 0 },
    { id: 10, activation: 'sin', bias: 0 },
    { id: 11, activation: 'gaussian', bias: 0 },
  ], [
    [INPUT_X, 9, 8.0],
    [INPUT_Y, 10, 8.0],
    [INPUT_D, 11, 3.0],
    [9, OUTPUT_R, 1.0],
    [10, OUTPUT_R, 1.0],
    [9, OUTPUT_G, 0.5],
    [10, OUTPUT_G, -1.0],
    [11, OUTPUT_G, 1.5],
    [9, OUTPUT_B, -0.5],
    [10, OUTPUT_B, 0.5],
    [11, OUTPUT_B, 1.0],
  ]),
];
