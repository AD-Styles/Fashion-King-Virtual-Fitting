"""features.py 검증 (코퍼스/실사진 불필요).

1) representative_rgb: 다수 피부 픽셀 + 반사광(흰)·그림자(검정) 이상치 무리에서
   대표색이 피부색으로 복원되는지(이상치에 안 끌려가는지).
2) extract_face_colors: 단색 이미지에 얼굴이 없으면 None 을 돌려주고
   예외 없이 끝나는지(mediapipe 배선 스모크 테스트).
"""

import sys

import numpy as np

from features import representative_rgb, extract_face_colors

rng = np.random.default_rng(0)


def test_representative_rejects_outliers():
    skin = np.array([200, 150, 120], dtype=np.float64)
    skin_px = skin + rng.normal(0, 6, size=(300, 3))           # 다수 피부
    white = np.full((40, 3), 255.0)                            # 반사광
    black = np.full((40, 3), 8.0)                              # 그림자
    px = np.clip(np.concatenate([skin_px, white, black]), 0, 255)

    r = np.array(representative_rgb(px), dtype=np.float64)
    err = np.abs(r - skin)
    ok = bool((err <= 15).all())
    print(f"  representative_rgb -> {tuple(int(v) for v in r)}  (기대≈(200,150,120), "
          f"채널오차={tuple(int(v) for v in err)})  {'OK' if ok else 'FAIL'}")
    return ok


def test_representative_uniform():
    px = np.full((100, 3), [123, 77, 200], dtype=np.float64)
    r = representative_rgb(px)
    ok = (r == (123, 77, 200))
    print(f"  uniform -> {r}  {'OK' if ok else 'FAIL'}")
    return ok


def test_blank_image_returns_none():
    # landmark 경로는 오프라인(모델 로컬)이라 selftest에서 검증. seg 경로는 HF 모델
    # 다운로드가 필요해 features.py CLI로 실사진 통합검증한다.
    blank = np.full((256, 256, 3), 128, dtype=np.uint8)
    try:
        out = extract_face_colors(blank, method="landmark")
    except Exception as e:  # noqa: BLE001
        print(f"  blank image(landmark) -> 예외 발생: {e!r}  FAIL")
        return False
    ok = out is None
    print(f"  blank image(landmark) -> {out}  (기대=None)  {'OK' if ok else 'FAIL'}")
    return ok


def main():
    print("[1] representative_rgb 이상치 거부")
    a = test_representative_rejects_outliers()
    b = test_representative_uniform()
    print("[2] extract_face_colors 배선(빈 이미지 -> None)")
    c = test_blank_image_returns_none()

    passed = sum([a, b, c])
    print(f"\n결과: {passed}/3 통과")
    return 0 if passed == 3 else 1


if __name__ == "__main__":
    sys.exit(main())
