"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";

function Brain() {
  const ref = useRef();

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.01;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#4cc9f0" wireframe />
    </mesh>
  );
}

export default function BrainCanvas({ progress }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      className="
        absolute pointer-events-none transition-opacity duration-300

        top-[48%] right-[40%]
        h-[340px] w-[340px]
        translate-x-1/2 -translate-y-1/2

        max-lg:top-[24%]
        max-lg:left-1/2
        max-lg:right-auto
        max-lg:h-[160px]
        max-lg:w-[160px]
        max-lg:-translate-x-1/2
        max-lg:-translate-y-1/2

        max-md:h-[110px]
        max-md:w-[110px]
        max-md:top-[22%]
      "
      style={{
        opacity: progress,
        WebkitMaskImage: "url('/mask.png')",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        WebkitMaskPosition: "center",
      }}
    >
      <ambientLight intensity={0.5} />
      <Brain />
    </Canvas>
  );
}