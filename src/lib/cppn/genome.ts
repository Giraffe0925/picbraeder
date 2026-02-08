/**
 * Genome — CPPN-NEAT genome with mutation and crossover operators.
 */

import { randomActivation, type ActivationType } from './activation';
import {
  type NodeGene,
  type ConnectionGene,
  INPUT_COUNT,
  OUTPUT_COUNT,
  FIXED_NODE_COUNT,
  INPUT_X,
  INPUT_Y,
  INPUT_Z,
  INPUT_D,
  INPUT_BIAS,
  OUTPUT_DENSITY,
  OUTPUT_R,
  OUTPUT_G,
  OUTPUT_B,
} from './network';

import { type BehaviorDescriptor } from './behaviorExtractor';

// ── Genome type ───────────────────────────────────────────────────

export interface Genome {
  id: string;
  nodes: NodeGene[];
  connections: ConnectionGene[];
  fitness: number;
  /** Novelty Search のスパースネススコア */
  novelty?: number;
  /** キャッシュされた行動記述子 */
  behaviorDescriptor?: BehaviorDescriptor;
}

// ── Mutation probabilities ────────────────────────────────────────

const PROB_ADD_NODE = 0.03;
const PROB_ADD_CONN = 0.05;
const PROB_MUTATE_WEIGHT = 0.80;
const PROB_PERTURB = 0.90;
const WEIGHT_STEP = 0.5;
const PROB_MUTATE_ACTIVATION = 0.05;
const PROB_TOGGLE_CONN = 0.02;

// ── Global innovation counter ─────────────────────────────────────

let nextInnovation = 0;

export function resetInnovation(value = 0): void {
  nextInnovation = value;
}

function getNextInnovation(): number {
  return nextInnovation++;
}

// ── Helpers ───────────────────────────────────────────────────────

let nextNodeId = FIXED_NODE_COUNT;

export function resetNodeIdCounter(value = FIXED_NODE_COUNT): void {
  nextNodeId = value;
}

function getNextNodeId(): number {
  return nextNodeId++;
}

function randomWeight(): number {
  return (Math.random() * 2 - 1) * 2; // [-2, 2]
}

function randomGaussian(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function cloneGenome(g: Genome): Genome {
  return {
    id: generateId(),
    fitness: 0,
    nodes: g.nodes.map(n => ({ ...n })),
    connections: g.connections.map(c => ({ ...c })),
  };
}

// ── Seed genome ───────────────────────────────────────────────────

/**
 * Create a rich seed genome with hidden nodes that encourage
 * organic, symmetric, design-worthy 3D shapes.
 *
 * Hidden nodes:
 *   9  — gaussian(d)  → radial blob shapes
 *  10  — sin(x)       → wave / ripple along X
 *  11  — cos(z)       → wave along Z (creates grid-like patterns)
 *  12  — abs(y)       → bilateral symmetry on Y
 */
export function createSeedGenome(): Genome {
  const nodes: NodeGene[] = [];

  // Input nodes
  for (let i = 0; i < INPUT_COUNT; i++) {
    nodes.push({ id: i, type: 'input', activation: 'linear', bias: 0 });
  }

  // Output nodes — density uses gaussian for rounded surfaces
  const outputIds = [OUTPUT_DENSITY, OUTPUT_R, OUTPUT_G, OUTPUT_B];
  const outputActs: ActivationType[] = ['linear', 'sigmoid', 'sigmoid', 'sigmoid'];
  for (let i = 0; i < OUTPUT_COUNT; i++) {
    nodes.push({ id: outputIds[i], type: 'output', activation: outputActs[i], bias: 0 });
  }

  // Hidden nodes for richer patterns
  const hidden: NodeGene[] = [
    { id: 9, type: 'hidden', activation: 'gaussian', bias: 0 },
    { id: 10, type: 'hidden', activation: 'sin', bias: 0 },
    { id: 11, type: 'hidden', activation: 'cos', bias: 0 },
    { id: 12, type: 'hidden', activation: 'abs', bias: 0 },
  ];
  nodes.push(...hidden);

  // Ensure the node-id counter starts above our hidden IDs
  resetNodeIdCounter(13);

  const connections: ConnectionGene[] = [];
  const conn = (inId: number, outId: number, w: number) => {
    connections.push({
      inNodeId: inId,
      outNodeId: outId,
      weight: w,
      enabled: true,
      innovationId: getNextInnovation(),
    });
  };

  // distance → gaussian hidden → radial blob
  conn(INPUT_D, 9, randomWeight());
  conn(INPUT_BIAS, 9, randomWeight() * 0.5);

  // x → sin hidden → wave pattern
  conn(INPUT_X, 10, 2.0 + Math.random() * 2);

  // z → cos hidden → cross-axis wave
  conn(INPUT_Z, 11, 2.0 + Math.random() * 2);

  // y → abs hidden → bilateral symmetry
  conn(INPUT_Y, 12, 1.5 + Math.random());

  // Hidden → colour outputs
  // Each colour channel gets a different mix of hidden nodes
  conn(9, OUTPUT_R, 1.0 + Math.random());
  conn(10, OUTPUT_R, randomWeight());
  conn(12, OUTPUT_R, randomWeight());

  conn(9, OUTPUT_G, randomWeight());
  conn(10, OUTPUT_G, 1.0 + Math.random());
  conn(11, OUTPUT_G, randomWeight());

  conn(9, OUTPUT_B, randomWeight());
  conn(11, OUTPUT_B, 1.0 + Math.random());
  conn(12, OUTPUT_B, randomWeight());

  // Direct input → colour for variety
  conn(INPUT_X, OUTPUT_R, randomWeight() * 0.5);
  conn(INPUT_Y, OUTPUT_G, randomWeight() * 0.5);
  conn(INPUT_D, OUTPUT_B, randomWeight() * 0.5);

  return { id: generateId(), nodes, connections, fitness: 0 };
}

// ── Mutation ──────────────────────────────────────────────────────

export function mutate(genome: Genome): Genome {
  const g = cloneGenome(genome);

  // --- Add Node ---
  if (Math.random() < PROB_ADD_NODE) {
    const enabled = g.connections.filter(c => c.enabled);
    if (enabled.length > 0) {
      const conn = enabled[Math.floor(Math.random() * enabled.length)];
      conn.enabled = false;

      const newNode: NodeGene = {
        id: getNextNodeId(),
        type: 'hidden',
        activation: randomActivation(),
        bias: 0,
      };

      g.nodes.push(newNode);
      g.connections.push({
        inNodeId: conn.inNodeId,
        outNodeId: newNode.id,
        weight: 1.0,
        enabled: true,
        innovationId: getNextInnovation(),
      });
      g.connections.push({
        inNodeId: newNode.id,
        outNodeId: conn.outNodeId,
        weight: conn.weight,
        enabled: true,
        innovationId: getNextInnovation(),
      });
    }
  }

  // --- Add Connection ---
  if (Math.random() < PROB_ADD_CONN) {
    // Pick two random nodes where a connection doesn't yet exist
    // Ensure no self-connections and input nodes can only be sources
    const nonInput = g.nodes.filter(n => n.type !== 'input');
    const allNodes = g.nodes;

    for (let attempt = 0; attempt < 20; attempt++) {
      const src = allNodes[Math.floor(Math.random() * allNodes.length)];
      const dst = nonInput[Math.floor(Math.random() * nonInput.length)];
      if (src.id === dst.id) continue;

      const exists = g.connections.some(
        c => c.inNodeId === src.id && c.outNodeId === dst.id,
      );
      if (exists) continue;

      g.connections.push({
        inNodeId: src.id,
        outNodeId: dst.id,
        weight: randomWeight(),
        enabled: true,
        innovationId: getNextInnovation(),
      });
      break;
    }
  }

  // --- Mutate Weights ---
  if (Math.random() < PROB_MUTATE_WEIGHT) {
    for (const c of g.connections) {
      if (Math.random() < PROB_PERTURB) {
        c.weight += randomGaussian() * WEIGHT_STEP;
      } else {
        c.weight = randomWeight();
      }
    }
  }

  // --- Mutate Activation ---
  if (Math.random() < PROB_MUTATE_ACTIVATION) {
    const hidden = g.nodes.filter(n => n.type === 'hidden');
    if (hidden.length > 0) {
      const node = hidden[Math.floor(Math.random() * hidden.length)];
      node.activation = randomActivation();
    }
  }

  // --- Toggle Connection ---
  if (Math.random() < PROB_TOGGLE_CONN) {
    if (g.connections.length > 0) {
      const c = g.connections[Math.floor(Math.random() * g.connections.length)];
      c.enabled = !c.enabled;
    }
  }

  return g;
}

// ── Crossover ─────────────────────────────────────────────────────

/**
 * NEAT-style crossover. `a` is assumed to be the fitter (or equal) parent.
 * Matching genes are inherited randomly; excess/disjoint from `a` only.
 */
export function crossover(a: Genome, b: Genome): Genome {
  const child: Genome = {
    id: generateId(),
    fitness: 0,
    nodes: [],
    connections: [],
  };

  // Build innovation-keyed maps
  const mapA = new Map<number, ConnectionGene>();
  const mapB = new Map<number, ConnectionGene>();
  for (const c of a.connections) mapA.set(c.innovationId, c);
  for (const c of b.connections) mapB.set(c.innovationId, c);

  // All innovation IDs from both parents
  const allInnovations = new Set([...mapA.keys(), ...mapB.keys()]);

  for (const innov of allInnovations) {
    const gA = mapA.get(innov);
    const gB = mapB.get(innov);

    if (gA && gB) {
      // Matching gene — pick randomly
      child.connections.push({ ...(Math.random() < 0.5 ? gA : gB) });
    } else if (gA) {
      // Excess/disjoint from fitter parent
      child.connections.push({ ...gA });
    }
    // Disjoint from weaker parent (gB only) — skip
  }

  // Collect all referenced node IDs
  const neededIds = new Set<number>();
  for (const c of child.connections) {
    neededIds.add(c.inNodeId);
    neededIds.add(c.outNodeId);
  }
  // Always include fixed I/O nodes
  for (let i = 0; i < FIXED_NODE_COUNT; i++) neededIds.add(i);

  // Build node map from both parents (prefer parent A)
  const nodeMapA = new Map<number, NodeGene>();
  const nodeMapB = new Map<number, NodeGene>();
  for (const n of a.nodes) nodeMapA.set(n.id, n);
  for (const n of b.nodes) nodeMapB.set(n.id, n);

  for (const id of neededIds) {
    const nA = nodeMapA.get(id);
    const nB = nodeMapB.get(id);
    if (nA && nB) {
      child.nodes.push({ ...(Math.random() < 0.5 ? nA : nB) });
    } else if (nA) {
      child.nodes.push({ ...nA });
    } else if (nB) {
      child.nodes.push({ ...nB });
    }
  }

  return child;
}

// ── Population helpers ────────────────────────────────────────────

/**
 * Create an initial population of `size` genomes by mutating a seed
 * several times to produce diversity.
 */
export function createInitialPopulation(size: number): Genome[] {
  const pop: Genome[] = [];
  for (let i = 0; i < size; i++) {
    let g = createSeedGenome();
    // Apply a few mutations for initial diversity
    for (let m = 0; m < 5; m++) {
      g = mutate(g);
    }
    pop.push(g);
  }
  return pop;
}

/**
 * Given one or more selected (parent) genomes, breed `count` offspring.
 * Strategy: if 1 parent, all children are mutations.
 * If 2+ parents, some children are crossovers followed by mutation.
 */
export function breedNextGeneration(parents: Genome[], count: number): Genome[] {
  const children: Genome[] = [];

  // Always keep one clone of the best parent (elitism)
  children.push(cloneGenome(parents[0]));

  while (children.length < count) {
    if (parents.length >= 2 && Math.random() < 0.4) {
      // Crossover
      const pA = parents[Math.floor(Math.random() * parents.length)];
      const pB = parents[Math.floor(Math.random() * parents.length)];
      children.push(mutate(crossover(pA, pB)));
    } else {
      // Mutation only
      const p = parents[Math.floor(Math.random() * parents.length)];
      children.push(mutate(p));
    }
  }

  return children.slice(0, count);
}
