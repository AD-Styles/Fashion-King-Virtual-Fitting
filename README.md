# 👗👔👟👠 내일은 패션왕 (Fashion King) — 360° 가상 피팅 & AI 색상 추천 팀 프로젝트.
**컨셉:** 내 체형 → 가상 마네킹 → 옷 입혀보기 → 360° 회전 → 🎨 AI 색상 추천

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=threedotjs&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-black?style=flat&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-005CED?style=flat&logo=onnx&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=flat&logo=google&logoColor=white)

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

### 2) `personal_color/` — AI 색상 추천 / 퍼스널 컬러

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
├── personal_color/                  # 🎨 2D 색상 추천 / 퍼스널 컬러
│   ├── ml/personal-color/           # 색상 추출·추천·퍼스널컬러 학습/추론 (Python)
│   ├── server/                      # FastAPI 추천 API
│   └── src/                         # 프론트 연동 (color harmony, store)
├── 내일은 패션왕 - 2D 색상추천 시스템 설계서.md
├── 내일은 패션왕 - 계획서.pdf
├── 내일은 패션왕 발표대본.hwpx
└── 팀 포테토(피피티)_아이콘수정.pptx   # 발표 자료
```

---

## 📊 주요 결과 분석

### 1. 퍼스널컬러 CNN 모델 완성 및 검증

**ResNet18 기반 3축 회귀 모델로 12 타입 자동 분류 달성.** 학습 파이프라인(train.py)은 FairFace 코퍼스에서 224×224 얼굴 이미지를 입력으로 하여 warmcool/value/clarity 3축을 연속값으로 회귀하는 CNN을 구축. 검증셋(약 20%)에서 시즌 정확도 90.4%, 타입 정확도 79.5% 달성(규칙 라벨 재현율 기준). 축 평균절대오차는 warmcool=0.1776, value=0.1371, clarity=0.2683으로 측정됨. 이는 의사라벨 품질이 모델의 성능 상한이 된다는 원칙을 따르며, 규칙 설계와 코퍼스 통계 보정의 중요성을 검증.

### 2. 2-pass 부트스트랩 라벨링 및 색공간 정규화

**FairFace 자동 라벨링 파이프라인으로 인구통계 편향 보정.** label_dataset.py는 SegFormer 얼굴 세그멘테이션으로 피부/머리/눈 색을 추출하고, rules.py의 규칙 분류기로 의사라벨을 생성. 핵심은 2-pass 구조로, Pass 1에서 다양한 피부색 표본을 확보한 후 Pass 2에서 전체 코퍼스의 피부/머리 색 중앙값으로 규칙의 중립점(B_NEUTRAL, L_NEUTRAL, CONTRAST_NEUTRAL, CHROMA_NEUTRAL)을 재설정. CIELab 색공간 변환(D65 백색점)을 전역 사용하여 지각적 거리의 안정성을 보장하며, color_utils.py에서 ITA 도(피부 밝기/언더톤 지표)와 chroma 계산도 제공함.

### 3. ONNX 배포 경량화 및 학습-추론 분포 일치

**torch 불필요한 경량 추론 서버 구현.** export.py는 학습된 .pt 모델을 ONNX로 내보내며 사이드카 JSON에 메타정보(정규화 파라미터, 축 순서, 검증 지표)를 저장. personal_color.py는 onnxruntime만으로 ONNX 모델을 추론하며, mediapipe FaceLandmarker로 얼굴을 bbox 1.25배 정사각 크롭하여 학습 분포와 일치시킴(분포 불일치 방지). 얼굴 미검출 시 중앙 정사각 크롭으로 폴백하고 face_detected 플래그를 사용자에게 반환. FastAPI 서버(server.py)는 POST /personal-color 엔드포인트로 multipart 이미지를 받아 분류 결과(type/season/axes/palette/confidence)를 JSON으로 반환.

### 4. CIELab 거리 기반 색조화도 계산 및 의류 추천 필터링

**지각적 색거리(ΔE76) 오름차순 정렬로 실시간 추천.** colorHarmony.ts는 프론트엔드에서 순수 함수로 sRGB ↔ Lab 변환을 제공하며, 시즌 팔레트(7색 hex 배열)와 등록된 옷의 색을 ΔE76으로 비교한다. rankOutfitsByPalette()는 각 옷을 가장 가까운 팔레트 색까지의 거리로 순정렬하고, harmonyLabel()은 ΔE 임계값(좋음<12, 무난<28, 덜어울림≥28)으로 사용자 가독 라벨을 생성한다. PersonalColorPanel.tsx는 이 결과를 카테고리별로 필터링하여 추천/미추천 옷을 분리 표시한다.

### 5. 12 타입 분류 체계 및 4시즌 팔레트 제공

**웜쿨/밝기/선명도 3축 → 4시즌 12타입 → 의류 색상 팔레트 매핑.** taxonomy.py는 3개의 연속축을 4사분면(봄=웜라이트, 여름=쿨라이트, 가을=웜딥, 겨울=쿨딥)으로 먼저 분류하고, STRONG=0.6 임계값으로 각 축의 강도를 판단하여 세부 타입(light/true/bright 또는 soft/true/deep)을 결정. 각 12 타입마다 패션 코디용 hex 7색 팔레트를 정의했으며(예: 봄 라이트 #F8D7BE 등), 규칙.py에서 신뢰도=tanh(min(|warmcool|,|value|))로 경계선 케이스 불확실도를 표현.

### 6. 학습 파이프라인 검증 및 회귀 테스트

**selftest.py와 features_selftest.py로 무데이터셋 검증.** selftest.py는 합성 4사분면(웜라이트/쿨라이트/웜딥/쿨딥) 색 입력으로 타입/시즌 파이프라인을 검증하며, GPU나 실제 이미지 코퍼스 없이 수행됨. features_selftest.py는 representative_rgb의 이상치 거부(Lab L* 극단값 drop_frac=0.2 비율 제거) 로직을 검증하며 피부색, 반사광, 그림자 등 다양한 입력에 대한 안정성을 확인. export.py는 검증셋에서 시즌 혼동행렬(4×4)을 출력하여 모델이 어느 시즌을 헷갈리는지 시각화하고, 파생 시즌/타입 정확도를 규칙 라벨 재현율로 계산.

### 7. 팀 병렬 개발 인터페이스 및 문서화

**설계서 및 ARCHITECTURE/PIPELINE 문서로 팀원 연동 명시.** 2D 색상추천 시스템 설계서는 MVP 범위, 모듈 분해, API 스펙, 일정, 품질 목표를 코드 작성 이전에 확정하였고, 의류 부착/체형 3D/Vision&AI 와의 연동 지점을 명확히함. ARCHITECTURE.md와 PIPELINE.md는 Phase별 진행상황(Phase 0-2C 87.5% 완료), 각 컴포넌트의 책임, 설계 메모(색 증강 제외, 기하 증강만 사용, 학습 프레이밍 일치 등)를 기록. 이는 코드 통합 및 검증 과정을 체계화하고 향후 유지보수성을 높임.

---

## 💡 회고록 (Retrospective)

처음 이 프로젝트에 참여했을 때, 옷 이미지에서 색을 뽑고 어울리는 색을 찾으면 되겠지 라는 생각으로 "색상 추천 시스템"을 단순하게 생각했습니다. 하지만 실제로 구현하면서 몇 가지 핵심 난관을 마주했습니다.

첫 번째는 **색공간 선택**이었습니다. RGB에서 직접 색상 거리를 계산하면 인간의 색 지각과 맞지 않습니다. 예를 들어 (255,0,0) 빨강과 (0,255,0) 초록 사이의 거리는 (255,0,0)과 (200,0,0) 진한 빨강 사이의 거리와 같이 계산되지만, 실제로 눈으로 보면 후자가 훨씬 비슷합니다. CIELab 색공간으로 전환하고 ΔE76을 사용하면서 이 문제를 해결했고, 이를 파이썬(color_utils.py)과 타입스크립트(colorHarmony.ts) 양쪽에 일관되게 적용했습니다.

두 번째는 **의사라벨 품질**입니다. 처음엔 FairFace 데이터셋 전체에 단일 규칙을 적용했는데, 인구통계별 피부색 편차가 컸습니다. 동양인의 피부는 유럽인보다 황색도(Lab b*)가 높고 명도(L*)도 다릅니다. 결국 2-pass 부트스트랩 라벨링을 설계했습니다. 먼저 다양한 피부색을 확보한 후, 코퍼스의 중앙값으로 규칙의 중립점을 재설정하는 방식입니다. 이를 통해 CNN 모델의 성능 상한을 결정하는 의사라벨의 품질을 크게 높일 수 있었습니다.

세 번째는 **배포 경량화와 학습-추론 분포 일치**였습니다. 학습 파이프라인은 torch와 transformers를 사용하지만, 실제 서버에선 이 무거운 의존성을 빼고 싶었습니다. ONNX 내보내기(export.py)와 onnxruntime 추론(personal_color.py)으로 해결했습니다. 더 중요한 것은 얼굴 크롭 로직을 학습과 추론에서 **정확히 동일하게** 구현하는 것입니다. predict.py와 personal_color.py가 mediapipe bbox에 1.25배 패딩을 적용해 정사각 크롭하는 방식이 일치해야만 정확도가 보장됩니다. 이것이 없으면 분포 불일치로 추론 성능이 급락합니다.

네 번째는 **팀 병렬 개발의 인터페이스 정의**입니다. 2D 색상추천, 3D 마네킹, 의류 부착, Vision/AI 을 통합할 때마다 충돌이 생겼습니다. 해결책은 **사전 설계서**였습니다. MVP 범위, 모듈 분해, API 스펙, 데이터 포맷을 코드 작성 전에 합의하니 훨씬 수월했습니다. 예를 들어 추천 결과의 JSON 구조(type/season/axes/palette/confidence)를 미리 정의하고, 프론트엔드에서 어떤 필드를 사용할지 명확히 하는 식입니다.

이 과정에서 가장 큰 배움은 **기술과 실무가 다르다**는 것입니다. 저는 경영학을 전공하고 패션 의류 업계에서 7년간 상품기획·영업을 해 온 사람이지만, 이 프로젝트에서는 이미지 처리, 머신러닝 모델링, 시스템 아키텍처를 직접 다뤄야 했습니다. 오히려 "어떤 색이 사람에게 어울리는가"라는 질문은 제가 현업에서 늘 마주하던 문제였기에, 그 감각을 규칙과 모델, 코드로 옮기는 과정이 특별하게 다가왔습니다. NVIDIA AI ACADEMY 과정을 통해 이론적 기초를 얻었고, 실제 코드 작성으로 그것을 체화했습니다. 특히 색공간 변환 같은 수학 개념이 왜 중요한지, 의사라벨의 품질이 모델 성능을 결정한다는 사실이, 추상적인 강의 내용이 아닌 구체적인 코드에서 검증될 때의 경험은 무엇과도 바꿀 수 없었습니다.

앞으로 이 시스템을 더 발전시킬 계획입니다. 현재는 얼굴 사진으로 퍼스널컬러를 판정하고, 시즌 팔레트를 기준으로 옷을 추천합니다. 다음 단계로는 사용자의 실제 의류 데이터베이스와 연동하고, 계절 변화나 트렌드를 반영하는 추천으로 확장하고 싶습니다. 또한 현재 단순 휴리스틱인 신뢰도 지표를 베이지안 불확실도로 개선하거나, STRONG=0.6 같은 임계값을 코퍼스 통계로 최적화하는 것도 계획 중입니다.
