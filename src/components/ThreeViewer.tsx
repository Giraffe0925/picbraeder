'use client';

/**
 * ThreeViewer — Interactive 3D viewer with OrbitControls.
 * Accepts a pre-computed BufferGeometry and renders it with nice lighting.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Stage } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeViewerProps {
  geometry: THREE.BufferGeometry;
}

function Mesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#e0e0e0"
        metalness={0.1}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function ThreeViewer({ geometry }: ThreeViewerProps) {
  return (
    <Canvas
      camera={{ position: [2.5, 2, 2.5], fov: 40, near: 0.01, far: 100 }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#111']} />
      <Stage intensity={0.6} environment="city" adjustCamera={false}>
        <Center>
          <Mesh geometry={geometry} />
        </Center>
      </Stage>
      <OrbitControls enablePan={false} minDistance={1} maxDistance={6} />
    </Canvas>
  );
}
