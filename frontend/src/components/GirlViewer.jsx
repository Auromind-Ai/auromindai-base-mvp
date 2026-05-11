'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useGLTF, OrbitControls } from '@react-three/drei';

function GirlModel() {
  const { scene } = useGLTF('/animations/3dGirl.glb');

  return <primitive object={scene} scale={1.5} />;
}

export default function GirlViewer() {
  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
        
        {/* Lights */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 2, 2]} />

        <Suspense fallback={null}>
          <GirlModel />
        </Suspense>

        <OrbitControls />
      </Canvas>
    </div>
  );
}