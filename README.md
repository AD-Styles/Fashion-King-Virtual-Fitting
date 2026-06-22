# 👗 내일은 패션왕 (Fashion King) — 360° 가상 피팅 & AI 색상 추천

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=threedotjs&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-black?style=flat&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-005CED?style=flat&logo=onnx&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=flat&logo=google&logoColor=white)

> **NVIDIA AI ACADEMY 팀 프로젝트 · 팀 포테토(Team Potato)**
> 가상 마네킹에 옷을 입혀 360°로 돌려보고, AI가 어울리는 색을 추천하는 웹 패션 시뮬레이터.

**컨셉:** 내 체형 → 가상 마네킹 → 옷 입혀보기 → 360° 회전 → 🎨 AI 색상 추천

---

## 🎯 프로젝트 개요

> "입어보지 못하고 사는 일"을 줄이기 위해, 웹에서 내 체형과 비슷한 3D 마네킹에 옷을 입혀보고
> AI가 옷 색에 어울리는 코디 색을 추천하는 시스템.

| # | 기능 | 설명 |
|---|------|------|
| 1 | **체형 커스터마이징** | 키·어깨·허리·엉덩이 등 7개 파라미터를 슬라이더로 조정해 내 몸과 비슷한 마네킹 생성 |
| 2 | **옷 입히기** | 다양한 의류 `.glb` 모델을 마네킹에 부착해 미리보기 |
| 3 | **360° 회전** | OrbitControls + 자동 회전으로 앞·옆·뒤 확인 |
| 4 | **🎨 AI 색상 추천** | 옷 이미지에서 대표 색을 추출하고, 색상 조화 이론으로 어울리는 코디 색을 추천 |
| 5 | **퍼스널 컬러 진단** | 얼굴 사진에서 웜/쿨톤을 분류 (ResNet18 → ONNX 추론) |

---

## 🧑‍💻 나의 담당 — 2D 색상 추천 시스템 (김도윤)

이 저장소의 **`personal_color/`** 모듈은 제가 전담한 부분입니다.

- **색상 추출** — 옷 이미지 → 배경 제거 → **LAB 색공간 KMeans 클러스터링**으로 대표 색 팔레트 추출
- **추천 엔진** — 추출한 색(HSV Hue) → **색상 조화 이론**(보색·유사색 등)으로 어울리는 다른 카테고리 옷 색 추천
- **퍼스널 컬러 분류** — 얼굴 사진 → **MediaPipe 얼굴 크롭** → **ResNet18(ONNX) 추론**으로 웜/쿨톤 진단
- **API & 연동** — **FastAPI** 추천 엔드포인트 + Next.js 프론트 연동 컴포넌트

> 설계 의도와 인터페이스는 [`내일은 패션왕 - 2D 색상추천 시스템 설계서.md`](./내일은%20패션왕%20-%202D%20색상추천%20시스템%20설계서.md)에 정리되어 있습니다.

---

## 🏗️ 시스템 구성

두 개의 모듈로 구성됩니다.

### 1) `내일은패션왕/` — 3D 가상 피팅 웹앱

Next.js 14 + Three.js / React Three Fiber 기반. 체형 슬라이더 → 마네킹 실시간 변형 → 옷 부착 → 360° 회전.

```
[BodyShapePanel UI]
        │ (슬라이더 onChange)
        ▼
[Zustand store]  (bodyShape, currentOutfit, autoRotate)
        │ (구독)
        ▼
[Mannequin.tsx → ClothingLayer]
        │
        ▼
[R3F Canvas]  (실시간 60fps 리렌더)
```

### 2) `personal_color/` — AI 색상 추천 / 퍼스널 컬러 (담당: 김도윤)

Python(ML) + FastAPI(서버) + TypeScript(프론트 연동).

| 모듈 | 입력 | 처리 | 출력 |
|------|------|------|------|
| **① 색상 추출** | 옷 이미지 | 배경 제거 → LAB KMeans | 대표 색 팔레트 (hex + 비율) |
| **② 추천 엔진** | 대표 색 + 대상 카테고리 | HSV Hue 색상 조화 규칙 | 추천 색 리스트 (hex + 조화유형 + 사유) |
| **③ 퍼스널 컬러** | 얼굴 사진 | MediaPipe 크롭 → ResNet18(ONNX) | 웜/쿨톤 + 톤 |
| **④ API** | ①②③ | FastAPI 라우팅 | JSON 응답 |

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| 3D 웹앱 | Next.js 14 (App Router) · TypeScript · Three.js · React Three Fiber · @react-three/drei · Zustand · Tailwind CSS |
| 색상/AI | Python · PyTorch(학습) · ONNX Runtime(추론) · MediaPipe · NumPy · Pillow · scikit-learn(KMeans) |
| 서버 | FastAPI · Uvicorn |

---

## 🚀 빠른 시작

### 3D 가상 피팅 웹앱

```bash
cd 내일은패션왕
npm install
npm run dev          # http://localhost:3000
```

### 색상 추천 / 퍼스널 컬러 서버

```bash
cd personal_color/server
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

> ⚠️ `.glb` 의류 모델, 퍼스널 컬러 `ResNet18(.onnx)` 가중치, MediaPipe `.task` 등 **대용량 에셋은 용량·라이선스 문제로 저장소에서 제외**되어 있습니다. 모델 디스크립터(`*.json`)와 학습/추론 코드는 포함됩니다.

---

## 📂 디렉토리 구조

```
.
├── 내일은패션왕/                    # 3D 가상 피팅 웹앱 (Next.js + R3F)
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   ├── components/three|ui/     # 3D · UI 컴포넌트
│   │   ├── lib/  hooks/  types/
│   ├── public/models/               # .glb 마네킹·의류 (gitignore)
│   ├── docs/                        # 페이즈별 설계 노트
│   ├── ARCHITECTURE.md · PIPELINE.md · ROADMAP.md
│   └── README.md
├── personal_color/                  # 🎨 2D 색상 추천 / 퍼스널 컬러 (담당: 김도윤)
│   ├── ml/personal-color/           # 색상 추출·추천·퍼스널컬러 학습/추론 (Python)
│   ├── server/                      # FastAPI 추천 API
│   └── src/                         # 프론트 연동 (color harmony, store)
├── 내일은 패션왕 - 2D 색상추천 시스템 설계서.md
├── 내일은 패션왕 - 계획서.pdf
├── 내일은 패션왕 발표대본.hwpx
└── 팀 포테토(피피티)_아이콘수정.pptx   # 발표 자료
```

---

## 📑 문서

- [2D 색상 추천 시스템 설계서](./내일은%20패션왕%20-%202D%20색상추천%20시스템%20설계서.md) — 색상 추천 모듈 상세 설계 (담당: 김도윤)
- [내일은패션왕/ROADMAP.md](./내일은패션왕/ROADMAP.md) — Phase 1~4 마일스톤
- [내일은패션왕/ARCHITECTURE.md](./내일은패션왕/ARCHITECTURE.md) — 3D 앱 기술 스택·데이터 흐름
- 계획서(`.pdf`) · 발표 자료(`.pptx`) · 발표 대본(`.hwpx`)

---

## 👥 팀 포테토 (Team Potato)

| 팀원 | 담당 |
|------|------|
| **김도윤** | **2D 색상 추천 시스템 (색상 추출 · 추천 엔진 · 퍼스널 컬러)** |
| 박찬영 | 옷 착용 (의류 부착) |
| 오필립 | 체형 3D (마네킹·체형 변형) |
| 이은석 | Vision / 통합 (AI 옷 생성·합성) |
| 담당강사 | 이자룡 |

> NVIDIA AI ACADEMY 9기 팀 프로젝트
