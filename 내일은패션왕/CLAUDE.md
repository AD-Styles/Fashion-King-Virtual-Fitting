# Claude Code 작업 가이드

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 한 줄 요약

가상 마네킹에 옷 입혀보고 360도 돌려보는 웹앱. Next.js 14 + Three.js (R3F).

## 자주 쓰는 명령

```bash
npm run dev        # 개발 서버 (localhost:3000)
npm run build      # 프로덕션 빌드
npm run typecheck  # tsc 타입 체크 (no emit)
npm run lint       # Next ESLint
```

## 코딩 컨벤션

- **클라이언트 컴포넌트는 명시적으로**: 파일 최상단에 `"use client"`. R3F를 쓰는 모든 컴포넌트는 클라이언트.
- **3D는 항상 SSR 비활성**: 페이지에서 Scene을 임포트할 때 `next/dynamic({ ssr: false })`.
- **상태는 Zustand**: 전역 상태는 `src/lib/store.ts`의 `useAppStore`. 컴포넌트 내부 상태는 React `useState`.
- **타입 우선**: 새 데이터 모델은 먼저 `src/types/`에 추가. 임시 타입은 컴포넌트 파일 안에 두지만, 두 곳 이상에서 쓰이면 옮길 것.
- **3D 컴포넌트는 `components/three/`**: R3F를 쓰는 컴포넌트(`<Canvas>` 안에서만 동작하는 것)는 여기. 일반 React UI는 `components/ui/`.
- **경로 별칭**: `@/*` → `src/*` (예: `@/lib/store`, `@/types`)

## 단위와 좌표계

- **공간 단위**: Three.js 기본 = 1 unit ≈ 1 meter. 마네킹 키 170cm = Y 1.7 정도.
- **체형 파라미터**:
  - `height`: cm (140~200)
  - `weight`: kg (40~120)
  - `shoulder/chest/waist/hips/legLength`: 1.0이 기본 비율 (0.8~1.3)
- **카메라**: Y축 위. 마네킹 발은 Y=0, 머리는 Y≈1.7. 카메라는 `[0, 1.4, 3.2]`에서 시작.

## 자주 만나는 함정

- **R3F는 SSR에서 터진다**: `window`/`document` 접근. 페이지에서 직접 임포트하지 말고 항상 `dynamic`.
- **GLB 로딩**: `useGLTF`는 Suspense 필요. Scene에서 이미 감싸뒀음.
- **상태 변화 → 리렌더**: Zustand selector를 좁게 쓸 것. `useAppStore((s) => s.bodyShape.height)`가 `useAppStore((s) => s.bodyShape)`보다 나음 (특정 필드만 바뀔 때 다른 컴포넌트 리렌더 방지).
- **shadow는 비싸다**: `castShadow`/`receiveShadow`는 필요한 메쉬에만. shadow-mapSize는 2048 이상으로 올리지 말 것.

## 작업할 때 우선순위

1. **Phase 1 마네킹 완성도 ↑** — 실제 .glb 모델로 교체가 가장 큰 임팩트
2. **Phase 2 옷 시스템 시작** — 옷 .glb + 마네킹 본 매칭
3. AI 통합은 Phase 1/2가 안정된 후
4. 모바일 대응은 데스크톱 MVP 이후

## 파일 위치 빠른 참조

- 메인 페이지: `src/app/page.tsx`
- 3D 씬: `src/components/three/Scene.tsx`
- 마네킹: `src/components/three/Mannequin.tsx`  ← 체형 → 메쉬 매핑 로직
- 체형 UI: `src/components/ui/BodyShapePanel.tsx`
- 전역 상태: `src/lib/store.ts`
- 타입: `src/types/index.ts`

## 외부 의존성 메모

- 마네킹 .glb 소스 후보: Mixamo (CC0), Sketchfab CC0, Ready Player Me API, VRoid (VRM)
- 옷 .glb 소스: 자체 제작(Blender) 또는 Sketchfab/CGTrader 구매
- AI 옷 생성 후보 모델: TripoSR (Stability), Wonder3D, IDM-VTON (2D 합성)
