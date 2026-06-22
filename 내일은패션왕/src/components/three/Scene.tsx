"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";
import Mannequin from "./Mannequin";
import MannequinGLB from "./MannequinGLB";
import ClothingLayer from "./ClothingLayer";
import Lighting from "./Lighting";
import { useAppStore } from "@/lib/store";

export default function Scene() {
  const autoRotate = useAppStore((s) => s.autoRotate);
  const mannequinMode = useAppStore((s) => s.mannequinMode);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.4, 3.2], fov: 35 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#0a0a0a"]} />
      <Lighting />
      <Suspense fallback={null}>
        {mannequinMode === "glb" ? (
          <MannequinGLB />
        ) : (
          <>
            <Mannequin />
            <ClothingLayer />
          </>
        )}
        <Environment preset="studio" />
      </Suspense>
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.5}
        scale={6}
        blur={2}
        far={2}
      />
      <OrbitControls
        target={[0, 0.9, 0]}
        enablePan={false}
        minDistance={1.5}
        maxDistance={6}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
      />
    </Canvas>
  );
}
