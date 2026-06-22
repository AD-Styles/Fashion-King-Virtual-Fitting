# 내일은패션왕

가상 마네킹에 옷을 입혀보고 360도 돌려보는 패션 시뮬레이터.

> **컨셉**: 내 몸 → 가상 마네킹 → 옷 입혀보기 → 빙 돌려보기

## 핵심 기능 (계획)

1. **체형 커스터마이징** — 키, 몸무게, 어깨/허리/엉덩이 등을 슬라이더로 조정해 내 몸과 비슷한 마네킹 생성
2. **옷 입히기** — 다양한 옷을 마네킹에 입혀서 미리보기
3. **360° 회전** — 빙 돌려가며 앞/옆/뒤 모습 확인
4. **(추후) AI 기반 옷 생성** — 옷 사진을 업로드하면 자동으로 마네킹에 입혀줌

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript**
- **Three.js** + **React Three Fiber** + **Drei** (3D 렌더링)
- **Zustand** (상태 관리)
- **Tailwind CSS** (스타일)

자세한 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md) 참고.

## 빠른 시작

```bash
cd ~/내일은패션왕
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## 현재 상태

**Phase 1 — 체형 커스터마이징** (진행 중)
- ✅ 프로젝트 셋업 (Next.js + R3F)
- ✅ 임시 프리미티브 마네킹 (Cylinder/Box 조합)
- ✅ 체형 조정 슬라이더 (7개 파라미터)
- ✅ 360° 회전 (OrbitControls + autoRotate)
- ⬜ 실제 .glb 마네킹 모델로 교체
- ⬜ Morph target 기반 정교한 체형 조정

전체 로드맵은 [ROADMAP.md](./ROADMAP.md) 참고.

## 디렉토리 구조

```
내일은패션왕/
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/
│   │   ├── three/            # 3D 컴포넌트 (Scene, Mannequin, Lighting)
│   │   └── ui/               # 일반 UI (BodyShapePanel)
│   ├── lib/                  # Zustand 스토어, 유틸
│   ├── hooks/                # 커스텀 훅
│   └── types/                # 공통 타입
├── public/
│   ├── models/               # .glb 마네킹/옷 모델 (gitignore)
│   ├── hdri/                 # 환경 조명
│   └── textures/
├── docs/                     # 페이즈별 설계 노트
├── README.md
├── ROADMAP.md
├── ARCHITECTURE.md
└── CLAUDE.md                 # Claude Code 작업 가이드
```

## 문서

- [ROADMAP.md](./ROADMAP.md) — Phase 1~4 마일스톤
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 기술 스택, 데이터 흐름
- [docs/BODY-CUSTOMIZATION.md](./docs/BODY-CUSTOMIZATION.md) — Phase 1 설계 노트
- [docs/CLOTHING-SYSTEM.md](./docs/CLOTHING-SYSTEM.md) — Phase 2 설계 노트
- [docs/AI-INTEGRATION.md](./docs/AI-INTEGRATION.md) — Phase 3 설계 노트
