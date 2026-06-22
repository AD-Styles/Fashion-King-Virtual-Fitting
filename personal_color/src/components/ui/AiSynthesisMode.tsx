"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import PersonalColorPanel from "@/components/ui/PersonalColorPanel";

export default function AiSynthesisMode() {
  const {
    aiJob,
    outfits,
    setAiPersonImage,
    setAiOutfit,
    setAiPrompt,
    setAiStatus,
    setAiResult,
    setAiError,
    resetAiJob,
  } = useAppStore();
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/idm-vton")
      .then((r) => r.json())
      .then((data) => {
        if (active) setServerHealthy(Boolean(data?.ok));
      })
      .catch(() => {
        if (active) setServerHealthy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAiPersonImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const onGenerate = async () => {
    if (!aiJob.personImageDataUrl) {
      setAiError("사람 사진을 먼저 업로드해주세요.");
      return;
    }
    setAiError(null);
    setAiStatus("generating");
    setAiResult(null);

    try {
      const personBlob = await dataUrlToBlob(aiJob.personImageDataUrl);
      const form = new FormData();
      form.append("person", personBlob, "person.png");

      const outfit = outfits.find((o) => o.id === aiJob.selectedOutfitId);
      if (outfit && outfit.modelPath) {
        const r = await fetch(outfit.modelPath.replace(".glb", ".png"))
          .catch(() => null);
        if (r && r.ok) {
          const blob = await r.blob();
          form.append("garment", blob, "garment.png");
        }
      }
      form.append("prompt", aiJob.prompt);

      const res = await fetch("/api/idm-vton", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAiResult(url);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    }
  };

  const isBusy = aiJob.status === "generating" || aiJob.status === "uploading";

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="text-lg font-semibold">AI 합성 모드</h2>
        <p className="text-xs text-foreground/60">
          IDM-VTON으로 사람 사진 + 옷을 합성합니다 (정면 단일 각도, 사실적).
        </p>
        <div className="mt-2 text-xs">
          서버 상태:{" "}
          {serverHealthy === null && (
            <span className="text-foreground/50">확인 중...</span>
          )}
          {serverHealthy === true && (
            <span className="text-green-400">● 가동 중</span>
          )}
          {serverHealthy === false && (
            <span className="text-red-400">● 연결 안 됨 (Python 서버 미실행)</span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium">1. 사람 사진</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="text-xs"
        />
        {aiJob.personImageDataUrl && (
          <img
            src={aiJob.personImageDataUrl}
            alt="person"
            className="max-h-40 w-full rounded border border-white/10 object-contain"
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium">2. 옷 선택 (옵션)</label>
        <select
          value={aiJob.selectedOutfitId ?? ""}
          onChange={(e) => setAiOutfit(e.target.value || null)}
          className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs"
        >
          <option value="">(프롬프트만 사용)</option>
          {outfits
            .filter((o) => o.modelPath)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs font-medium">3. 프롬프트</label>
        <textarea
          value={aiJob.prompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={2}
          className="w-full rounded border border-white/20 bg-black/40 p-2 text-xs"
        />
      </section>

      <button
        onClick={onGenerate}
        disabled={isBusy || !aiJob.personImageDataUrl || serverHealthy === false}
        className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
      >
        {isBusy ? "생성 중... (10~30초)" : "합성 시작"}
      </button>

      <button
        onClick={resetAiJob}
        className="text-xs text-foreground/50 hover:text-foreground"
      >
        모두 초기화
      </button>

      {aiJob.error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {aiJob.error}
        </div>
      )}

      {aiJob.resultImageUrl && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">결과</h3>
          <img
            src={aiJob.resultImageUrl}
            alt="result"
            className="w-full rounded border border-white/10"
          />
          <a
            href={aiJob.resultImageUrl}
            download="virtual-try-on.png"
            className="text-center text-xs text-accent hover:underline"
          >
            PNG로 저장
          </a>
        </section>
      )}

      <PersonalColorPanel />
    </div>
  );
}
