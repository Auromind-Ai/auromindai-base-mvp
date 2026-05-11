"use client";

import { Canvas } from "@react-three/fiber";

export default function R3FCanvasWrapper({ children }) {
  return (
    <Canvas
      style={{ background: "#ffffff" }}
      camera={{ position: [0, 0, 5], fov: 75 }}
    >
      {children}
    </Canvas>
  );
}