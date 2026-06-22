export type BodyShape = {
  height: number;
  weight: number;
  shoulder: number;
  chest: number;
  waist: number;
  hips: number;
  legLength: number;
};

export const DEFAULT_BODY_SHAPE: BodyShape = {
  height: 170,
  weight: 65,
  shoulder: 1.0,
  chest: 1.0,
  waist: 1.0,
  hips: 1.0,
  legLength: 1.0,
};

export const BODY_SHAPE_RANGES: Record<keyof BodyShape, { min: number; max: number; step: number; unit: string }> = {
  height: { min: 140, max: 200, step: 1, unit: "cm" },
  weight: { min: 40, max: 120, step: 1, unit: "kg" },
  shoulder: { min: 0.8, max: 1.3, step: 0.01, unit: "" },
  chest: { min: 0.8, max: 1.3, step: 0.01, unit: "" },
  waist: { min: 0.7, max: 1.4, step: 0.01, unit: "" },
  hips: { min: 0.8, max: 1.3, step: 0.01, unit: "" },
  legLength: { min: 0.85, max: 1.15, step: 0.01, unit: "" },
};

export type ClothingCategory = "top" | "bottom" | "dress" | "shoes" | "accessory";

export type Outfit = {
  id: string;
  name: string;
  category: ClothingCategory;
  modelPath: string;
  thumbnail?: string;
  color?: string;
  attachedTransform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number] | number;
  };
};

export type MannequinMode = "primitive" | "glb";

export type AppMode = "3d" | "ai";

export type AiSynthesisJob = {
  status: "idle" | "uploading" | "generating" | "done" | "error";
  personImageDataUrl: string | null;
  selectedOutfitId: string | null;
  prompt: string;
  resultImageUrl: string | null;
  error: string | null;
};

export type MannequinMeasurements = {
  shoulderWidth: number;
  torsoHeight: number;
  legLength: number;
  footSize: number;
  headSize: number;
};

export type PersonalColorSeason = "spring" | "summer" | "autumn" | "winter";

// 서버 /personal-color 응답과 동형. (ml/personal-color predict.analyze 와 같은 모양)
export type PersonalColorResult = {
  type: string;
  type_ko: string;
  season: PersonalColorSeason;
  season_ko: string;
  axes: { warmcool: number; value: number; clarity: number };
  palette: string[];
  confidence: number;
  face_detected: boolean;
};

export type PersonalColorJob = {
  status: "idle" | "analyzing" | "done" | "error";
  result: PersonalColorResult | null;
  error: string | null;
};
