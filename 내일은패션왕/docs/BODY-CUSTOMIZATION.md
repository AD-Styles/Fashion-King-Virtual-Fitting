# Phase 1 — 체형 커스터마이징 설계 노트

## 목표

사용자가 슬라이더로 자신의 체형과 비슷한 마네킹을 만들 수 있다. 360° 회전으로 모든 각도에서 확인 가능.

## 현재 구현 (MVP)

**임시 프리미티브 마네킹**
- 머리(Sphere), 목/팔/다리(Cylinder), 몸통/엉덩이(Box)
- 체형 파라미터 → 각 메쉬의 scale/position 계산
- 비현실적이지만 **빠르게 빙글빙글 돌아가는 무언가**를 확인 가능

**파라미터 7개**
1. 키 (140-200cm) — 전체 heightScale
2. 몸무게 (40-120kg) — weightFactor로 굵기에 반영
3. 어깨너비 비율 (0.8-1.3)
4. 가슴둘레 비율 (0.8-1.3) — torso Z scale
5. 허리둘레 비율 (0.7-1.4)
6. 엉덩이둘레 비율 (0.8-1.3)
7. 다리길이 비율 (0.85-1.15)

## 다음 단계: 실제 .glb 마네킹

### 옵션 A: Ready Player Me
- 장점: API로 즉시 받기, 표준 휴머노이드 본, 표정/머리스타일 옵션
- 단점: 만화풍, 무료 제한, 옷 시스템이 RPM 옷에 묶임

### 옵션 B: MakeHuman → Blender → glTF export
- 장점: 사실적, 자유로운 커스터마이징, 무료
- 단점: 직접 제작 시간 소요

### 옵션 C: Sketchfab CC0 마네킹
- 장점: 즉시 사용 가능, 사실적
- 단점: morph target이 없거나 부족할 수 있음

### 옵션 D: VRM (VRoid)
- 장점: 일본 발 표준 인간형 포맷, 표정/체형 morph target 기본 포함, 옷 시스템도 표준화
- 단점: 애니메 스타일

**추천 출발**: 옵션 C (즉시) → 옵션 B (이상적) 마이그레이션 경로.

## Morph Target (Blend Shape) 전략

이상적으로 마네킹 .glb에는 다음 morph target들이 포함되어야 함:

| Morph Target | 영향 |
|--------------|------|
| `shoulder_wide` / `shoulder_narrow` | 어깨너비 |
| `chest_big` / `chest_small` | 가슴둘레 |
| `waist_slim` / `waist_thick` | 허리 |
| `hips_wide` / `hips_narrow` | 엉덩이 |
| `belly_big` | 배 부피 |
| `arm_thick` / `arm_slim` | 팔 굵기 |

키와 다리 길이는 morph target보다 본(bone) scale이 더 자연스러움.

```ts
// 예시 (실제 .glb 로딩 후)
mesh.morphTargetInfluences[mesh.morphTargetDictionary["shoulder_wide"]] =
  Math.max(0, body.shoulder - 1) * 2;
mesh.morphTargetInfluences[mesh.morphTargetDictionary["shoulder_narrow"]] =
  Math.max(0, 1 - body.shoulder) * 2;
```

## 체형 프리셋 (예시)

```ts
const PRESETS = {
  "표준 한국인 남성": { height: 173, weight: 70, shoulder: 1.0, ... },
  "표준 한국인 여성": { height: 161, weight: 56, shoulder: 0.9, ... },
  "슬림": { ..., weight: 50, waist: 0.85 },
  "근육질": { ..., shoulder: 1.15, chest: 1.1, waist: 0.9 },
};
```

UI에 드롭다운 또는 카드 형태로 노출.

## 카메라 프리셋

OrbitControls를 사용 중이지만, "정면/측면/후면" 버튼으로 카메라를 점프시키면 UX 개선:

```ts
const VIEWS = {
  front: { position: [0, 1.4, 3.2], target: [0, 0.9, 0] },
  side:  { position: [3.2, 1.4, 0], target: [0, 0.9, 0] },
  back:  { position: [0, 1.4, -3.2], target: [0, 0.9, 0] },
};
```

drei의 `<CameraControls>` 또는 `useThree(({camera}) => ...)` 활용.

## 측정 데이터 통합 (선택)

미래에 사용자가 자신의 정확한 신체 치수를 알고 있다면:
- 키, 몸무게, 가슴/허리/엉덩이 둘레(cm)
- 이걸 비율 파라미터로 자동 변환

예: 표준 가슴둘레 = `1.0` ↔ 90cm 기준 → 사용자가 99cm 입력 시 chest = 1.1
