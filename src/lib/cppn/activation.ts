/**
 * CPPN Activation Functions
 *
 * Each function maps R -> R and is used as a node activation
 * in the Compositional Pattern Producing Network.
 */

export type ActivationType = 'sigmoid' | 'sin' | 'cos' | 'gaussian' | 'linear' | 'abs';

const sigmoid = (x: number): number => 1.0 / (1.0 + Math.exp(-x));
const sin = (x: number): number => Math.sin(x);
const cos = (x: number): number => Math.cos(x);
const gaussian = (x: number): number => Math.exp(-(x * x));
const linear = (x: number): number => x;
const abs = (x: number): number => Math.abs(x);

const ACTIVATION_MAP: Record<ActivationType, (x: number) => number> = {
  sigmoid,
  sin,
  cos,
  gaussian,
  linear,
  abs,
};

export const ALL_ACTIVATIONS: ActivationType[] = Object.keys(ACTIVATION_MAP) as ActivationType[];

export function activate(type: ActivationType, x: number): number {
  return ACTIVATION_MAP[type](x);
}

export function randomActivation(): ActivationType {
  return ALL_ACTIVATIONS[Math.floor(Math.random() * ALL_ACTIVATIONS.length)];
}
