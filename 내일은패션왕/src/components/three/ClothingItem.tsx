"use client";

import { useGLTF } from "@react-three/drei";
import {
  ClothingCategory,
  MannequinMeasurements,
  Outfit,
} from "@/types";
import { useMemo } from "react";
import {
  Box3,
  DoubleSide,
  Material,
  MeshStandardMaterial,
  Mesh,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from "three";

function neutralizeSkinning(root: Object3D): number {
  const skinned: SkinnedMesh[] = [];
  root.traverse((obj) => {
    if ((obj as SkinnedMesh).isSkinnedMesh) {
      skinned.push(obj as SkinnedMesh);
    }
  });
  for (const sm of skinned) {
    const material = Array.isArray(sm.material)
      ? sm.material[0]
      : sm.material;
    const mesh = new Mesh(sm.geometry, material as Material);
    mesh.name = sm.name;
    mesh.position.copy(sm.position);
    mesh.quaternion.copy(sm.quaternion);
    mesh.scale.copy(sm.scale);
    mesh.castShadow = sm.castShadow;
    mesh.receiveShadow = sm.receiveShadow;
    const parent = sm.parent;
    if (parent) {
      parent.add(mesh);
      parent.remove(sm);
    }
  }
  return skinned.length;
}

const NON_CLOTHING_TOKENS = new Set([
  "hanger",
  "stand",
  "display",
  "mannequin",
  "rack",
  "pole",
  "tag",
  "label",
  "shelf",
  "frame",
  "base",
  "platform",
]);

function isNonClothingMesh(name: string): boolean {
  const tokens = name.toLowerCase().split(/[_\-\s.]+/).filter(Boolean);
  return tokens.some((token) => NON_CLOTHING_TOKENS.has(token));
}

function removeNonClothingParts(root: Object3D, outfitId: string): number {
  const toRemove: Object3D[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    if (isNonClothingMesh(mesh.name || "")) {
      toRemove.push(mesh);
    }
  });
  toRemove.forEach((m) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[removed] ${outfitId}: non-clothing mesh "${m.name}" removed`,
      );
    }
    m.parent?.remove(m);
  });
  return toRemove.length;
}

function forceDoubleSide(root: Object3D, outfitId: string) {
  let meshCount = 0;
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    meshCount++;

    if (mesh.geometry) {
      mesh.geometry.computeVertexNormals();
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => {
        const clone = (m as MeshStandardMaterial).clone();
        clone.side = DoubleSide;
        clone.transparent = false;
        clone.opacity = 1;
        clone.needsUpdate = true;
        return clone;
      });
    } else {
      const clone = (mesh.material as MeshStandardMaterial).clone();
      clone.side = DoubleSide;
      clone.transparent = false;
      clone.opacity = 1;
      clone.needsUpdate = true;
      mesh.material = clone;
    }

    if (process.env.NODE_ENV === "development") {
      const mat = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as MeshStandardMaterial;
      console.log(
        `[mesh] ${outfitId} > ${mesh.name || "(unnamed)"}: ` +
          `verts=${mesh.geometry?.attributes.position?.count ?? 0}, ` +
          `visible=${mesh.visible}, ` +
          `frustumCulled=${mesh.frustumCulled}, ` +
          `matColor=#${mat.color?.getHexString() ?? "?"}, ` +
          `opacity=${mat.opacity}, ` +
          `transparent=${mat.transparent}`,
      );
    }
  });
  return meshCount;
}

type Props = {
  outfit: Outfit;
  attached?: boolean;
  skeleton?: Skeleton | null;
  measurements?: MannequinMeasurements | null;
};

const TARGET_SIZE: Record<ClothingCategory, number> = {
  top: 55,
  bottom: 110,
  dress: 95,
  shoes: 28,
  accessory: 26,
};

type AnchorType = "top" | "center" | "bottom";

const ANCHOR_TYPE: Record<ClothingCategory, AnchorType> = {
  top: "top",
  bottom: "top",
  dress: "top",
  shoes: "center",
  accessory: "bottom",
};

const BONE_ANCHOR_OFFSET: Record<ClothingCategory, [number, number, number]> = {
  top: [0, 18, 0],
  bottom: [0, 2, 0],
  dress: [0, 22, 0],
  shoes: [0, 0, 8],
  accessory: [0, 14, 0],
};

function computeFitScale(
  category: ClothingCategory,
  clothingSize: Vector3,
  m: MannequinMeasurements,
): [number, number, number] {
  const safe = (v: number) => Math.max(v, 0.0001);
  const BODY_DEPTH = m.shoulderWidth * 0.6;
  const SURFACE_OFFSET = 1.18;
  switch (category) {
    case "top": {
      const sx = (m.shoulderWidth * SURFACE_OFFSET) / safe(clothingSize.x);
      const sy = (m.torsoHeight * 0.7) / safe(clothingSize.y);
      const sz = (BODY_DEPTH * SURFACE_OFFSET) / safe(clothingSize.z);
      return [sx, sy, sz];
    }
    case "bottom": {
      const sx = (m.shoulderWidth * SURFACE_OFFSET) / safe(clothingSize.x);
      const sy = m.legLength / safe(clothingSize.y);
      const sz = (BODY_DEPTH * SURFACE_OFFSET) / safe(clothingSize.z);
      return [sx, sy, sz];
    }
    case "dress": {
      const sx = (m.shoulderWidth * SURFACE_OFFSET) / safe(clothingSize.x);
      const sy =
        (m.torsoHeight + m.legLength * 0.55) / safe(clothingSize.y);
      const sz = (BODY_DEPTH * SURFACE_OFFSET) / safe(clothingSize.z);
      return [sx, sy, sz];
    }
    case "shoes": {
      const s =
        (m.footSize * 1.2) / safe(Math.max(clothingSize.x, clothingSize.z));
      return [s, s, s];
    }
    case "accessory": {
      const s =
        (m.headSize * 1.15) / safe(Math.max(clothingSize.x, clothingSize.z));
      return [s, s, s];
    }
    default:
      return [1, 1, 1];
  }
}

export default function ClothingItem({
  outfit,
  attached = false,
  skeleton,
  measurements,
}: Props) {
  if (outfit.modelPath && outfit.modelPath.length > 0) {
    return (
      <ClothingGLB
        outfit={outfit}
        attached={attached}
        skeleton={skeleton}
        measurements={measurements}
      />
    );
  }
  return <ClothingPrimitive outfit={outfit} attached={attached} />;
}

function ClothingGLB({
  outfit,
  attached,
  measurements,
}: {
  outfit: Outfit;
  attached: boolean;
  skeleton?: Skeleton | null;
  measurements?: MannequinMeasurements | null;
}) {
  const { scene } = useGLTF(outfit.modelPath);

  const { object, computedScale, anchorOffset } = useMemo(() => {
    const c = scene.clone(true);
    c.position.set(0, 0, 0);
    c.quaternion.identity();
    c.scale.set(1, 1, 1);

    const neutralized = neutralizeSkinning(c);
    removeNonClothingParts(c, outfit.id);
    forceDoubleSide(c, outfit.id);

    c.updateMatrixWorld(true);

    const box = new Box3().setFromObject(c);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    if (process.env.NODE_ENV === "development" && neutralized > 0) {
      console.log(
        `[ClothingItem] ${outfit.id}: neutralized ${neutralized} SkinnedMesh → Mesh`,
      );
    }

    let scale: [number, number, number];
    if (measurements) {
      scale = computeFitScale(outfit.category, size, measurements);
    } else {
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = TARGET_SIZE[outfit.category] / maxDim;
      scale = [s, s, s];
    }

    const anchorType = ANCHOR_TYPE[outfit.category];
    const anchorY =
      anchorType === "top"
        ? box.max.y
        : anchorType === "bottom"
          ? box.min.y
          : center.y;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[ClothingItem] ${outfit.id}: ` +
          `size=(${size.x.toFixed(2)},${size.y.toFixed(2)},${size.z.toFixed(2)}) ` +
          `boxMin=(${box.min.x.toFixed(2)},${box.min.y.toFixed(2)},${box.min.z.toFixed(2)}) ` +
          `boxMax=(${box.max.x.toFixed(2)},${box.max.y.toFixed(2)},${box.max.z.toFixed(2)}) ` +
          `fitScale=(${scale[0].toFixed(4)},${scale[1].toFixed(4)},${scale[2].toFixed(4)}) ` +
          `anchorY=${anchorY.toFixed(2)}`,
      );
    }

    return {
      object: c,
      computedScale: scale,
      anchorOffset: new Vector3(
        -center.x * scale[0],
        -anchorY * scale[1],
        -center.z * scale[2],
      ),
    };
  }, [scene, outfit.category, measurements]);

  if (!attached) {
    return <primitive object={object} />;
  }

  const tx = outfit.attachedTransform;
  const boneOffset = BONE_ANCHOR_OFFSET[outfit.category];

  const finalPosition: [number, number, number] = tx?.position ?? [
    anchorOffset.x + boneOffset[0],
    anchorOffset.y + boneOffset[1],
    anchorOffset.z + boneOffset[2],
  ];

  const finalScale: [number, number, number] = tx?.scale
    ? typeof tx.scale === "number"
      ? [tx.scale, tx.scale, tx.scale]
      : tx.scale
    : computedScale;

  return (
    <group
      position={finalPosition}
      rotation={tx?.rotation ?? [0, 0, 0]}
      scale={finalScale}
    >
      <primitive object={object} />
    </group>
  );
}

function ClothingPrimitive({
  outfit,
  attached,
}: {
  outfit: Outfit;
  attached: boolean;
}) {
  const color = outfit.color ?? "#ff3366";

  switch (outfit.category) {
    case "top":
      return attached ? (
        <mesh castShadow position={[0, 2, 0]} scale={[40, 38, 24]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, 1.3, 0]}>
          <boxGeometry args={[0.52, 0.7, 0.34]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      );

    case "bottom":
      return attached ? (
        <group>
          <mesh castShadow position={[-7, -50, 0]} scale={[14, 100, 16]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[7, -50, 0]} scale={[14, 100, 16]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh castShadow position={[-0.12, 0.55, 0]}>
            <boxGeometry args={[0.22, 0.85, 0.26]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0.12, 0.55, 0]}>
            <boxGeometry args={[0.22, 0.85, 0.26]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      );

    case "dress":
      return attached ? (
        <mesh castShadow position={[0, -25, 0]} scale={[28, 95, 20]}>
          <coneGeometry args={[1, 1, 16, 1, true]} />
          <meshStandardMaterial color={color} roughness={0.5} side={2} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, 1.05, 0]}>
          <coneGeometry args={[0.45, 1.2, 16, 1, true]} />
          <meshStandardMaterial color={color} roughness={0.5} side={2} />
        </mesh>
      );

    case "shoes":
      return attached ? (
        <mesh castShadow position={[0, 2, 8]} scale={[14, 8, 24]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      ) : (
        <group>
          <mesh castShadow position={[-0.12, 0.04, 0.06]}>
            <boxGeometry args={[0.14, 0.08, 0.28]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0.12, 0.04, 0.06]}>
            <boxGeometry args={[0.14, 0.08, 0.28]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
        </group>
      );

    case "accessory":
      return attached ? (
        <mesh castShadow position={[0, 14, 0]} scale={[16, 6, 16]}>
          <torusGeometry args={[1, 0.3, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
        </mesh>
      ) : (
        <mesh castShadow position={[0, 1.78, 0]}>
          <torusGeometry args={[0.16, 0.05, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
        </mesh>
      );

    default:
      return null;
  }
}
