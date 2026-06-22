// 퍼스널컬러 팔레트 ↔ 등록된 옷 색의 조화도 계산 (CIELab ΔE).
//
// 서버가 준 시즌 팔레트(hex 7색)에 대해, 사용자가 등록한 옷(Outfit.color)이
// 얼마나 가까운지 Lab 공간의 거리(ΔE76)로 점수화한다. 거리가 작을수록 잘 맞는 색.
// 순수 함수 모음이라 단위 테스트가 쉽다.

import { Outfit } from "@/types";

export type Lab = [number, number, number];

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

// sRGB(0~255) -> CIELab (D65). ml/personal-color/color_utils.srgb_to_lab 와 동일한 변환.
export function srgbToLab([r, g, b]: [number, number, number]): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  let X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

  // D65 백색점으로 정규화
  X /= 0.95047;
  Y /= 1.0;
  Z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function deltaE76(a: Lab, b: Lab): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

export type OutfitMatch = {
  outfit: Outfit;
  deltaE: number; // 팔레트 중 가장 가까운 색까지의 ΔE (작을수록 잘 맞음)
  nearestSwatch: string; // 매칭된 팔레트 hex
};

/**
 * 등록된 옷들을 시즌 팔레트와의 조화도 순으로 정렬한다(ΔE 오름차순).
 * 색(Outfit.color)이 없는 옷은 제외.
 */
export function rankOutfitsByPalette(
  outfits: Outfit[],
  palette: string[],
): OutfitMatch[] {
  const labPalette = palette
    .map((hex) => ({ hex, rgb: hexToRgb(hex) }))
    .filter((p): p is { hex: string; rgb: [number, number, number] } => p.rgb !== null)
    .map((p) => ({ hex: p.hex, lab: srgbToLab(p.rgb) }));
  if (labPalette.length === 0) return [];

  const matches: OutfitMatch[] = [];
  for (const o of outfits) {
    if (!o.color) continue;
    const rgb = hexToRgb(o.color);
    if (!rgb) continue;
    const lab = srgbToLab(rgb);

    let best = Infinity;
    let bestHex = labPalette[0].hex;
    for (const p of labPalette) {
      const d = deltaE76(lab, p.lab);
      if (d < best) {
        best = d;
        bestHex = p.hex;
      }
    }
    matches.push({ outfit: o, deltaE: best, nearestSwatch: bestHex });
  }
  matches.sort((a, b) => a.deltaE - b.deltaE);
  return matches;
}

// ΔE 를 사람이 읽는 라벨로. (참고: ΔE<10 매우 잘 맞음, <25 무난, 그 이상 부조화)
export function harmonyLabel(deltaE: number): { label: string; tone: "good" | "ok" | "bad" } {
  if (deltaE < 12) return { label: "아주 잘 어울림", tone: "good" };
  if (deltaE < 28) return { label: "무난함", tone: "ok" };
  return { label: "덜 어울림", tone: "bad" };
}
