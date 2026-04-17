"use client";

import { Float } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

export default function FloatingBox() {
  return (
    <RigidBody>
      <Float speed={2} rotationIntensity={2} floatIntensity={2}>
        <mesh position={[2, 1, 0]}>
          <boxGeometry />
          <meshStandardMaterial color="purple" />
        </mesh>
      </Float>
    </RigidBody>
  );
}