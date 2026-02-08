'use client';

/**
 * ThreeCanvas — Renders a single CPPN-generated 3D mesh using
 * React Three Fiber. Pipeline: voxelize → keepLargest → marchingCubes.
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Genome } from '@/lib/cppn/genome';
import { voxelize, keepLargestComponent } from '@/lib/mesher/voxelizer';
import { marchingCubes } from '@/lib/mesher/marchingCubes';

// ── Preview resolution ────────────────────────────────────────────

const PREVIEW_RES = 40;
const ISO_LEVEL = 0.3;

// ── Mesh sub-component ───────────────────────────────────────────

function RotatingMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#e0e0e0"
        metalness={0.1}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── ThreeCanvas ───────────────────────────────────────────────────

interface ThreeCanvasProps {
  genome: Genome;
  onClick?: () => void;
}

export default function ThreeCanvas({ genome, onClick }: ThreeCanvasProps) {
  const geometry = useMemo(() => {
    const grid = voxelize(genome.nodes, genome.connections, PREVIEW_RES);
    const connected = keepLargestComponent(grid, ISO_LEVEL);
    const geo = marchingCubes(connected, ISO_LEVEL);

    // Centre the geometry at the origin for consistent framing
    geo.computeBoundingBox();
    geo.center();

    // Smooth normals for a more polished look
    geo.computeVertexNormals();

    return geo;
  }, [genome]);

  return (
    <div
      onClick={onClick}
      style={{ width: '100%', height: '240px' }}
      className="cursor-pointer border border-neutral-800 hover:border-white transition-colors"
    >
      <Canvas
        camera={{ position: [2, 1.5, 2], fov: 45, near: 0.01, far: 100 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#111']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.0} />
        <directionalLight position={[-4, -2, -3]} intensity={0.3} />
        <pointLight position={[0, 5, 0]} intensity={0.4} />
        <RotatingMesh geometry={geometry} />
      </Canvas>
    </div>
  );
}
