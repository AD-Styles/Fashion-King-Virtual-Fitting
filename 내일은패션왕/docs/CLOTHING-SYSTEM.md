# Phase 2 — 옷 시스템 설계 노트 (스켈레톤)

## 목표

마네킹에 옷(상의/하의/원피스/신발/액세서리)을 갈아입힐 수 있고, 체형이 바뀌어도 옷이 따라 늘어난다.

## 옷 데이터 모델

```ts
type ClothingCategory = "top" | "bottom" | "dress" | "shoes" | "accessory";

type Outfit = {
  id: string;
  name: string;
  category: ClothingCategory;
  modelPath: string;       // public/models/clothing/xxx.glb
  thumbnail?: string;      // public/textures/thumbnails/xxx.png
  availableColors?: string[];  // hex 코드
};
```

## 부착 전략

### 옵션 A: 정적 메쉬 attach
- 옷이 단순 mesh이고 마네킹 위에 위치만 맞춰서 올림
- **장점**: 단순
- **단점**: 체형 바뀌면 옷이 마네킹을 뚫음

### 옵션 B: SkinnedMesh + 같은 스켈레톤 공유 (추천)
- 옷이 마네킹과 같은 본 구조를 가진 SkinnedMesh
- 마네킹의 `skeleton`을 옷에도 binding
- **장점**: 본이 움직이면 옷도 따라 움직임. 마네킹 morph target 변경 시 옷도 일부 따라감 (옷에도 같은 morph target이 있으면)
- **단점**: 옷 제작 시 마네킹과 같은 본 구조여야 함

```ts
// 예시
const clothingGLB = useGLTF(outfit.modelPath);
const mannequinSkeleton = mannequinRef.current.skeleton;
clothingGLB.scene.traverse((obj) => {
  if (obj.isSkinnedMesh) {
    obj.bind(mannequinSkeleton, obj.bindMatrix);
  }
});
```

### 옵션 C: Cloth Simulation
- Three.js 클로스 시뮬레이션 (springs + verlet)
- **장점**: 가장 사실적 (옷이 자연스럽게 늘어지고 흔들림)
- **단점**: 성능 비용 큼, 구현 복잡

**추천 시작**: B → 필요 시 C 부분 적용

## 옷 소스 후보

- **자체 제작**: Blender + Marvelous Designer
- **유료 라이브러리**: CGTrader, TurboSquid (검색: "low poly clothing rigged")
- **무료**: Mixamo는 옷 없음. Sketchfab CC0 일부 있음.
- **AI 생성** (Phase 3): TripoSR, Wonder3D 등으로 2D 옷 사진 → 3D 메쉬

## 옷 색상/텍스처 변경

```ts
clothing.material.color.set("#ff3366");
// 또는 머터리얼 텍스처 교체
clothing.material.map = newTexture;
```

UI에 컬러 피커 또는 미리 정의된 팔레트.

## 충돌 처리 (옷 클립핑)

체형 슬라이더로 마네킹이 커지면 옷을 뚫고 나올 수 있음. 해결책:

1. **간단**: 옷 메쉬에 약간의 여유 두께 (마네킹 표면에서 +2cm 오프셋)
2. **중간**: 옷에도 같은 morph target 두기 (예: `shoulder_wide`)
3. **고급**: 매 프레임 BVH 충돌 체크 → 옷 정점을 마네킹 표면 밖으로 푸시

MVP는 1번으로 충분.

## UI 흐름

```
[BodyShapePanel]  [ClothingPicker]
      │                │
      ▼                ▼
  bodyShape         currentOutfit
      \              /
       ▼            ▼
       [Mannequin + ClothingLayer]
```

`ClothingPicker`:
- 카테고리 탭 (상의/하의/원피스/...)
- 그리드 썸네일
- 클릭 → setOutfit(...)
- 컬러 피커

## 룩 저장

```ts
type SavedLook = {
  id: string;
  name: string;
  bodyShape: BodyShape;
  outfits: { [K in ClothingCategory]?: { outfitId: string; color?: string } };
  createdAt: number;
};

// localStorage 또는 (Phase 3+) Supabase
```

## 다음 페이즈 연결

- Phase 3에서 AI가 생성한 옷도 같은 `Outfit` 타입을 따르면 UI 변경 최소화
