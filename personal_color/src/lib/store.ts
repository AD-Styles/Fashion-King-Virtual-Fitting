import { create } from "zustand";
import {
  AiSynthesisJob,
  AppMode,
  BodyShape,
  DEFAULT_BODY_SHAPE,
  MannequinMode,
  Outfit,
  PersonalColorJob,
  PersonalColorResult,
} from "@/types";

const DEFAULT_AI_JOB: AiSynthesisJob = {
  status: "idle",
  personImageDataUrl: null,
  selectedOutfitId: null,
  prompt: "person wearing the garment, photorealistic, full body",
  resultImageUrl: null,
  error: null,
};

const DEFAULT_PERSONAL_COLOR: PersonalColorJob = {
  status: "idle",
  result: null,
  error: null,
};

type AppState = {
  bodyShape: BodyShape;
  setBodyParam: <K extends keyof BodyShape>(key: K, value: BodyShape[K]) => void;
  resetBodyShape: () => void;

  mannequinMode: MannequinMode;
  setMannequinMode: (mode: MannequinMode) => void;

  outfits: Outfit[];
  currentOutfits: Partial<Record<Outfit["category"], Outfit>>;
  registerOutfit: (outfit: Outfit) => void;
  setOutfit: (category: Outfit["category"], outfit: Outfit | null) => void;
  clearOutfits: () => void;

  autoRotate: boolean;
  toggleAutoRotate: () => void;

  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  aiJob: AiSynthesisJob;
  setAiPersonImage: (dataUrl: string | null) => void;
  setAiOutfit: (outfitId: string | null) => void;
  setAiPrompt: (prompt: string) => void;
  setAiStatus: (status: AiSynthesisJob["status"]) => void;
  setAiResult: (resultUrl: string | null) => void;
  setAiError: (error: string | null) => void;
  resetAiJob: () => void;

  personalColor: PersonalColorJob;
  setPersonalColorStatus: (status: PersonalColorJob["status"]) => void;
  setPersonalColorResult: (result: PersonalColorResult | null) => void;
  setPersonalColorError: (error: string | null) => void;
  resetPersonalColor: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  bodyShape: DEFAULT_BODY_SHAPE,
  setBodyParam: (key, value) =>
    set((state) => ({
      bodyShape: { ...state.bodyShape, [key]: value },
    })),
  resetBodyShape: () => set({ bodyShape: DEFAULT_BODY_SHAPE }),

  mannequinMode: "primitive",
  setMannequinMode: (mode) => set({ mannequinMode: mode }),

  outfits: [],
  currentOutfits: {},
  registerOutfit: (outfit) =>
    set((state) => {
      if (state.outfits.find((o) => o.id === outfit.id)) return state;
      return { outfits: [...state.outfits, outfit] };
    }),
  setOutfit: (category, outfit) =>
    set((state) => {
      const next = { ...state.currentOutfits };
      if (outfit) {
        if (category === "dress") {
          delete next.top;
          delete next.bottom;
        } else if (category === "top" || category === "bottom") {
          delete next.dress;
        }
        next[category] = outfit;
      } else {
        delete next[category];
      }
      return { currentOutfits: next };
    }),
  clearOutfits: () => set({ currentOutfits: {} }),

  autoRotate: false,
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),

  appMode: "3d",
  setAppMode: (mode) => set({ appMode: mode }),

  aiJob: DEFAULT_AI_JOB,
  setAiPersonImage: (dataUrl) =>
    set((state) => ({
      aiJob: { ...state.aiJob, personImageDataUrl: dataUrl },
    })),
  setAiOutfit: (outfitId) =>
    set((state) => ({ aiJob: { ...state.aiJob, selectedOutfitId: outfitId } })),
  setAiPrompt: (prompt) =>
    set((state) => ({ aiJob: { ...state.aiJob, prompt } })),
  setAiStatus: (status) =>
    set((state) => ({ aiJob: { ...state.aiJob, status } })),
  setAiResult: (resultUrl) =>
    set((state) => ({
      aiJob: {
        ...state.aiJob,
        resultImageUrl: resultUrl,
        status: resultUrl ? "done" : state.aiJob.status,
      },
    })),
  setAiError: (error) =>
    set((state) => ({
      aiJob: { ...state.aiJob, error, status: error ? "error" : state.aiJob.status },
    })),
  resetAiJob: () => set({ aiJob: DEFAULT_AI_JOB }),

  personalColor: DEFAULT_PERSONAL_COLOR,
  setPersonalColorStatus: (status) =>
    set((state) => ({ personalColor: { ...state.personalColor, status } })),
  setPersonalColorResult: (result) =>
    set((state) => ({
      personalColor: {
        ...state.personalColor,
        result,
        status: result ? "done" : state.personalColor.status,
        error: result ? null : state.personalColor.error,
      },
    })),
  setPersonalColorError: (error) =>
    set((state) => ({
      personalColor: {
        ...state.personalColor,
        error,
        status: error ? "error" : state.personalColor.status,
      },
    })),
  resetPersonalColor: () => set({ personalColor: DEFAULT_PERSONAL_COLOR }),
}));
