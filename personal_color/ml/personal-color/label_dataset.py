"""FairFace(HF) 부트스트랩 라벨러.

HuggingFaceM4/FairFace 를 스트리밍으로 받아 각 얼굴에서 대표색을 추출하고
(features.extract_face_colors, method="seg"), rules.classify 로 3축 + 12타입
의사 라벨을 만든다. 수작업 라벨 없이 CNN 학습용 (이미지, 라벨) 코퍼스 생성.

2-pass 인 이유: 규칙의 축 중립점(B/L/CONTRAST/CHROMA_NEUTRAL)은 한 인구 기준
눈대중 상수라, 전 지구적으로 다양한 FairFace 에 그대로 쓰면 라벨이 한쪽으로
쏠린다. 그래서 먼저 전 코퍼스의 피부/머리 색을 모아(Pass 1) 그 중앙값으로
중립점을 재설정한 뒤(보정), 보정된 규칙으로 분류한다(Pass 2). 라벨 균형이
곧 CNN 품질의 상한이므로 이 보정이 핵심이다.

사용:
  ./venv/bin/python label_dataset.py --n 3000
출력 (data/fairface/, .gitignore 됨):
  img/000000.jpg ...   224px 크롭 (CNN 입력)
  labels.csv           의사 라벨 + 메타(race/gender/age)
  calibration.json     재설정된 중립점 + 코퍼스 통계(재현용)
"""

import argparse
import csv
import json
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

import rules
from color_utils import chroma, srgb_to_lab
from features import extract_face_colors
from rules import Features, classify

RESAMPLE = getattr(Image, "Resampling", Image).LANCZOS

FIELDS = [
    "filename", "warmcool", "value", "clarity", "type", "season",
    "skin_r", "skin_g", "skin_b", "hair_r", "hair_g", "hair_b",
    "confidence", "race", "gender", "age",
]

# 보정 대상: 규칙 축 중립점 <- 코퍼스 통계의 중앙값
CALIB = {
    "B_NEUTRAL": "skin_b",        # 피부 b*(황색도) 중앙값
    "L_NEUTRAL": "skin_L",        # 피부 L*(밝기) 중앙값
    "CONTRAST_NEUTRAL": "contrast",  # |피부L*-머리L*| 중앙값
    "CHROMA_NEUTRAL": "skin_C",   # 피부 채도 중앙값
}


def _decode(schema, key, val):
    """ClassLabel int -> 사람이 읽는 문자열(가능하면). 아니면 원래 값."""
    try:
        feat = schema[key]
        if hasattr(feat, "int2str"):
            return feat.int2str(int(val))
    except Exception:
        pass
    return val


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--n", type=int, default=3000, help="추출 성공 목표 샘플 수")
    ap.add_argument("--config", default="1.25", help="FairFace 패딩 설정 (0.25|1.25)")
    ap.add_argument("--split", default="train")
    ap.add_argument("--out", default="data/fairface")
    ap.add_argument("--size", type=int, default=224, help="크롭 한 변 px")
    ap.add_argument("--log-every", type=int, default=50)
    ap.add_argument("--no-calib", action="store_true",
                    help="중립점 재보정 건너뛰기(원 상수 사용)")
    args = ap.parse_args()

    from datasets import load_dataset

    img_dir = os.path.join(args.out, "img")
    os.makedirs(img_dir, exist_ok=True)

    print(f"FairFace {args.config}/{args.split} 스트리밍 로드...", flush=True)
    ds = load_dataset("HuggingFaceM4/FairFace", args.config,
                      split=args.split, streaming=True)
    schema = getattr(ds, "features", None)

    # ---- Pass 1: 대표색 추출 + 크롭 저장 ----
    recs = []
    seen = 0
    for ex in ds:
        if len(recs) >= args.n:
            break
        seen += 1
        img = np.array(ex["image"].convert("RGB"))
        feat = extract_face_colors(img, method="seg")
        if feat is None:
            continue
        fname = f"{len(recs):06d}.jpg"
        Image.fromarray(img).resize((args.size, args.size), RESAMPLE).save(
            os.path.join(img_dir, fname), quality=95)
        recs.append({
            "filename": fname,
            "skin": tuple(feat.skin_rgb),
            "hair": tuple(feat.hair_rgb),
            "eye": tuple(feat.eye_rgb),
            "race": _decode(schema, "race", ex.get("race")),
            "gender": _decode(schema, "gender", ex.get("gender")),
            "age": _decode(schema, "age", ex.get("age")),
        })
        if len(recs) % args.log_every == 0:
            print(f"  [pass1] kept={len(recs)} seen={seen}", flush=True)

    if not recs:
        print("처리된 샘플이 없습니다. (얼굴 추출 0건)")
        raise SystemExit(1)
    print(f"[pass1] 완료: kept={len(recs)} / seen={seen}", flush=True)

    # ---- 보정: 코퍼스 중앙값으로 축 중립점 재설정 ----
    skin_lab = np.array([srgb_to_lab(r["skin"]) for r in recs])  # (N,3)
    hair_lab = np.array([srgb_to_lab(r["hair"]) for r in recs])
    corpus = {
        "skin_L": skin_lab[:, 0],
        "skin_b": skin_lab[:, 2],
        "skin_C": np.hypot(skin_lab[:, 1], skin_lab[:, 2]),
        "contrast": np.abs(skin_lab[:, 0] - hair_lab[:, 0]),
    }
    medians = {const: float(np.median(corpus[col])) for const, col in CALIB.items()}
    defaults = {const: float(getattr(rules, const)) for const in CALIB}

    if not args.no_calib:
        for const, val in medians.items():
            setattr(rules, const, val)
        print("[보정] 중립점 재설정 (원값 -> 중앙값):")
        for const in CALIB:
            print(f"  {const:16s} {defaults[const]:6.2f} -> {medians[const]:6.2f}")
    else:
        print("[보정] 건너뜀 (--no-calib): 원 상수 사용")

    with open(os.path.join(args.out, "calibration.json"), "w", encoding="utf-8") as f:
        json.dump({"n": len(recs), "calibrated": not args.no_calib,
                   "defaults": defaults, "medians": medians},
                  f, ensure_ascii=False, indent=2)

    # ---- Pass 2: 보정된 규칙으로 classify + CSV ----
    seasons, types = Counter(), Counter()
    csv_path = os.path.join(args.out, "labels.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(FIELDS)
        for r in recs:
            res = classify(Features(skin_rgb=r["skin"], hair_rgb=r["hair"],
                                    eye_rgb=r["eye"]))
            ax = res["axes"]
            w.writerow([
                r["filename"],
                round(ax["warmcool"], 4), round(ax["value"], 4), round(ax["clarity"], 4),
                res["type"], res["season"],
                r["skin"][0], r["skin"][1], r["skin"][2],
                r["hair"][0], r["hair"][1], r["hair"][2],
                round(res["confidence"], 4),
                r["race"], r["gender"], r["age"],
            ])
            seasons[res["season"]] += 1
            types[res["type"]] += 1

    n = len(recs)
    print(f"\n[pass2] CSV 저장: {csv_path}  ({n} 행)")
    print("\n시즌 분포:")
    for s, c in seasons.most_common():
        print(f"  {s:8s} {c:5d}  ({100 * c / n:5.1f}%)")
    print("\n타입 분포:")
    for t, c in types.most_common():
        print(f"  {t:16s} {c:5d}  ({100 * c / n:5.1f}%)")


if __name__ == "__main__":
    main()
    # torch/HF datasets 의 네이티브 스레드가 인터프리터 finalize 중 GIL 정리에서
    # 충돌(PyGILState_Release ... must be current)해 SIGABRT(134)로 죽는다.
    # 모든 산출물은 이미 디스크에 기록·flush 됐으므로, 정상 종료 경로에서는
    # 인터프리터 정리를 건너뛰고 즉시 빠져나간다(예외/SystemExit 경로는 미도달).
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)
