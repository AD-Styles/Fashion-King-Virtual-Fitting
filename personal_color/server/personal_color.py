"""퍼스널컬러 분석 (ONNX 추론, torch 불필요).

학습 파이프라인(ml/personal-color)이 내보낸 ONNX 모델 + 사이드카 JSON 으로
얼굴 사진 -> 3축(warmcool/value/clarity) -> 12타입/시즌 + 추천 팔레트를 만든다.
서버는 torch/transformers 없이 onnxruntime 만으로 동작한다(=mock VTON 모드처럼 가볍게).

설계 메모:
  - 타입 정의(taxonomy.py)는 학습 코드와 '같은 파일'을 경로로 로드 → 단일 출처.
    (ml/personal-color 는 하이픈 폴더라 일반 import 불가 → importlib 경로 로드)
  - 얼굴 프레이밍을 학습 코퍼스(FairFace 1.25)에 맞춘다: mediapipe 로 얼굴 bbox 를
    잡아 pad 배 정사각 크롭 후 size 리사이즈. mediapipe/얼굴 미검출 시 중앙 크롭 폴백.
    (ml/personal-color/predict.py 의 face_crop 과 동일 로직 — 분포 일치가 정확도 핵심)
  - 전처리/축순서는 사이드카 JSON 에서 읽고, 없으면 ImageNet 기본값으로 폴백.

환경변수:
  PERSONAL_COLOR_MODEL      ONNX 경로 (기본: ../ml/personal-color/models/...onnx)
  PERSONAL_COLOR_FACE_TASK  mediapipe face_landmarker.task 경로
"""

import importlib.util
import io
import json
import os

import numpy as np
from PIL import Image

_HERE = os.path.dirname(os.path.abspath(__file__))
_ML_DIR = os.path.abspath(os.path.join(_HERE, "..", "ml", "personal-color"))

DEFAULT_MODEL = os.environ.get(
    "PERSONAL_COLOR_MODEL",
    os.path.join(_ML_DIR, "models", "personal_color_resnet18.onnx"),
)
FACE_TASK = os.environ.get(
    "PERSONAL_COLOR_FACE_TASK",
    os.path.join(_ML_DIR, "face_landmarker.task"),
)

# 사이드카 JSON 이 없을 때의 폴백(ImageNet 정규화 + 학습 축순서)
_DEFAULT_NORM = {"mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}
_DEFAULT_AXES = ["warmcool", "value", "clarity"]


def _load_taxonomy():
    """ml/personal-color/taxonomy.py 를 경로로 로드(하이픈 폴더 → 일반 import 불가)."""
    path = os.path.join(_ML_DIR, "taxonomy.py")
    if not os.path.exists(path):
        raise FileNotFoundError(f"taxonomy.py 없음: {path}")
    spec = importlib.util.spec_from_file_location("pc_taxonomy", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _center_square(img, size):
    """중앙 정사각 크롭 후 size 리사이즈 (얼굴 미검출 폴백)."""
    h, w = img.shape[:2]
    s = min(h, w)
    y0, x0 = (h - s) // 2, (w - s) // 2
    sq = img[y0:y0 + s, x0:x0 + s]
    return np.array(Image.fromarray(sq).resize((size, size), Image.BILINEAR))


_LANDMARKER = None


def _get_landmarker():
    """mediapipe FaceLandmarker 싱글턴 (로드 비용 큼)."""
    global _LANDMARKER
    if _LANDMARKER is None:
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision
        opts = vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=FACE_TASK),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
        )
        _LANDMARKER = vision.FaceLandmarker.create_from_options(opts)
    return _LANDMARKER


def _face_crop(img_rgb, pad=1.25, size=224):
    """얼굴 bbox 를 pad 배 정사각 크롭 후 size 리사이즈. (crop, face_detected) 반환.

    mediapipe/얼굴 미검출 시 중앙 정사각 크롭으로 폴백한다.
    predict.py 의 face_crop 과 동일한 프레이밍(분포 일치).
    """
    img = np.ascontiguousarray(img_rgb, dtype=np.uint8)
    h, w = img.shape[:2]
    if os.path.exists(FACE_TASK):
        try:
            import mediapipe as mp
            res = _get_landmarker().detect(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=img))
            if res.face_landmarks:
                pts = np.array([[int(lm.x * w), int(lm.y * h)]
                                for lm in res.face_landmarks[0]])
                x0, y0 = pts[:, 0].min(), pts[:, 1].min()
                x1, y1 = pts[:, 0].max(), pts[:, 1].max()
                cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
                half = max(x1 - x0, y1 - y0) * pad / 2.0
                X0, X1 = int(max(0, cx - half)), int(min(w, cx + half))
                Y0, Y1 = int(max(0, cy - half)), int(min(h, cy + half))
                if X1 > X0 and Y1 > Y0:
                    crop = img[Y0:Y1, X0:X1]
                    out = np.array(Image.fromarray(crop).resize(
                        (size, size), Image.BILINEAR))
                    return out, True
        except Exception:
            pass
    return _center_square(img, size), False


class PersonalColorAnalyzer:
    """ONNX 모델 1회 로드 후 재사용(지연 초기화는 서버 쪽에서)."""

    def __init__(self, model_path=DEFAULT_MODEL):
        import onnxruntime as ort

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"ONNX 모델 없음: {model_path}\n"
                "  먼저: ml/personal-color/export.py --model ...pt --onnx"
            )
        self.model_path = model_path
        self.session = ort.InferenceSession(
            model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

        # 사이드카 JSON(전처리/축순서). 없으면 ImageNet 기본값.
        meta_path = os.path.splitext(model_path)[0] + ".json"
        meta = {}
        if os.path.exists(meta_path):
            with open(meta_path, encoding="utf-8") as f:
                meta = json.load(f)
        self.meta = meta
        self.img_size = int(meta.get("img_size", 224))
        norm = meta.get("normalize", _DEFAULT_NORM)
        self.mean = np.array(norm["mean"], dtype=np.float32)
        self.std = np.array(norm["std"], dtype=np.float32)
        self.axes = list(meta.get("axes", _DEFAULT_AXES))

        self._tax = _load_taxonomy()

    def _preprocess(self, crop):
        arr = (np.asarray(crop, dtype=np.float32) / 255.0 - self.mean) / self.std
        return arr.transpose(2, 0, 1)[None].astype(np.float32)  # (1,3,H,W)

    def analyze(self, img_rgb):
        """RGB uint8 (H,W,3) -> 분류 결과 dict (predict.analyze 와 동형)."""
        crop, face_detected = _face_crop(img_rgb, size=self.img_size)
        x = self._preprocess(crop)
        out = self.session.run(None, {self.input_name: x})[0][0]
        vals = {a: float(v) for a, v in zip(self.axes, out)}
        wc, val, clar = vals["warmcool"], vals["value"], vals["clarity"]

        tax = self._tax
        tkey = tax.derive_type(wc, val, clar)
        t = tax.TYPES[tkey]
        confidence = float(np.tanh(min(abs(wc), abs(val))))  # rules.classify 와 동일
        return {
            "type": tkey,
            "type_ko": t["name_ko"],
            "season": t["season"],
            "season_ko": tax.season_ko(t["season"]),
            "axes": {"warmcool": wc, "value": val, "clarity": clar},
            "palette": list(t["palette"]),
            "confidence": confidence,
            "face_detected": face_detected,
        }

    def analyze_bytes(self, image_bytes):
        img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
        return self.analyze(img)
