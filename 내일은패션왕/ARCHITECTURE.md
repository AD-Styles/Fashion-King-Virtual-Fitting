# 아키텍처

## 스택 결정

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | SSR/SSG + API 라우트 일원화, 배포 용이 (Vercel) |
| 언어 | TypeScript | 3D 좌표·체형 파라미터처럼 숫자 타입 많은 코드에서 타입 안정성 중요 |
| 3D 렌더링 | Three.js + React Three Fiber | 가장 성숙한 웹 3D 생태계, 선언적 API |
| 3D 헬퍼 | @react-three/drei | OrbitControls, Environment, useGLTF 등 흔히 쓰는 컴포넌트 |
| 상태 관리 | Zustand | 가볍고 R3F와 잘 어울림 (Redux는 과함) |
| 스타일 | Tailwind CSS | 빠른 UI 프로토타이핑 |
| AI 통합 (Phase 3+) | TBD — Replicate, Hugging Face Inference, 또는 자체 호스팅 | 비용/지연 관리 |

## 데이터 흐름

```
[BodyShapePanel UI]
       │ (슬라이더 onChange)
       ▼
[Zustand store]  (bodyShape: { height, weight, shoulder, ... })
       │ (구독)
       ▼
[Mannequin.tsx]
       │ (useMemo로 dims 계산 → JSX scale/position 반영)
       ▼
[R3F Canvas]  (실시간 60fps 리렌더)
```

옷 선택, 자동 회전, 미래의 AI 결과도 모두 같은 Zustand 스토어를 거친다.

## 컴포넌트 구조

```
HomePage (app/page.tsx)
├─ Scene (components/three/Scene.tsx)  ←  R3F Canvas
│  ├─ Lighting
│  ├─ Mannequin   ←  bodyShape 구독, scale로 체형 반영
│  │  └─ (Phase 2) ClothingLayer  ←  currentOutfit 구독
│  ├─ Environment (HDR 배경)
│  ├─ ContactShadows
│  └─ OrbitControls  ←  autoRotate 구독
└─ BodyShapePanel (components/ui/)
   └─ 슬라이더들 → setBodyParam 호출
```

## 핵심 모듈

### `src/types/index.ts`
- `BodyShape`: 체형 7개 파라미터
- `DEFAULT_BODY_SHAPE`: 표준값 (키 170cm 기준)
- `BODY_SHAPE_RANGES`: 슬라이더 min/max/step/unit
- `Outfit`: 옷 데이터 모델 (Phase 2에서 본격 사용)

### `src/lib/store.ts`
- `useAppStore`: 전역 상태 (bodyShape, currentOutfit, autoRotate)
- 액션: `setBodyParam`, `resetBodyShape`, `setOutfit`, `toggleAutoRotate`

### `src/components/three/Mannequin.tsx`
- 현재: 프리미티브(Box/Cylinder/Sphere) 조합으로 인체 표현
- Phase 1 후반: GLTFLoader로 `.glb` 로드 → Mesh.morphTargetInfluences 조정으로 체형 변형
- Phase 2: 마네킹 본(SkinnedMesh.skeleton.bones)에 옷 메쉬 attach

### `src/components/three/Scene.tsx`
- R3F Canvas + 라이팅 + 환경 + 컨트롤을 한 곳에 모음
- `next/dynamic`으로 SSR 비활성화 (Three.js는 브라우저 전용)

## 체형 → 렌더링 매핑 (Phase 1)

현재 임시 마네킹은 단순 비례 스케일:

```
heightScale = body.height / 170
weightFactor = 1 + (body.weight - 65) / 200

torsoWidth = 0.22 * heightScale * body.shoulder * weightFactor
hipWidth   = 0.21 * heightScale * body.hips * weightFactor
legLength  = 0.84 * heightScale * body.legLength
...
```

**한계**: 단순 박스 스케일이라 비현실적. .glb 마네킹 + morph target으로 교체 필요.

## 미래 통합 지점

| Phase | 추가될 파일 | 비고 |
|-------|-------------|------|
| 1 후반 | `src/components/three/MannequinGLB.tsx` | 실제 .glb 로딩 + morph target |
| 2 | `src/components/three/ClothingLayer.tsx` | 옷 메쉬 + 스키닝 |
| 2 | `src/components/ui/ClothingPicker.tsx` | 옷 선택 그리드 |
| 3 | `src/app/api/generate-clothing/route.ts` | AI 호출 백엔드 |
| 3 | `src/lib/ai-clothing.ts` | Replicate/HF 클라이언트 |
| 4 | `src/app/api/body-from-photo/route.ts` | 사진 → 체형 추정 |

## 성능 고려

- **3D는 무겁다**: Mannequin은 useMemo로 계산 캐싱
- **dynamic import**: Three.js 번들이 크니까 `next/dynamic` + `ssr: false`
- **Suspense**: 모델 로딩 중 fallback 표시
- **HDR 환경**: drei `Environment preset="studio"`로 시작, 추후 자체 HDR 파일로 교체 가능
