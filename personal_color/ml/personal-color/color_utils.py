"""색 변환 유틸 (sRGB -> CIELab, ITA, hue, chroma, gray-world WB).

퍼스널컬러 규칙은 전부 Lab 공간에서 계산한다(지각적 거리가 RGB보다 안정적).
numpy만 의존하므로 P1 단계에서 추가 설치가 필요 없다.
"""

import numpy as np

# ---- sRGB -> 선형 RGB -------------------------------------------------------

def _linearize(rgb_0_255):
    c = np.asarray(rgb_0_255, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# sRGB(D65) -> XYZ 행렬, D65 백색점, CIE 상수
_M = np.array([
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.0721750],
    [0.0193339, 0.1191920, 0.9503041],
])
_WHITE_D65 = np.array([0.95047, 1.0, 1.08883])
_EPS = 216.0 / 24389.0
_KAPPA = 24389.0 / 27.0


def _f(t):
    return np.where(t > _EPS, np.cbrt(t), (_KAPPA * t + 16.0) / 116.0)


def srgb_to_lab(rgb_0_255):
    """sRGB [0,255] (마지막 축이 3) -> CIELab. 단일 (3,) 또는 (...,3) 모두 지원."""
    lin = _linearize(rgb_0_255)
    xyz = lin @ _M.T
    xyz = xyz / _WHITE_D65
    fx, fy, fz = _f(xyz[..., 0]), _f(xyz[..., 1]), _f(xyz[..., 2])
    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    return np.stack([L, a, b], axis=-1)


# ---- Lab 파생 지표 ----------------------------------------------------------

def ita(lab):
    """Individual Typology Angle(도). 피부 밝기/언더톤 지표. 클수록 밝고 쿨."""
    lab = np.asarray(lab, dtype=np.float64)
    return np.degrees(np.arctan2(lab[..., 0] - 50.0, lab[..., 2]))


def hue_angle(lab):
    """Lab 색상각(도) = atan2(b, a)."""
    lab = np.asarray(lab, dtype=np.float64)
    return np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))


def chroma(lab):
    """Lab 채도 = hypot(a, b)."""
    lab = np.asarray(lab, dtype=np.float64)
    return np.hypot(lab[..., 1], lab[..., 2])


# ---- 화이트밸런스 -----------------------------------------------------------

def gray_world_white_balance(img_0_255):
    """Gray-world 가정으로 채널별 게인 보정. 조명 색온도 편향 완화.

    img: (H,W,3) [0,255] -> 같은 범위 float64.
    """
    img = np.asarray(img_0_255, dtype=np.float64)
    means = img.reshape(-1, 3).mean(axis=0)
    gray = means.mean()
    scale = gray / np.clip(means, 1e-6, None)
    return np.clip(img * scale, 0.0, 255.0)
