"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { DEFAULT_BODY_SHAPE } from "@/types";

const REF_HEIGHT_CM = DEFAULT_BODY_SHAPE.height;

export default function Mannequin() {
  const body = useAppStore((s) => s.bodyShape);

  const scale = useMemo(() => {
    const heightScale = body.height / REF_HEIGHT_CM;
    const weightFactor = 1 + (body.weight - DEFAULT_BODY_SHAPE.weight) / 200;
    return { heightScale, weightFactor };
  }, [body.height, body.weight]);

  const dims = useMemo(() => {
    const h = scale.heightScale;
    const w = scale.weightFactor;
    return {
      headRadius: 0.11 * h,
      headY: 1.62 * h,
      neckHeight: 0.08 * h,
      neckY: 1.5 * h,
      torsoUpperWidth: 0.22 * h * body.shoulder * w,
      torsoUpperHeight: 0.28 * h,
      torsoUpperY: 1.28 * h,
      torsoLowerWidth: 0.18 * h * body.waist * w,
      torsoLowerHeight: 0.22 * h,
      torsoLowerY: 1.04 * h,
      hipWidth: 0.21 * h * body.hips * w,
      hipHeight: 0.12 * h,
      hipY: 0.88 * h,
      armRadius: 0.045 * h * w,
      armLength: 0.62 * h,
      armY: 1.2 * h,
      armX: 0.22 * h * body.shoulder,
      legRadius: 0.075 * h * w,
      legLength: 0.84 * h * body.legLength,
      legY: 0.42 * h * body.legLength,
      legX: 0.08 * h,
      chestScaleZ: body.chest,
    };
  }, [scale, body]);

  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow position={[0, dims.headY, 0]}>
        <sphereGeometry args={[dims.headRadius, 32, 32]} />
        <meshStandardMaterial color="#d4b896" roughness={0.7} />
      </mesh>

      <mesh castShadow position={[0, dims.neckY, 0]}>
        <cylinderGeometry args={[0.05, 0.06, dims.neckHeight, 16]} />
        <meshStandardMaterial color="#d4b896" roughness={0.7} />
      </mesh>

      <mesh
        castShadow
        position={[0, dims.torsoUpperY, 0]}
        scale={[1, 1, dims.chestScaleZ]}
      >
        <boxGeometry
          args={[dims.torsoUpperWidth, dims.torsoUpperHeight, 0.18]}
        />
        <meshStandardMaterial color="#e8d5b7" roughness={0.6} />
      </mesh>

      <mesh castShadow position={[0, dims.torsoLowerY, 0]}>
        <boxGeometry args={[dims.torsoLowerWidth, dims.torsoLowerHeight, 0.16]} />
        <meshStandardMaterial color="#e8d5b7" roughness={0.6} />
      </mesh>

      <mesh castShadow position={[0, dims.hipY, 0]}>
        <boxGeometry args={[dims.hipWidth, dims.hipHeight, 0.18]} />
        <meshStandardMaterial color="#e8d5b7" roughness={0.6} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`arm-${side}`}
          castShadow
          position={[side * dims.armX, dims.armY - dims.armLength / 2, 0]}
        >
          <cylinderGeometry
            args={[dims.armRadius * 0.85, dims.armRadius, dims.armLength, 16]}
          />
          <meshStandardMaterial color="#d4b896" roughness={0.7} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={`leg-${side}`}
          castShadow
          position={[side * dims.legX, dims.legY, 0]}
        >
          <cylinderGeometry
            args={[dims.legRadius * 0.8, dims.legRadius, dims.legLength, 16]}
          />
          <meshStandardMaterial color="#d4b896" roughness={0.7} />
        </mesh>
      ))}

      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}
