"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function InteractiveBox({ mouse }) {
  const meshRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return; 

    meshRef.current.rotation.x = mouse?.y || 0;
    meshRef.current.rotation.y = mouse?.x || 0;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}