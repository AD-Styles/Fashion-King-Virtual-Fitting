"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Group,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from "three";
import { useAppStore } from "@/lib/store";
import { DEFAULT_BODY_SHAPE, MannequinMeasurements } from "@/types";
import ClothingLayer from "./ClothingLayer";

const MANNEQUIN_URL = "https://threejs.org/examples/models/gltf/Xbot.glb";
useGLTF.preload(MANNEQUIN_URL);

export type MannequinBones = {
  spine: Object3D | null;
  hips: Object3D | null;
  head: Object3D | null;
  leftFoot: Object3D | null;
  rightFoot: Object3D | null;
  leftShoulder: Object3D | null;
  rightShoulder: Object3D | null;
};

function pickBone(
  root: Object3D,
  predicates: ((name: string) => boolean)[],
): Object3D | null {
  for (const predicate of predicates) {
    let match: Object3D | null = null;
    root.traverse((obj) => {
      if (match) return;
      if (predicate(obj.name)) match = obj;
    });
    if (match) return match;
  }
  return null;
}

const lc = (s: string) => s.toLowerCase();

export default function MannequinGLB() {
  const body = useAppStore((s) => s.bodyShape);
  const groupRef = useRef<Group>(null!);

  const { scene } = useGLTF(MANNEQUIN_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  const skeleton = useMemo<Skeleton | null>(() => {
    let found: Skeleton | null = null;
    cloned.traverse((obj) => {
      if (found) return;
      const sm = obj as SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton) found = sm.skeleton;
    });
    return found;
  }, [cloned]);

  const bones = useMemo<MannequinBones>(() => {
    return {
      spine: pickBone(cloned, [
        (n) => lc(n) === "spine1",
        (n) => lc(n) === "mixamorigspine1",
        (n) => lc(n) === "spine",
        (n) => lc(n) === "mixamorigspine",
        (n) => lc(n).endsWith("spine"),
      ]),
      hips: pickBone(cloned, [
        (n) => lc(n) === "hips",
        (n) => lc(n) === "mixamorighips",
        (n) => lc(n).endsWith("hips"),
      ]),
      head: pickBone(cloned, [
        (n) => lc(n) === "head",
        (n) => lc(n) === "mixamorighead",
        (n) => lc(n).endsWith("head"),
      ]),
      leftFoot: pickBone(cloned, [
        (n) => lc(n) === "leftfoot",
        (n) => lc(n) === "mixamorigleftfoot",
        (n) => lc(n).endsWith("leftfoot"),
      ]),
      rightFoot: pickBone(cloned, [
        (n) => lc(n) === "rightfoot",
        (n) => lc(n) === "mixamorigrightfoot",
        (n) => lc(n).endsWith("rightfoot"),
      ]),
      leftShoulder: pickBone(cloned, [
        (n) => lc(n) === "mixamorigleftarm",
        (n) => lc(n) === "leftarm",
        (n) => lc(n).endsWith("leftarm"),
        (n) => lc(n) === "mixamorigleftshoulder",
        (n) => lc(n) === "leftshoulder",
        (n) => lc(n).endsWith("leftshoulder"),
      ]),
      rightShoulder: pickBone(cloned, [
        (n) => lc(n) === "mixamorigrightarm",
        (n) => lc(n) === "rightarm",
        (n) => lc(n).endsWith("rightarm"),
        (n) => lc(n) === "mixamorigrightshoulder",
        (n) => lc(n) === "rightshoulder",
        (n) => lc(n).endsWith("rightshoulder"),
      ]),
    };
  }, [cloned]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const names: string[] = [];
      cloned.traverse((o) => names.push(o.name));
      const matched = Object.fromEntries(
        Object.entries(bones).map(([k, v]) => [k, v?.name ?? "(없음)"]),
      );
      console.log("[MannequinGLB] bone match:", matched);
      console.log("[MannequinGLB] all node names:", names.filter((n) => n.length > 0));
    }
  }, [cloned, bones]);

  useEffect(() => {
    cloned.traverse((obj) => {
      if ((obj as SkinnedMesh).isSkinnedMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [cloned]);

  const groupScale: [number, number, number] = [1, 1, 1];

  const [measurements, setMeasurements] = useState<MannequinMeasurements | null>(
    null,
  );

  useEffect(() => {
    if (!groupRef.current) return;
    if (!bones.spine || !bones.hips || !bones.leftFoot || !bones.head) return;

    groupRef.current.updateMatrixWorld(true);

    const get = (obj: Object3D) => obj.getWorldPosition(new Vector3());
    const spineW = get(bones.spine);
    const hipsW = get(bones.hips);
    const leftFootW = get(bones.leftFoot);
    const headW = get(bones.head);

    let shoulderWidth = spineW.distanceTo(hipsW) * 1.4;
    if (bones.leftShoulder && bones.rightShoulder) {
      const l = get(bones.leftShoulder);
      const r = get(bones.rightShoulder);
      shoulderWidth = l.distanceTo(r);
    }

    const torsoHeight = spineW.distanceTo(hipsW) * 2;
    const legLength = hipsW.distanceTo(leftFootW);
    const headSize = headW.distanceTo(spineW) * 0.55;
    const footSize = legLength * 0.18;

    const boneWorldScale = new Vector3();
    bones.spine.getWorldScale(boneWorldScale);
    const boneScale = boneWorldScale.x || 1;
    const normalize = (v: number) => v / boneScale;

    const next: MannequinMeasurements = {
      shoulderWidth: normalize(shoulderWidth),
      torsoHeight: normalize(torsoHeight),
      legLength: normalize(legLength),
      headSize: normalize(headSize),
      footSize: normalize(footSize),
    };

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[MannequinGLB] FIXED measurements (boneScale=${boneScale.toFixed(4)}): ` +
          `shoulderWidth=${next.shoulderWidth.toFixed(3)} ` +
          `torsoHeight=${next.torsoHeight.toFixed(3)} ` +
          `legLength=${next.legLength.toFixed(3)} ` +
          `headSize=${next.headSize.toFixed(3)} ` +
          `footSize=${next.footSize.toFixed(3)}`,
      );
    }

    setMeasurements(next);
  }, [bones]);

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={groupScale}>
      <primitive object={cloned} />
      <ClothingLayer
        bones={bones}
        skeleton={skeleton}
        measurements={measurements}
      />
    </group>
  );
}
