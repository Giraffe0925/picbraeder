/**
 * CPPN Network — Feedforward evaluation of a CPPN genome.
 *
 * Input layer  (5 nodes): x, y, z, d (distance from centre), bias (1.0)
 * Output layer (4 nodes): Density, R, G, B
 *
 * The network is a DAG — no recurrent connections.
 */

import { activate, type ActivationType } from './activation';

// ── Type definitions ──────────────────────────────────────────────

export interface NodeGene {
  id: number;
  type: 'input' | 'hidden' | 'output';
  activation: ActivationType;
  bias: number;
}

export interface ConnectionGene {
  inNodeId: number;
  outNodeId: number;
  weight: number;
  enabled: boolean;
  innovationId: number;
}

// ── Constants ─────────────────────────────────────────────────────

/** Fixed input node IDs */
export const INPUT_X = 0;
export const INPUT_Y = 1;
export const INPUT_Z = 2;
export const INPUT_D = 3;
export const INPUT_BIAS = 4;

/** Fixed output node IDs */
export const OUTPUT_DENSITY = 5;
export const OUTPUT_R = 6;
export const OUTPUT_G = 7;
export const OUTPUT_B = 8;

export const INPUT_COUNT = 5;
export const OUTPUT_COUNT = 4;
export const FIXED_NODE_COUNT = INPUT_COUNT + OUTPUT_COUNT; // 9

// ── Network output ────────────────────────────────────────────────

export interface CPPNOutput {
  density: number;
  r: number;
  g: number;
  b: number;
}

// ── Topological sort ──────────────────────────────────────────────

/**
 * Returns node IDs in evaluation order (inputs excluded — they are set
 * directly). Uses Kahn's algorithm on the enabled connections.
 */
function topoSort(nodes: NodeGene[], connections: ConnectionGene[]): number[] {
  const inputIds = new Set(nodes.filter(n => n.type === 'input').map(n => n.id));
  const nodeIds = nodes.filter(n => n.type !== 'input').map(n => n.id);
  const inDegree = new Map<number, number>();
  const adj = new Map<number, number[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const c of connections) {
    if (!c.enabled) continue;
    if (!inDegree.has(c.outNodeId)) continue;
    // Skip edges from input nodes — their values are pre-set,
    // so they should not contribute to in-degree.
    if (inputIds.has(c.inNodeId)) continue;
    inDegree.set(c.outNodeId, (inDegree.get(c.outNodeId) ?? 0) + 1);
    if (!adj.has(c.inNodeId)) adj.set(c.inNodeId, []);
    adj.get(c.inNodeId)!.push(c.outNodeId);
  }

  const queue: number[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: number[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const neighbour of (adj.get(id) ?? [])) {
      if (!inDegree.has(neighbour)) continue;
      const newDeg = inDegree.get(neighbour)! - 1;
      inDegree.set(neighbour, newDeg);
      if (newDeg === 0) queue.push(neighbour);
    }
  }

  return sorted;
}

// ── Feedforward evaluation ────────────────────────────────────────

/**
 * Evaluate the CPPN for a single (x, y, z) coordinate.
 */
export function evaluate(
  nodes: NodeGene[],
  connections: ConnectionGene[],
  x: number,
  y: number,
  z: number,
): CPPNOutput {
  const d = Math.sqrt(x * x + y * y + z * z);

  // Initialise values — inputs are set directly
  const values = new Map<number, number>();
  values.set(INPUT_X, x);
  values.set(INPUT_Y, y);
  values.set(INPUT_Z, z);
  values.set(INPUT_D, d);
  values.set(INPUT_BIAS, 1.0);

  // Build a lookup for incoming connections per node
  const incoming = new Map<number, ConnectionGene[]>();
  for (const c of connections) {
    if (!c.enabled) continue;
    if (!incoming.has(c.outNodeId)) incoming.set(c.outNodeId, []);
    incoming.get(c.outNodeId)!.push(c);
  }

  // Build a node lookup
  const nodeMap = new Map<number, NodeGene>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Evaluate in topological order
  const order = topoSort(nodes, connections);
  for (const id of order) {
    const node = nodeMap.get(id)!;
    let sum = node.bias;
    for (const c of (incoming.get(id) ?? [])) {
      sum += (values.get(c.inNodeId) ?? 0) * c.weight;
    }
    values.set(id, activate(node.activation, sum));
  }

  return {
    density: values.get(OUTPUT_DENSITY) ?? 0,
    r: Math.max(0, Math.min(1, (values.get(OUTPUT_R) ?? 0))),
    g: Math.max(0, Math.min(1, (values.get(OUTPUT_G) ?? 0))),
    b: Math.max(0, Math.min(1, (values.get(OUTPUT_B) ?? 0))),
  };
}
