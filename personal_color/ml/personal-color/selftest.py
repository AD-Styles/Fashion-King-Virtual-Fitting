"""합성 입력으로 색 -> 3축 -> 12타입 -> 팔레트 파이프라인 검증.

얼굴 검출 없이 4개 사분면 원형(archetype) 대표색만으로 시즌이 맞게
떨어지는지 확인한다. GPU/데이터셋 불필요. 통과 시 exit 0.
"""

import sys

from rules import Features, classify

# (이름, Features, 기대 시즌)
CASES = [
    ("웜+라이트 → 봄",
     Features(skin_rgb=(245, 218, 188), hair_rgb=(110, 78, 45), eye_rgb=(105, 70, 40)),
     "spring"),
    ("쿨+라이트 → 여름",
     Features(skin_rgb=(236, 214, 212), hair_rgb=(90, 80, 78), eye_rgb=(95, 90, 88)),
     "summer"),
    ("웜+딥 → 가을",
     Features(skin_rgb=(150, 110, 70), hair_rgb=(70, 48, 28), eye_rgb=(75, 50, 30)),
     "autumn"),
    ("쿨+딥 → 겨울",
     Features(skin_rgb=(112, 96, 96), hair_rgb=(28, 26, 28), eye_rgb=(40, 38, 40)),
     "winter"),
]


def main():
    failures = 0
    for label, feat, expected in CASES:
        r = classify(feat)
        ax = r["axes"]
        ok = r["season"] == expected
        mark = "OK " if ok else "FAIL"
        if not ok:
            failures += 1
        print(f"[{mark}] {label}")
        print(f"       타입: {r['type']} ({r['type_ko']}, {r['season_ko']})"
              f"  기대 시즌={expected}")
        print(f"       축: warmcool={ax['warmcool']:+.2f}"
              f"  value={ax['value']:+.2f}  clarity={ax['clarity']:+.2f}"
              f"  conf={r['confidence']:.2f}")
        print(f"       팔레트: {' '.join(r['palette'])}")
        print()

    total = len(CASES)
    print(f"결과: {total - failures}/{total} 통과")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
