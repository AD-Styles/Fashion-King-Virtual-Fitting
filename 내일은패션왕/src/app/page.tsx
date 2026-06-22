"use client";

import dynamic from "next/dynamic";
import BodyShapePanel from "@/components/ui/BodyShapePanel";
import ClothingPicker from "@/components/ui/ClothingPicker";
import AiSynthesisMode from "@/components/ui/AiSynthesisMode";
import { useAppStore } from "@/lib/store";

const Scene = dynamic(() => import("@/components/three/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-foreground/60">
      마네킹 불러오는 중...
    </div>
  ),
});

export default function HomePage() {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const mannequinMode = useAppStore((s) => s.mannequinMode);
  const setMannequinMode = useAppStore((s) => s.setMannequinMode);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        {appMode === "3d" ? (
          <Scene />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/40">
            AI 합성 결과는 우측 패널에 표시됩니다
          </div>
        )}
      </div>

      <header className="absolute left-0 top-0 z-10 p-6">
        <h1 className="text-2xl font-bold tracking-tight">내일은패션왕</h1>
        <p className="text-sm text-foreground/60">
          {appMode === "3d"
            ? "3D 마네킹 + 옷 입히기 (360° 회전)"
            : "AI 합성 모드 (IDM-VTON, 정면 사실적)"}
        </p>

        <div className="mt-3 inline-flex rounded border border-accent/40 text-xs">
          <button
            onClick={() => setAppMode("3d")}
            className={`px-3 py-1 transition ${
              appMode === "3d"
                ? "bg-accent/20 text-foreground"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            3D 모드
          </button>
          <button
            onClick={() => setAppMode("ai")}
            className={`px-3 py-1 transition ${
              appMode === "ai"
                ? "bg-accent/20 text-foreground"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            AI 합성 모드
          </button>
        </div>

        {appMode === "3d" && (
          <div className="mt-3 inline-flex rounded border border-white/20 text-xs">
            <button
              onClick={() => setMannequinMode("primitive")}
              className={`px-3 py-1 transition ${
                mannequinMode === "primitive"
                  ? "bg-white/20 text-foreground"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              임시 마네킹
            </button>
            <button
              onClick={() => setMannequinMode("glb")}
              className={`px-3 py-1 transition ${
                mannequinMode === "glb"
                  ? "bg-white/20 text-foreground"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              실제 .glb 마네킹
            </button>
          </div>
        )}
      </header>

      <aside className="absolute right-0 top-0 z-10 h-full w-80 overflow-y-auto border-l border-white/10 bg-black/40 p-6 backdrop-blur-md">
        {appMode === "3d" ? (
          <>
            <BodyShapePanel />
            <div className="my-6 h-px bg-white/10" />
            <ClothingPicker />
          </>
        ) : (
          <AiSynthesisMode />
        )}
      </aside>
    </main>
  );
}
