"""규칙 기반 자동 라벨러 (부트스트랩).

피부/머리카락/눈 대표색(RGB) -> 3축(warmcool/value/clarity) -> 12 타입 + 팔레트.
수작업 라벨 없이 무라벨 얼굴 이미지에 의사 라벨을 붙이는 것이 목적이며,
P2에서 CNN이 이 규칙을 모사하도록 학습한다(=규칙 품질이 CNN 상한).

캘리브레이션 상수는 동양인 피부 기준 중립점 근사치. P1.5에서 실제 코퍼스
통계(중앙값)로 재보정할 자리표시값이다.
"""

from dataclasses import dataclass

import numpy as np

from color_utils import srgb_to_lab, chroma
from taxonomy import TYPES, derive_type, season_ko

# 중립점(이 값 근처면 축이 0). label_dataset.py 가 코퍼스 중앙값으로 재설정한다
# (setattr 로 이 모듈 전역을 덮어씀 → compute_axes 가 즉시 반영).
B_NEUTRAL = 14.0         # 피부 b*(황색도) 중립
L_NEUTRAL = 62.0         # 피부 L*(밝기) 중립
CONTRAST_NEUTRAL = 35.0  # 피부-머리 L* 대비 중립
CHROMA_NEUTRAL = 18.0    # 피부 채도 중립


@dataclass
class Features:
    """얼굴에서 추출한 대표색. P1.5의 features.py가 채워 넣는다."""
    skin_rgb: tuple
    hair_rgb: tuple
    eye_rgb: tuple


@dataclass
class Axes:
    warmcool: float  # + 웜 / - 쿨
    value: float     # + 딥 / - 라이트
    clarity: float   # + 클리어 / - 뮤트


def compute_axes(f):
    """대표색 -> 3축 연속값."""
    skin = srgb_to_lab(f.skin_rgb)
    hair = srgb_to_lab(f.hair_rgb)

    skin_L, skin_a, skin_b = float(skin[0]), float(skin[1]), float(skin[2])
    hair_L, hair_b = float(hair[0]), float(hair[2])

    # 웜-쿨: 피부 황색도(b*)가 주신호, 머리 b*가 보조.
    warmcool = (skin_b - B_NEUTRAL) / 10.0 + 0.3 * (hair_b / 10.0)
    # 밝기-깊이: 피부 L*이 낮을수록 딥.
    value = (L_NEUTRAL - skin_L) / 15.0
    # 선명-탁함: 피부-머리 명도 대비 + 피부 채도.
    contrast = abs(skin_L - hair_L)
    clarity = (contrast - CONTRAST_NEUTRAL) / 20.0 + (float(chroma(skin)) - CHROMA_NEUTRAL) / 20.0

    return Axes(warmcool=warmcool, value=value, clarity=clarity)


def classify(f):
    """대표색 -> 분류 결과 dict (의사 라벨 + 추천 팔레트)."""
    ax = compute_axes(f)
    tkey = derive_type(ax.warmcool, ax.value, ax.clarity)
    t = TYPES[tkey]
    # 두 주축이 모두 명확할수록 신뢰도가 높다(경계선 케이스는 낮게).
    confidence = float(np.tanh(min(abs(ax.warmcool), abs(ax.value))))
    return {
        "type": tkey,
        "type_ko": t["name_ko"],
        "season": t["season"],
        "season_ko": season_ko(t["season"]),
        "axes": {
            "warmcool": ax.warmcool,
            "value": ax.value,
            "clarity": ax.clarity,
        },
        "palette": list(t["palette"]),
        "confidence": confidence,
    }
