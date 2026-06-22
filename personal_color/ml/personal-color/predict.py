"""학습된 퍼스널컬러 CNN 추론.

이미지 -> 3축(warmcool/value/clarity) -> 12타입/시즌 + 추천 팔레트.

얼굴 크롭을 학습 프레이밍에 맞춘다: 학습 코퍼스(FairFace 1.25)는 '얼굴+여백'을
224 로 리사이즈한 것이라, 추론 입력도 같은 프레이밍이어야 분포가 맞는다.
→ mediapipe 로 얼굴 bbox 를 잡아 ~1.25배 정사각 크롭 후 224 리사이즈,
   얼굴 미검출 시 중앙 정사각 크롭으로 폴백.

학습과 동일하게 화이트밸런스 미적용(원본 색). 결과 dict 모양은 rules.classify 와
맞춰 둠(type/type_ko/season/season_ko/axes/palette/confidence) → 서버/웹앱이
규칙 결과든 CNN 결과든 같은 형태로 소비.

사용:
  ./venv/bin/python predict.py <image> [--model models/personal_color_resnet18.pt]
"""

import argparse
import os
import sys

import numpy as np
import torch
from PIL import Image

from taxonomy import TYPES, derive_type, season_ko

DEFAULT_MODEL = os.path.join("models", "personal_color_resnet18.pt")


def load_model(path, device=None):
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    ckpt = torch.load(path, map_location=device, weights_only=False)
    from train import build_model  # 학습과 동일 아키텍처 구성 재사용
    model = build_model(ckpt["arch"])
    model.load_state_dict(ckpt["state_dict"])
    model.to(device).eval()
    return model, ckpt, device


def _center_square(img, size):
    h, w = img.shape[:2]
    s = min(h, w)
    y0, x0 = (h - s) // 2, (w - s) // 2
    sq = img[y0:y0 + s, x0:x0 + s]
    return np.array(Image.fromarray(sq).resize((size, size), Image.BILINEAR))


def face_crop(img_rgb, pad=1.25, size=224):
    """얼굴 bbox 를 pad 배 정사각으로 크롭 후 size 리사이즈. 실패 시 중앙 크롭."""
    img = np.ascontiguousarray(img_rgb, dtype=np.uint8)
    h, w = img.shape[:2]
    try:
        import mediapipe as mp
        from features import _get_landmarker, _landmarks_px
        res = _get_landmarker().detect(
            mp.Image(image_format=mp.ImageFormat.SRGB, data=img))
        if res.face_landmarks:
            pts = _landmarks_px(res.face_landmarks[0], w, h)
            x0, y0 = pts[:, 0].min(), pts[:, 1].min()
            x1, y1 = pts[:, 0].max(), pts[:, 1].max()
            cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
            half = max(x1 - x0, y1 - y0) * pad / 2.0
            X0, X1 = int(max(0, cx - half)), int(min(w, cx + half))
            Y0, Y1 = int(max(0, cy - half)), int(min(h, cy + half))
            if X1 > X0 and Y1 > Y0:
                crop = img[Y0:Y1, X0:X1]
                return np.array(Image.fromarray(crop).resize((size, size),
                                                             Image.BILINEAR))
    except Exception:
        pass
    return _center_square(img, size)


def _preprocess(crop224, normalize):
    mean = np.array(normalize["mean"], dtype=np.float32)
    std = np.array(normalize["std"], dtype=np.float32)
    arr = (np.asarray(crop224, dtype=np.float32) / 255.0 - mean) / std
    return torch.from_numpy(arr.transpose(2, 0, 1)).unsqueeze(0).float()


@torch.no_grad()
def analyze(img_rgb, model, ckpt, device):
    """RGB uint8 (H,W,3) -> 분류 결과 dict."""
    crop = face_crop(img_rgb, size=ckpt["img_size"])
    x = _preprocess(crop, ckpt["normalize"]).to(device)
    wc, val, clar = model(x)[0].float().cpu().tolist()
    tkey = derive_type(wc, val, clar)
    t = TYPES[tkey]
    confidence = float(np.tanh(min(abs(wc), abs(val))))  # rules.classify 와 동일
    return {
        "type": tkey,
        "type_ko": t["name_ko"],
        "season": t["season"],
        "season_ko": season_ko(t["season"]),
        "axes": {"warmcool": wc, "value": val, "clarity": clar},
        "palette": list(t["palette"]),
        "confidence": confidence,
    }


def analyze_path(path, model_path=DEFAULT_MODEL):
    model, ckpt, device = load_model(model_path)
    img = np.array(Image.open(path).convert("RGB"))
    return analyze(img, model, ckpt, device)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    if not os.path.exists(args.model):
        print(f"모델 없음: {args.model}  (먼저 train.py 로 학습)")
        raise SystemExit(1)

    r = analyze_path(args.image, args.model)
    ax = {k: round(v, 3) for k, v in r["axes"].items()}
    print(f"타입: {r['type']} ({r['type_ko']}, {r['season_ko']})  "
          f"conf={r['confidence']:.2f}")
    print(f"축: {ax}")
    print(f"팔레트: {' '.join(r['palette'])}")

    sys.stdout.flush()
    os._exit(0)  # 네이티브 스레드 finalize 충돌(SIGABRT) 회피


if __name__ == "__main__":
    main()
