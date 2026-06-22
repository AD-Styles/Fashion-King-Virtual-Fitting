# 내일은패션왕 — 파이프라인 (팀 공유용)

> **한 줄 정의**: 마네킹에 옷을 입혀 360° 돌려보거나, 사용자 사진과 옷을 AI로 합성하는 **듀얼 모드 가상 피팅 시스템**.

---

## 핵심 컨셉 — 듀얼 모드

```
                        [내일은패션왕 웹앱]
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
      [3D 모드]                                [AI 합성 모드]
      Three.js 마네킹                          IDM-VTON (Stable Diffusion)
      옷 자동 fit                              사람 사진 + 옷 → 합성
      360° 회전 가능                           정면 단일 각도, 사실적
      실시간 60fps                             추론 5~30초
```

두 모드는 **보완적**. 3D는 회전 가능하지만 옷 fit 한계, AI는 사실적이지만 360° X.

---

## 시스템 아키텍처

```
┌─────────────── 사용자 노트북 (Windows + WSL Ubuntu 24.04) ───────────────┐
│                                                                          │
│  ┌──────────────────────────┐         ┌──────────────────────────┐       │
│  │ Next.js 14 (port 3000)   │         │ 마네킹/옷 .glb 모델      │       │
│  │  ├─ /app/page.tsx        │ ──────▶ │  public/models/          │       │
│  │  │   3D 모드/AI 모드 탭  │  serve  │  └─ clothing/ (10+벌)   │       │
│  │  ├─ /components/three/   │         │                          │       │
│  │  │   Scene, Mannequin,   │         └──────────────────────────┘       │
│  │  │   ClothingLayer       │                                            │
│  │  ├─ /components/ui/      │         ┌──────────────────────────┐       │
│  │  │   AiSynthesisMode     │ ──HTTP─▶│ /api/idm-vton            │       │
│  │  └─ Zustand store        │         │  (Next 프록시)           │       │
│  └──────────────────────────┘         └─────────────┬────────────┘       │
│                                                     │                    │
└─────────────────────────────────────────────────────┼────────────────────┘
                                                      │ HTTP (LAN)
                                                      ▼
                       ┌── Jetson AGX Xavier 32GB (예정) ──┐
                       │                                   │
                       │  FastAPI 서버 (port 8000)         │
                       │   ├─ /infer  (사람+옷 → PNG)      │
                       │   └─ /health                      │
                       │                                   │
                       │  IDM-VTON (yisol 공식 구현)       │
                       │   ├─ SDXL 커스텀 파이프라인       │
                       │   ├─ Densepose + Humanparsing    │
                       │   │   + Openpose                  │
                       │   └─ 모델 weights ~30GB           │
                       └───────────────────────────────────┘
```

---

## 3D 모드 — 옷 자동 fit 흐름

```
[사용자가 옷 클릭]
    │
    ▼
[useGLTF 로 .glb 로드]
    │
    ▼
[전처리 파이프라인]
    ├─ cloned scene 자체 transform 리셋
    ├─ neutralizeSkinning()     — 옷 자체 본 효과 제거 (T-pose 고정)
    ├─ removeNonClothingParts() — 옷걸이/스탠드/디스플레이 자동 청소
    └─ forceDoubleSide()         — material을 DoubleSide + 불투명 강제
    │
    ▼
[fit 계산]
    ├─ MannequinGLB가 본 거리 측정:
    │   shoulderWidth, torsoHeight, legLength, headSize, footSize
    │   (boneScale로 GLTF self scale까지 정규화)
    │
    └─ ClothingItem이 옷 BoundingBox + measurements로 비비례 scale
        [sx=어깨너비, sy=상체길이*비율, sz=인체깊이 × SURFACE_OFFSET]
    │
    ▼
[anchor 매칭]
    └─ 옷의 top center를 마네킹 본 위치에 정렬
        top/dress → spine,  bottom → hips,
        shoes → leftFoot+rightFoot (양쪽),  accessory → head
    │
    ▼
[본 자식으로 attach]
    └─ createPortal로 R3F 트리 분기, 마네킹 + 옷 같은 좌표계
```

**한계**: 옷의 정점이 마네킹 표면 굴곡을 정확히 따르지 않음 → 매장 디스플레이 수준의 자연스러움은 X. 본 스키닝은 옷이 rigged 되어 있어야 의미가 있어서 보류 (Sketchfab CC0 옷은 보통 non-rigged).

---

## Phase 진행 상황

| Phase | 내용 | 상태 |
|-------|------|------|
| **0. 셋업** | Next.js 14 + R3F + TypeScript + Tailwind + Zustand | ✅ 완료 |
| **1. 임시 마네킹** | Box/Cylinder 인체 + 체형 슬라이더 7종 + 360° 회전 | ✅ 완료 |
| **2A. 실제 .glb 마네킹** | Three.js Xbot 통합, 본 추출, SkinnedMesh 처리 | ✅ 완료 |
| **2B. 옷 .glb 시스템** | Sketchfab CC0 옷 10+벌, 본 attach, 양쪽 발 신발, mutual exclusion | ✅ 완료 |
| **2C. 자동 fit 알고리즘** | 본 측정 정규화, 비비례 scale, anchor 매칭, 옷걸이 자동 제거 | ✅ 완료 |
| **2D. 옷 fit 미세조정** | SURFACE_OFFSET, BODY_DEPTH, DoubleSide, normal 재계산 | ✅ 완료 |
| **3. AI 합성 모드 UI** | 듀얼 모드 탭, 사진 업로드, 결과 표시 컴포넌트 | ✅ 완료 |
| **3A. FastAPI 추론 서버** | server.py, /infer + /health 엔드포인트 | ✅ 완료 |
| **3B. IDM-VTON 통합** | yisol/IDM-VTON 공식 코드 클론 + 환경 구축 | 🔄 진행 중 |
| **3C. Jetson 호스팅** | AGX Xavier 32GB로 추론 분리, LAN HTTP 호출 | ⏳ 다음 |
| **4. 발표 자료** | 데모 영상, 한계+계획 문서화 | ⏳ 예정 |

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | **Next.js 14 (App Router) + TypeScript** | SSR + API 라우트 일원화 |
| 3D 렌더링 | **Three.js + React Three Fiber + Drei** | 가장 성숙한 웹 3D 생태계 |
| 상태 관리 | **Zustand** | R3F와 잘 어울림, 가벼움 |
| 스타일 | **Tailwind CSS** | 빠른 UI 프로토타이핑 |
| AI 추론 | **IDM-VTON (yisol 공식)** | CVPR 2024 SOTA 가상 피팅 |
| AI 인프라 | **Python FastAPI + Jetson AGX Xavier 32GB** | 로컬 호스팅 |
| 호환성 | **PyTorch nightly cu129** | RTX 5060 sm_120 대응 (Jetson은 별도) |

---

## 디렉토리 구조 (핵심만)

```
~/내일은패션왕/                                 # Next.js 웹앱
├── src/
│   ├── app/
│   │   ├── page.tsx                            # 듀얼 모드 탭
│   │   └── api/idm-vton/route.ts               # IDM-VTON 프록시
│   ├── components/
│   │   ├── three/
│   │   │   ├── Scene.tsx                       # R3F Canvas
│   │   │   ├── Mannequin.tsx                   # 임시 마네킹
│   │   │   ├── MannequinGLB.tsx                # 실제 .glb 마네킹
│   │   │   ├── ClothingLayer.tsx               # 본 attach (createPortal)
│   │   │   └── ClothingItem.tsx                # fit 알고리즘 핵심
│   │   └── ui/
│   │       ├── BodyShapePanel.tsx
│   │       ├── ClothingPicker.tsx
│   │       └── AiSynthesisMode.tsx             # 사진 업로드 + 결과
│   ├── lib/
│   │   ├── store.ts                            # Zustand (3D + AI 상태)
│   │   ├── sample-outfits.ts                   # 옷 카탈로그
│   │   └── skinning.ts                         # 본 스키닝 utility (보류)
│   └── types/index.ts                          # BodyShape, Outfit, AppMode
├── public/models/clothing/                     # 10+ .glb 옷
│   ├── shirt-dress.glb                         # 정장 셔츠
│   ├── jacket-casual.glb                       # 캐주얼 재킷
│   ├── jeans-male.glb                          # 남성 청바지
│   ├── sneakers-adidas.glb                     # 아디다스 운동화
│   ├── cap-baseball-ny.glb                     # NY 야구 모자
│   └── ... (기존 5벌)
└── docs/

~/idm-vton/                                     # IDM-VTON Python 서버 (RTX 5060, 보류)
├── server.py                                   # FastAPI
├── infer.py                                    # CLI
├── check_cuda.py                               # GPU 확인
└── venv/                                       # PyTorch nightly cu129

~/idm-vton-official/                            # yisol/IDM-VTON 공식 코드
├── src/                                        # tryon_pipeline, unet_hacked_*
├── gradio_demo/app.py                          # FastAPI로 변환 대상
├── preprocess/                                 # densepose, humanparsing, openpose
└── ckpt/                                       # 모델 weights 저장 위치
```

---

## 시작 명령어

```bash
# 1. Next.js 웹앱 (포트 3000)
cd ~/내일은패션왕
npm install   # 첫 실행 시
npm run dev

# 2. IDM-VTON 서버 (Jetson AGX Xavier에서, SSH)
ssh nvidia@<JETSON_IP>
cd ~/idm-vton-official
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000

# 3. Next.js에서 Jetson IP 연결
# .env.local:
#   IDM_VTON_URL=http://<JETSON_IP>:8000
```

브라우저: `http://localhost:3000` → 좌측 상단 **3D 모드 / AI 합성 모드** 토글

---

## 핵심 디버깅 인사이트 (작업하며 발견)

1. **마네킹 GLTF의 자체 scale 0.01** → 본 worldScale로 measurements 정규화 필요
2. **SkinnedMesh의 binding matrix 캐싱** → 옷 변경 시 부작용, 단순 Mesh로 변환이 안전
3. **옷 .glb에 옷걸이 포함 사례** → mesh 이름 토큰 매칭으로 자동 청소 (`hanger`, `stand`, `display` 등)
4. **비비례 scale + 인체 깊이 보상** → 마네킹 표면 안 박힘
5. **camenduru/IDM-VTON-F16 미완성** (preprocessor_config.json 누락) → 공식 yisol/IDM-VTON로 전환
6. **RTX 5060 sm_120** → PyTorch nightly cu129 필요, 그래도 8GB VRAM 부족 → Jetson AGX 32GB로

---

## 알려진 한계 + 향후 계획

| 한계 | 영향 | 향후 계획 |
|------|------|----------|
| Sketchfab CC0 옷이 마네킹 비례와 정확히 안 맞음 | 매장 수준 자연스러움 X | Marvelous Designer 옷 시뮬 또는 rigged 의류 자체 제작 |
| 본 스키닝 적용 시 binding matrix 부작용 | 옷이 변형 시 위치 어긋남 | 옷이 마네킹과 같은 skeleton일 때만 효과 |
| RTX 5060 8GB VRAM 부족 | IDM-VTON 풀 모델 로컬 OOM | Jetson AGX 32GB로 분리 (진행 중) |
| AI 합성은 단일 각도만 | 360° 회전 X | Multi-view diffusion (SyncDreamer 등) 미래 검토 |

---

## 더 자세한 문서

- [README.md](./README.md) — 프로젝트 개요
- [ROADMAP.md](./ROADMAP.md) — Phase 1~4 마일스톤
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 기술 스택 결정 근거
- [CLAUDE.md](./CLAUDE.md) — Claude Code 작업 가이드
- [docs/BODY-CUSTOMIZATION.md](./docs/BODY-CUSTOMIZATION.md) — Phase 1 설계
- [docs/CLOTHING-SYSTEM.md](./docs/CLOTHING-SYSTEM.md) — Phase 2 설계
- [docs/AI-INTEGRATION.md](./docs/AI-INTEGRATION.md) — Phase 3 설계
