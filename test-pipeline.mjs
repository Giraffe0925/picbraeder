// Quick test: verify the CPPN → voxelize → marching cubes pipeline
// Run: node test-pipeline.mjs

// Inline minimal versions of the pipeline for testing

// Activation functions
const sin = x => Math.sin(x);
const sigmoid = x => 1.0 / (1.0 + Math.exp(-x));
const activations = { sin, sigmoid, linear: x => x, cos: Math.cos, gaussian: x => Math.exp(-(x*x)), abs: Math.abs };

// Fixed node IDs
const INPUT_X=0, INPUT_Y=1, INPUT_Z=2, INPUT_D=3, INPUT_BIAS=4;
const OUTPUT_DENSITY=5;

// Create a simple seed genome
const nodes = [
  { id: 0, type: 'input', activation: 'linear', bias: 0 },
  { id: 1, type: 'input', activation: 'linear', bias: 0 },
  { id: 2, type: 'input', activation: 'linear', bias: 0 },
  { id: 3, type: 'input', activation: 'linear', bias: 0 },
  { id: 4, type: 'input', activation: 'linear', bias: 0 },
  { id: 5, type: 'output', activation: 'sin', bias: 0 },
];

const connections = [
  { inNodeId: 0, outNodeId: 5, weight: 3.0, enabled: true, innovationId: 0 },
  { inNodeId: 1, outNodeId: 5, weight: 2.5, enabled: true, innovationId: 1 },
  { inNodeId: 2, outNodeId: 5, weight: 2.0, enabled: true, innovationId: 2 },
  { inNodeId: 3, outNodeId: 5, weight: -1.5, enabled: true, innovationId: 3 },
  { inNodeId: 4, outNodeId: 5, weight: 0.5, enabled: true, innovationId: 4 },
];

// Evaluate CPPN
function evaluate(nodes, connections, x, y, z) {
  const d = Math.sqrt(x*x + y*y + z*z);
  const values = new Map();
  values.set(0, x); values.set(1, y); values.set(2, z); values.set(3, d); values.set(4, 1.0);

  // Only one output node to evaluate
  let sum = 0;
  for (const c of connections) {
    if (!c.enabled) continue;
    if (c.outNodeId === 5) {
      sum += (values.get(c.inNodeId) ?? 0) * c.weight;
    }
  }
  const node = nodes.find(n => n.id === 5);
  const density = activations[node.activation](sum + node.bias);
  return { density };
}

// Voxelize
const res = 30;
const data = new Float32Array(res * res * res);
const step = 2.0 / (res - 1);
let idx = 0;
let minD = Infinity, maxD = -Infinity;
let aboveZero = 0, belowZero = 0;

for (let iz = 0; iz < res; iz++) {
  const z = -1.0 + iz * step;
  for (let iy = 0; iy < res; iy++) {
    const y = -1.0 + iy * step;
    for (let ix = 0; ix < res; ix++) {
      const x = -1.0 + ix * step;
      const out = evaluate(nodes, connections, x, y, z);
      data[idx] = out.density;
      if (out.density < minD) minD = out.density;
      if (out.density > maxD) maxD = out.density;
      if (out.density >= 0) aboveZero++;
      else belowZero++;
      idx++;
    }
  }
}

console.log(`Density range: [${minD.toFixed(4)}, ${maxD.toFixed(4)}]`);
console.log(`Above zero (solid): ${aboveZero} / ${res*res*res} (${(100*aboveZero/(res*res*res)).toFixed(1)}%)`);
console.log(`Below zero (empty): ${belowZero} / ${res*res*res} (${(100*belowZero/(res*res*res)).toFixed(1)}%)`);

// Count iso-surface crossings at iso=0.0
let crossings = 0;
for (let iz = 0; iz < res-1; iz++) {
  for (let iy = 0; iy < res-1; iy++) {
    for (let ix = 0; ix < res-1; ix++) {
      const vals = [
        data[iz*res*res + iy*res + ix],
        data[iz*res*res + iy*res + ix+1],
        data[iz*res*res + (iy+1)*res + ix],
        data[iz*res*res + (iy+1)*res + ix+1],
        data[(iz+1)*res*res + iy*res + ix],
        data[(iz+1)*res*res + iy*res + ix+1],
        data[(iz+1)*res*res + (iy+1)*res + ix],
        data[(iz+1)*res*res + (iy+1)*res + ix+1],
      ];
      let cubeIndex = 0;
      for (let i = 0; i < 8; i++) {
        if (vals[i] >= 0.0) cubeIndex |= (1 << i);
      }
      if (cubeIndex !== 0 && cubeIndex !== 255) crossings++;
    }
  }
}

console.log(`Iso-surface crossings (cubes with mixed signs): ${crossings}`);
console.log(crossings > 0 ? '✓ Marching Cubes WILL produce geometry' : '✗ Marching Cubes will produce NOTHING');
