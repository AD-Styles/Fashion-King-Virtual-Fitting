"use client";

import { BODY_SHAPE_RANGES, BodyShape } from "@/types";
import { useAppStore } from "@/lib/store";

const LABELS: Record<keyof BodyShape, string> = {
  height: "키",
  weight: "몸무게",
  shoulder: "어깨너비",
  chest: "가슴둘레",
  waist: "허리둘레",
  hips: "엉덩이둘레",
  legLength: "다리길이",
};

export default function BodyShapePanel() {
  const { bodyShape, setBodyParam, resetBodyShape, autoRotate, toggleAutoRotate } = useAppStore();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">체형 조정</h2>
        <div className="flex flex-col gap-4">
          {(Object.keys(BODY_SHAPE_RANGES) as (keyof BodyShape)[]).map((key) => {
            const range = BODY_SHAPE_RANGES[key];
            const value = bodyShape[key];
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-foreground/70">
                  <span>{LABELS[key]}</span>
                  <span>
                    {range.unit ? `${value} ${range.unit}` : value.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={value}
                  onChange={(e) => setBodyParam(key, parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded bg-white/20 accent-accent"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <button
          onClick={resetBodyShape}
          className="rounded border border-white/20 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          기본값으로 리셋
        </button>
        <button
          onClick={toggleAutoRotate}
          className="rounded border border-white/20 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          {autoRotate ? "자동 회전 끄기" : "자동 회전 켜기 (360°)"}
        </button>
      </section>

      <section className="rounded border border-white/10 bg-white/5 p-3 text-xs text-foreground/60">
        <p className="mb-1 font-semibold text-foreground/80">다음 단계</p>
        <p>Phase 2 — 옷 입히기. 마네킹 .glb 모델로 교체 + 옷 메쉬 부착.</p>
      </section>
    </div>
  );
}
