"""얼굴 -> 대표색(피부/머리/눈) 추출. rules.classify 의 입력을 만든다.

두 가지 추출기:
  - method="seg" (기본, 권장): jonathandinu/face-parsing(SegFormer)로 픽셀 단위
    세그멘테이션 마스크를 얻어 피부/머리/눈 영역 픽셀을 모은다. 머리도 진짜
    마스크라 랜드마크 휴리스틱보다 정확. torch + transformers + 모델(첫 실행 시
    HF 허브에서 자동 캐시) 필요.
  - method="landmark": mediapipe FaceLandmarker(478점). 가볍고 얼굴 검출 게이트로
    유용하지만 머리=상단 띠 휴리스틱이라 머리색이 약함.

영역 픽셀은 Lab 명도 극단값(반사광/그림자)을 잘라낸 뒤 중앙값으로 집계한다
(`representative_rgb`, 순수 함수라 합성 픽셀로 단위 검증 가능).
"""

import os
import sys

import numpy as np

os.environ.setdefault("GLOG_minloglevel", "2")  # mediapipe 로그 억제

from color_utils import srgb_to_lab  # noqa: E402

SEG_MODEL = "jonathandinu/face-parsing"

# --- mediapipe(landmark) 경로용 상수 ---
# 볼/중앙 얼굴(헤어라인에서 충분히 떨어진 점만 — 머리 오염 방지)
SKIN_LMK = [50, 280, 9, 108, 337, 5, 6, 205, 425]
IRIS_LMK = [468, 473]  # Tasks FaceLandmarker(478점)에 홍채 포함
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_landmarker.task")
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)


# ===== 공통: 픽셀 무리 -> 대표색 ============================================

def representative_rgb(pixels_rgb, drop_frac=0.2):
    """픽셀 무리 -> 대표 RGB. 명도(L*) 상·하위 극단값을 버리고 중앙값.

    반사광(흰 점)·그림자(검은 점)에 끌려가지 않게 한다. 순수 함수.
    drop_frac 을 키우면(예: 눈) 양극단을 더 많이 잘라 중간대(홍채)를 잡는다.
    """
    px = np.asarray(pixels_rgb, dtype=np.float64).reshape(-1, 3)
    if len(px) == 0:
        return None
    L = srgb_to_lab(px)[:, 0]
    lo, hi = np.quantile(L, [drop_frac / 2.0, 1.0 - drop_frac / 2.0])
    keep = (L >= lo) & (L <= hi)
    if keep.sum() < 1:
        keep = np.ones(len(px), dtype=bool)
    med = np.median(px[keep], axis=0)
    return tuple(int(round(float(v))) for v in med)


# ===== method="seg": SegFormer face-parsing =================================

_SEG_PIPE = None  # transformers 파이프라인 싱글턴(로드 비용 큼)


def _get_seg_pipe():
    global _SEG_PIPE
    if _SEG_PIPE is None:
        import torch
        from transformers import pipeline
        device = 0 if torch.cuda.is_available() else -1
        _SEG_PIPE = pipeline("image-segmentation", model=SEG_MODEL, device=device)
    return _SEG_PIPE


def _extract_seg(rgb_image, return_debug=False, min_skin=400):
    from PIL import Image
    from rules import Features

    img = np.ascontiguousarray(rgb_image, dtype=np.uint8)
    h, w = img.shape[:2]
    results = _get_seg_pipe()(Image.fromarray(img))

    def _mask(r):
        m = np.array(r["mask"])
        if m.shape[:2] != (h, w):  # 일부 버전은 마스크 크기가 다름 → 보정
            m = np.array(Image.fromarray(m).resize((w, h), Image.NEAREST))
        return m > 127

    masks = {r["label"].lower(): _mask(r) for r in results}

    def gather(pred):
        keep = np.zeros((h, w), dtype=bool)
        found = False
        for lab, m in masks.items():
            if pred(lab):
                keep |= m
                found = True
        return img[keep] if found else np.empty((0, 3))

    skin_px = gather(lambda l: l in ("skin", "nose"))
    hair_px = gather(lambda l: "hair" in l)
    eye_px = gather(lambda l: "eye" in l and "brow" not in l
                    and "glass" not in l and not l.endswith("_g"))

    skin_rgb = representative_rgb(skin_px)
    if skin_rgb is None or len(skin_px) < min_skin:
        return None  # 피부 픽셀 부족 = 얼굴 없음/부적합
    eye_rgb = representative_rgb(eye_px, drop_frac=0.5) or skin_rgb
    hair_rgb = representative_rgb(hair_px) if len(hair_px) >= 50 else skin_rgb

    feat = Features(skin_rgb=skin_rgb, hair_rgb=hair_rgb, eye_rgb=eye_rgb)
    if return_debug:
        return feat, {
            "labels": sorted(masks),
            "n_skin": int(len(skin_px)),
            "n_hair": int(len(hair_px)),
            "n_eye": int(len(eye_px)),
        }
    return feat


# ===== method="landmark": mediapipe FaceLandmarker =========================

_LANDMARKER = None


def _patch(img, cx, cy, r):
    """(cx,cy) 중심 (2r+1) 정사각 패치 픽셀 -> (M,3)."""
    h, w = img.shape[:2]
    x0, x1 = max(0, cx - r), min(w, cx + r + 1)
    y0, y1 = max(0, cy - r), min(h, cy + r + 1)
    if x1 <= x0 or y1 <= y0:
        return np.empty((0, 3))
    return img[y0:y1, x0:x1].reshape(-1, 3)


def _get_landmarker():
    global _LANDMARKER
    if _LANDMARKER is None:
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                "face_landmarker.task 가 없습니다. 받으세요:\n"
                "  curl -L -o face_landmarker.task " + MODEL_URL
            )
        opts = vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
        )
        _LANDMARKER = vision.FaceLandmarker.create_from_options(opts)
    return _LANDMARKER


def _landmarks_px(landmarks, w, h):
    return np.array([[int(lm.x * w), int(lm.y * h)] for lm in landmarks])


def _extract_landmarks(rgb_image, return_debug=False):
    import mediapipe as mp
    from rules import Features

    img = np.ascontiguousarray(rgb_image, dtype=np.uint8)
    h, w = img.shape[:2]

    landmarker = _get_landmarker()
    res = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=img))
    if not res.face_landmarks:
        return None

    pts = _landmarks_px(res.face_landmarks[0], w, h)

    skin_px = [_patch(img, pts[i][0], pts[i][1], 4) for i in SKIN_LMK if i < len(pts)]
    skin_px = np.concatenate([p for p in skin_px if len(p)], axis=0) \
        if any(len(p) for p in skin_px) else np.empty((0, 3))
    eye_px = [_patch(img, pts[i][0], pts[i][1], 3) for i in IRIS_LMK if i < len(pts)]
    eye_px = np.concatenate([p for p in eye_px if len(p)], axis=0) \
        if any(len(p) for p in eye_px) else np.empty((0, 3))

    x_min, y_min = pts[:, 0].min(), pts[:, 1].min()
    x_max, y_max = pts[:, 0].max(), pts[:, 1].max()
    fw, fh = (x_max - x_min), (y_max - y_min)
    hy0, hy1 = max(0, int(y_min - 0.22 * fh)), max(0, int(y_min - 0.04 * fh))
    hx0, hx1 = int(x_min + 0.25 * fw), int(x_max - 0.25 * fw)
    hair_px = img[hy0:hy1, hx0:hx1].reshape(-1, 3) \
        if (hy1 > hy0 and hx1 > hx0) else np.empty((0, 3))

    skin_rgb = representative_rgb(skin_px)
    if skin_rgb is None:
        return None
    eye_rgb = representative_rgb(eye_px) or skin_rgb
    hair_rgb = representative_rgb(hair_px) if len(hair_px) >= 10 else skin_rgb

    feat = Features(skin_rgb=skin_rgb, hair_rgb=hair_rgb, eye_rgb=eye_rgb)
    if return_debug:
        return feat, {"n_skin": int(len(skin_px)), "n_eye": int(len(eye_px)),
                      "n_hair": int(len(hair_px))}
    return feat


# ===== 디스패처 / IO ========================================================

def extract_face_colors(rgb_image, method="seg", return_debug=False):
    """RGB uint8 (H,W,3) -> Features 또는 None(얼굴 미검출).

    method: "seg"(기본, face-parsing) | "landmark"(mediapipe).
    """
    if method == "seg":
        return _extract_seg(rgb_image, return_debug=return_debug)
    if method in ("landmark", "mediapipe"):
        return _extract_landmarks(rgb_image, return_debug=return_debug)
    raise ValueError(f"unknown method: {method}")


def extract_from_path(path, method="seg"):
    from PIL import Image
    img = np.array(Image.open(path).convert("RGB"))
    return extract_face_colors(img, method=method)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python features.py <face_image> [seg|landmark]")
        raise SystemExit(2)

    from rules import classify
    method = sys.argv[2] if len(sys.argv) > 2 else "seg"
    feat = extract_from_path(sys.argv[1], method=method)
    if feat is None:
        print("얼굴 미검출 또는 색 추출 실패:", sys.argv[1])
        raise SystemExit(1)
    print(f"[{method}] 대표색:", feat)
    r = classify(feat)
    print(f"타입: {r['type']} ({r['type_ko']}, {r['season_ko']})  conf={r['confidence']:.2f}")
    print(f"축: {r['axes']}")
    print(f"팔레트: {' '.join(r['palette'])}")
