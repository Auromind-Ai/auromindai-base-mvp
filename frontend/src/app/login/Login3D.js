'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Environment, Float, Stars } from '@react-three/drei';

function AnimatedSphere() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
        meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
      <Sphere args={[1, 100, 100]} ref={meshRef} scale={1.6}>
        <MeshDistortMaterial
          color="#6366F1"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.9}
        />
      </Sphere>
      {/* Additional smaller spheres to create a constellation effect */}
      <Sphere args={[0.2, 32, 32]} position={[2, 2, -1]}>
        <meshStandardMaterial color="#A855F7" roughness={0.1} metalness={0.8} />
      </Sphere>
      <Sphere args={[0.15, 32, 32]} position={[-2, -1.5, 1]}>
        <meshStandardMaterial color="#EC4899" roughness={0.2} metalness={0.7} />
      </Sphere>
    </Float>
  );
}

export default function Login3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#A855F7" />
      <directionalLight position={[-10, -10, -5]} intensity={1} color="#6366F1" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#EC4899" />
     
      <AnimatedSphere />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
