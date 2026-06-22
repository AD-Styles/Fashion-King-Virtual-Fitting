"""12 세부 퍼스널컬러 타입 정의 + 3축 -> 타입 매핑.

3축(연속값)으로 시즌을 먼저 가르고, 가장 강한 facet으로 세부 타입을 정한다.
  - warmcool: + 웜 / - 쿨
  - value   : + 딥(어두움) / - 라이트(밝음)
  - clarity : + 클리어(선명) / - 뮤트(탁함)

시즌 사분면:
  웜+라이트 = 봄(spring)   |  쿨+라이트 = 여름(summer)
  웜+딥     = 가을(autumn) |  쿨+딥     = 겨울(winter)
"""

# facet 가 이 값을 넘으면 '강하다'고 보고 세부 타입을 가른다.
STRONG = 0.6

_SEASON_KO = {
    "spring": "봄",
    "summer": "여름",
    "autumn": "가을",
    "winter": "겨울",
}


def season_ko(season):
    return _SEASON_KO.get(season, season)


# 각 타입: 한글명 + 시즌 + 대표 팔레트(의류 추천에 사용할 hex 7색)
TYPES = {
    # --- 봄: 웜 + 라이트 ---
    "spring_light": {
        "name_ko": "봄 라이트",
        "season": "spring",
        "palette": ["#F8D7BE", "#FFE0AC", "#FFF1C1", "#C9E4B4",
                    "#BFE3E0", "#FFC9B9", "#F6E7CE"],
    },
    "spring_true": {
        "name_ko": "봄 트루",
        "season": "spring",
        "palette": ["#FF9E7A", "#FFB347", "#FFD84D", "#8FCB6B",
                    "#4FC1C0", "#FF6F61", "#F4A340"],
    },
    "spring_bright": {
        "name_ko": "봄 브라이트",
        "season": "spring",
        "palette": ["#FF6B4A", "#FFB300", "#FFE000", "#38C172",
                    "#00C2D1", "#FF4081", "#FF8A00"],
    },
    # --- 여름: 쿨 + 라이트 ---
    "summer_light": {
        "name_ko": "여름 라이트",
        "season": "summer",
        "palette": ["#EAD7E8", "#CFE0F0", "#F3D9E2", "#D7E8DD",
                    "#E6E0F0", "#BFD3E6", "#DCC9E0"],
    },
    "summer_true": {
        "name_ko": "여름 트루",
        "season": "summer",
        "palette": ["#8FA9CE", "#B98AB0", "#6FAE9F", "#E08AA0",
                    "#9C8FC4", "#5E8FB8", "#C98FB0"],
    },
    "summer_soft": {
        "name_ko": "여름 소프트",
        "season": "summer",
        "palette": ["#9DA9B8", "#B49AAE", "#8FA89C", "#A8919E",
                    "#7E8FA0", "#C0A8B0", "#93A0A8"],
    },
    # --- 가을: 웜 + 딥 ---
    "autumn_soft": {
        "name_ko": "가을 소프트",
        "season": "autumn",
        "palette": ["#C9A87C", "#B5896A", "#9FA37A", "#C99B7B",
                    "#A88B6A", "#B7A06B", "#C08552"],
    },
    "autumn_true": {
        "name_ko": "가을 트루",
        "season": "autumn",
        "palette": ["#B5651D", "#8B6F2E", "#A0522D", "#6B8E23",
                    "#C97A40", "#8C6239", "#C19A4B"],
    },
    "autumn_deep": {
        "name_ko": "가을 딥",
        "season": "autumn",
        "palette": ["#7A3E1D", "#5C4326", "#8B4513", "#6B4226",
                    "#4F5B2A", "#803D2E", "#9A6324"],
    },
    # --- 겨울: 쿨 + 딥 ---
    "winter_deep": {
        "name_ko": "겨울 딥",
        "season": "winter",
        "palette": ["#2C2A4A", "#4A1F3D", "#1F4037", "#5C1A2B",
                    "#2B2B2B", "#3A1F5C", "#7A1F3D"],
    },
    "winter_true": {
        "name_ko": "겨울 트루",
        "season": "winter",
        "palette": ["#0046B8", "#C2185B", "#00897B", "#6A1B9A",
                    "#D50000", "#1A1A1A", "#00838F"],
    },
    "winter_bright": {
        "name_ko": "겨울 브라이트",
        "season": "winter",
        "palette": ["#0066FF", "#FF0066", "#00E5FF", "#8E24FF",
                    "#FF1744", "#00E676", "#EAF6FF"],
    },
}


def derive_type(warmcool, value, clarity):
    """3축 연속값 -> 12 타입 키 1개."""
    warm = warmcool >= 0.0
    light = value < 0.0

    if warm and light:                      # 봄
        if clarity >= STRONG:
            return "spring_bright"
        if value <= -STRONG:
            return "spring_light"
        return "spring_true"

    if (not warm) and light:                # 여름
        if clarity <= -STRONG:
            return "summer_soft"
        if value <= -STRONG:
            return "summer_light"
        return "summer_true"

    if warm and (not light):                # 가을
        if clarity <= -STRONG:
            return "autumn_soft"
        if value >= STRONG:
            return "autumn_deep"
        return "autumn_true"

    # 쿨 + 딥 = 겨울
    if clarity >= STRONG:
        return "winter_bright"
    if value >= STRONG:
        return "winter_deep"
    return "winter_true"
