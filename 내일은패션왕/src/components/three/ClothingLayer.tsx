"use client";

import { Fragment } from "react";
import { createPortal } from "@react-three/fiber";
import { Skeleton } from "three";
import { useAppStore } from "@/lib/store";
import { ClothingCategory, MannequinMeasurements, Outfit } from "@/types";
import ClothingItem from "./ClothingItem";
import type { MannequinBones } from "./MannequinGLB";

type Props = {
  bones?: MannequinBones;
  skeleton?: Skeleton | null;
  measurements?: MannequinMeasurements | null;
};

const SINGLE_BONE_MAP: Partial<Record<ClothingCategory, keyof MannequinBones>> = {
  top: "spine",
  dress: "spine",
  bottom: "hips",
  accessory: "head",
};

const DUAL_BONE_MAP: Partial<Record<ClothingCategory, (keyof MannequinBones)[]>> = {
  shoes: ["leftFoot", "rightFoot"],
};

export default function ClothingLayer({ bones, skeleton, measurements }: Props) {
  const currentOutfits = useAppStore((s) => s.currentOutfits);
  const entries = Object.entries(currentOutfits) as [
    ClothingCategory,
    Outfit | undefined,
  ][];

  if (!bones) {
    return (
      <group name="clothing-layer">
        {entries.map(([, outfit]) =>
          outfit ? <ClothingItem key={outfit.id} outfit={outfit} /> : null,
        )}
      </group>
    );
  }

  return (
    <group name="clothing-layer-attached">
      {entries.map(([category, outfit]) => {
        if (!outfit) return null;

        const dualKeys = DUAL_BONE_MAP[category];
        if (dualKeys) {
          return (
            <Fragment key={outfit.id}>
              {dualKeys.map((key) => {
                const bone = bones[key];
                if (!bone) return null;
                return (
                  <Fragment key={`${outfit.id}-${key}`}>
                    {createPortal(
                      <ClothingItem
                        outfit={outfit}
                        attached
                        skeleton={skeleton}
                        measurements={measurements}
                      />,
                      bone,
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        }

        const singleKey = SINGLE_BONE_MAP[category];
        const bone = singleKey ? bones[singleKey] : null;
        if (!bone) {
          return <ClothingItem key={outfit.id} outfit={outfit} />;
        }
        return (
          <Fragment key={outfit.id}>
            {createPortal(
              <ClothingItem
                outfit={outfit}
                attached
                skeleton={skeleton}
                measurements={measurements}
              />,
              bone,
            )}
          </Fragment>
        );
      })}
    </group>
  );
}
