"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  harmonyLabel,
  OutfitMatch,
  rankOutfitsByPalette,
} from "@/lib/colorHarmony";
import { SAMPLE_OUTFITS } from "@/lib/sample-outfits";
import { ClothingCategory } from "@/types";

const CATEGORY_ORDER: ClothingCategory[] = [
  "top",
  "bottom",
  "dress",
  "shoes",
  "accessory",
];
const CATEGORY_KO: Record<ClothingCategory, string> = {
  top: "상의",
  bottom: "하의",
  dress: "원피스",
  shoes: "신발",
  accessory: "액세서리",
};

// 신뢰도 = tanh(min(|warmcool|, |value|)). 두 시즌 축(웜쿨·명도) 중 약한 쪽이
// 0 에 가까울수록(경계선) 낮아진다 → 어느 경계가 애매한지까지 같이 알려준다.
function confidenceInfo(
  confidence: number,
  axes: { warmcool: number; value: number },
) {
  const pct = Math.round(confidence * 100);
  if (confidence >= 0.5) {
    return { level: "high" as const, pct, tone: "text-green-400", boundary: "" };
  }
  const weakWarm = Math.abs(axes.warmcool) <= Math.abs(axes.value);
  const boundary = weakWarm ? "웜/쿨" : "라이트/딥";
  if (confidence >= 0.25) {
    return { level: "mid" as const, pct, tone: "text-yellow-400", boundary };
  }
  return { level: "low" as const, pct, tone: "text-orange-400", boundary };
}

const SEASON_ACCENT: Record<string, string> = {
  spring: "from-rose-300/30 to-amber-200/30 border-rose-300/40",
  summer: "from-sky-300/30 to-violet-300/30 border-sky-300/40",
  autumn: "from-amber-600/30 to-orange-800/30 border-amber-600/40",
  winter: "from-blue-500/30 to-fuchsia-500/30 border-blue-400/40",
};

const TONE_CLASS: Record<string, string> = {
  good: "text-green-400",
  ok: "text-yellow-400",
  bad: "text-foreground/40",
};

function AxisBar({
  label,
  neg,
  pos,
  value,
}: {
  label: string;
  neg: string;
  pos: string;
  value: number;
}) {
  const clamped = Math.max(-1, Math.min(1, value / 1.5));
  const left = 50 + clamped * 50;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-foreground/50">{neg}</span>
        <span className="text-foreground/70">
          {label} {value >= 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
        <span className="text-foreground/50">{pos}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10">
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${left}%` }}
        />
      </div>
    </div>
  );
}

export default function PersonalColorPanel() {
  const personImageDataUrl = useAppStore((s) => s.aiJob.personImageDataUrl);
  const outfits = useAppStore((s) => s.outfits);
  const pc = useAppStore((s) => s.personalColor);
  const setStatus = useAppStore((s) => s.setPersonalColorStatus);
  const setResult = useAppStore((s) => s.setPersonalColorResult);
  const setError = useAppStore((s) => s.setPersonalColorError);
  const reset = useAppStore((s) => s.resetPersonalColor);

  const result = pc.result;
  // 3D 모드를 안 거쳐 스토어가 비어 있어도 추천이 뜨도록 카탈로그로 폴백.
  const catalog = outfits.length > 0 ? outfits : SAMPLE_OUTFITS;
  // 카테고리별 베스트 1벌 = 코디 추천. ranked 는 ΔE 오름차순이라 각 카테고리 첫
  // 등장이 베스트. 단, 그 베스트마저 "덜 어울림"(harmonyLabel tone === "bad")이면
  // 코디에서 빼고 missingCats 로 분리한다 — 억지로 안 맞는 옷을 권하지 않도록.
  const { recommended, missingCats } = useMemo(() => {
    if (!result)
      return {
        recommended: [] as OutfitMatch[],
        missingCats: [] as ClothingCategory[],
      };
    const ranked = rankOutfitsByPalette(catalog, result.palette);
    const best = CATEGORY_ORDER.map((cat) =>
      ranked.find((m) => m.outfit.category === cat),
    ).filter((m): m is OutfitMatch => Boolean(m));
    return {
      recommended: best.filter((m) => harmonyLabel(m.deltaE).tone !== "bad"),
      missingCats: best
        .filter((m) => harmonyLabel(m.deltaE).tone === "bad")
        .map((m) => m.outfit.category),
    };
  }, [result, catalog]);
  const conf = result ? confidenceInfo(result.confidence, result.axes) : null;

  const onAnalyze = async () => {
    if (!personImageDataUrl) {
      setError("먼저 위에서 사람 사진을 업로드해주세요.");
      return;
    }
    setError(null);
    setStatus("analyzing");
    try {
      const blob = await (await fetch(personImageDataUrl)).blob();
      const form = new FormData();
      form.append("image", blob, "face.png");
      const res = await fetch("/api/personal-color", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `서버 오류 ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const isBusy = pc.status === "analyzing";

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
      <section>
        <h3 className="text-sm font-semibold">퍼스널컬러 분석</h3>
        <p className="text-xs text-foreground/60">
          얼굴 사진으로 시즌/타입을 진단하고, 등록된 옷 중 잘 어울리는 색을
          추천합니다. (위 “1. 사람 사진”을 그대로 사용)
        </p>
      </section>

      <button
        onClick={onAnalyze}
        disabled={isBusy || !personImageDataUrl}
        className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
      >
        {isBusy ? "분석 중..." : "퍼스널컬러 분석"}
      </button>

      {pc.error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {pc.error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div
            className={`rounded-lg border bg-gradient-to-br p-3 ${
              SEASON_ACCENT[result.season] ?? "border-white/10 from-white/5 to-white/5"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold">{result.type_ko}</span>
              <span className="text-xs text-foreground/60">
                {result.season_ko} ({result.season})
              </span>
            </div>
            <div className="mt-1 text-[11px] text-foreground/60">
              신뢰도 <span className={conf?.tone ?? ""}>{conf?.pct ?? 0}%</span>
              {!result.face_detected && (
                <span className="ml-2 text-yellow-400">
                  · 얼굴 미검출(중앙 크롭) — 정확도 낮을 수 있음
                </span>
              )}
            </div>
          </div>

          {conf && conf.level === "low" && (
            <div className="rounded border border-orange-400/40 bg-orange-400/10 px-2.5 py-2 text-[11px] text-orange-200">
              <span className="font-medium">신뢰도 낮음</span> · {conf.boundary} 경계에
              가까워 인접 시즌과 헷갈릴 수 있어요. 추천 색도 빗나갈 수 있습니다 — 더
              밝고 정면을 보는 사진을 권장합니다.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <AxisBar label="웜쿨" neg="쿨" pos="웜" value={result.axes.warmcool} />
            <AxisBar label="명도" neg="라이트" pos="딥" value={result.axes.value} />
            <AxisBar
              label="선명도"
              neg="뮤트"
              pos="클리어"
              value={result.axes.clarity}
            />
          </div>

          <section className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-foreground/70">추천 팔레트</h4>
            <div className="flex flex-wrap gap-1.5">
              {result.palette.map((hex) => (
                <div
                  key={hex}
                  className="h-7 w-7 rounded border border-white/15"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium text-foreground/70">
              카테고리별 베스트 추천
            </h4>
            {recommended.length === 0 && missingCats.length === 0 ? (
              <p className="text-[11px] text-foreground/50">
                색 정보(color)가 있는 등록된 옷이 없습니다. 옷을 등록하면 위
                팔레트와 가까운 순으로 추천합니다.
              </p>
            ) : (
              <>
                {recommended.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {recommended.map(({ outfit, deltaE, nearestSwatch }) => {
                      const h = harmonyLabel(deltaE);
                      return (
                        <li
                          key={outfit.id}
                          className="flex items-center gap-2 rounded border border-white/10 bg-black/30 px-2 py-1.5"
                        >
                          <span className="w-9 shrink-0 text-[10px] text-foreground/45">
                            {CATEGORY_KO[outfit.category]}
                          </span>
                          <div
                            className="h-5 w-5 shrink-0 rounded border border-white/15"
                            style={{ backgroundColor: outfit.color }}
                            title={outfit.color}
                          />
                          <span className="flex-1 truncate text-xs">{outfit.name}</span>
                          <div
                            className="h-4 w-4 shrink-0 rounded-sm border border-white/15"
                            style={{ backgroundColor: nearestSwatch }}
                            title={`팔레트 ${nearestSwatch}`}
                          />
                          <span className={`w-16 text-right text-[10px] ${TONE_CLASS[h.tone]}`}>
                            {h.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {missingCats.length > 0 && (
                  <p className="text-[11px] text-foreground/45">
                    이 시즌 팔레트에 맞는{" "}
                    <span className="text-foreground/70">
                      {missingCats.map((c) => CATEGORY_KO[c]).join("·")}
                    </span>{" "}
                    색은 옷장에 없어요.
                  </p>
                )}
              </>
            )}
          </section>

          <button
            onClick={reset}
            className="self-start text-xs text-foreground/50 hover:text-foreground"
          >
            분석 초기화
          </button>
        </div>
      )}
    </div>
  );
}
