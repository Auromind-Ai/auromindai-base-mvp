"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Scene({ isActiveRef }) {
  const pointsRef = useRef();

  const smoothMouse = useRef({ x: 0, y: 0 });

  const isActive = useRef(false);
  
  const COUNT = 1500;

  const particlesData = useMemo(() => {
    const count = 1500;

    const positions = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);

    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = Math.random() * 20 - 10;
      const y = Math.random() * 8 - 4;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = 0;

      // ADD COLOR LOGIC HERE
      colors[i * 3] = Math.random();      // R
      colors[i * 3 + 1] = Math.random();  // G
      colors[i * 3 + 2] = 1;              // B bias (neon feel)
    }

    // IMPORTANT: return colors also
    return { positions, basePositions, colors };

  }, []);

  useFrame((state) => {
  if (!pointsRef.current) return;

  const mouse = state.mouse;

  const isActive = isActiveRef?.current ?? false;

  // smooth mouse
  if (isActive) {
    smoothMouse.current.x += (mouse.x - smoothMouse.current.x) * 0.08;
    smoothMouse.current.y += (mouse.y - smoothMouse.current.y) * 0.08;
  } else {
    // RESET properly (THIS FIXES ALL SIDES)
    smoothMouse.current.x += (0 - smoothMouse.current.x) * 0.1;
    smoothMouse.current.y += (0 - smoothMouse.current.y) * 0.1;
  }

  const positions = pointsRef.current.geometry.attributes.position.array;
  const base = particlesData.basePositions;

  const mouseX = smoothMouse.current.x * 5;
  const mouseY = smoothMouse.current.y * 3;

  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i];
    let y = positions[i + 1];

    const baseX = base[i];
    const baseY = base[i + 1];

    const dx = mouseX - x;
    const dy = mouseY - y;

    const distSq = dx * dx + dy * dy;

    const influence = isActive
      ? Math.exp(-distSq * 0.3)
      : 0;

    x -= dx * influence * 0.15;
    y -= dy * influence * 0.15;

    // STRONG RETURN (important)
    x += (baseX - x) * 0.12;
    y += (baseY - y) * 0.12;

    positions[i] = x;
    positions[i + 1] = y;
  }

  pointsRef.current.geometry.attributes.position.needsUpdate = true;
});

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesData.positions.length / 3}
          array={particlesData.positions}
          itemSize={3}
        />

        {/* ADD THIS BLOCK */}
        <bufferAttribute
          attach="attributes-color"
          count={particlesData.colors.length / 3}
          array={particlesData.colors}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}