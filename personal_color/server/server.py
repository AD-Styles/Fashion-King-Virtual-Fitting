"""내일은패션왕 — IDM-VTON 추론 서버 (FastAPI).

Next.js 프록시(src/app/api/idm-vton/route.ts)가 호출하는 두 엔드포인트만 구현한다:
  GET  /health  -> JSON (백엔드 준비 상태)
  POST /infer   -> multipart(person 필수, garment 선택, prompt) -> 이미지 바이트(PNG)

실제 추론 백엔드는 IDM_VTON_BACKEND 환경변수로 교체한다:
  mock      (기본) GPU 없이 자리표시 이미지를 즉시 반환 — 전체 파이프라인 통합 테스트용
  local     이 머신에서 실제 yisol/IDM-VTON 실행 (목표: Jetson AGX Xavier)
  replicate Replicate 호스팅 API 호출 (로컬 GPU 불필요, 토큰 필요)

실행:
  pip install -r requirements.txt
  IDM_VTON_BACKEND=mock python server.py        # 또는
  IDM_VTON_BACKEND=mock uvicorn server:app --host 0.0.0.0 --port 8000
"""

import os
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from backends import get_backend

app = FastAPI(title="naeil-fashion-king IDM-VTON server", version="0.1.0")

# Next.js(3000)가 다른 호스트(예: Jetson과 분리)에서 호출할 수 있으므로 CORS 허용.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_backend = None
_pc_analyzer = None


def backend():
    """선택된 백엔드를 1회 생성해 캐시한다(지연 초기화)."""
    global _backend
    if _backend is None:
        _backend = get_backend(os.environ.get("IDM_VTON_BACKEND", "mock"))
    return _backend


def personal_color_analyzer():
    """퍼스널컬러 ONNX 분석기를 1회 생성해 캐시한다(지연 초기화).

    torch/transformers 가 아니라 onnxruntime 만 쓰므로 mock VTON 모드와 공존 가능.
    모델/사이드카가 없으면 FileNotFoundError → 엔드포인트가 501 로 보고.
    """
    global _pc_analyzer
    if _pc_analyzer is None:
        from personal_color import PersonalColorAnalyzer
        _pc_analyzer = PersonalColorAnalyzer()
    return _pc_analyzer


@app.get("/health")
def health():
    try:
        return JSONResponse(backend().health())
    except Exception as e:  # 백엔드 초기화 실패도 503으로 보고
        return JSONResponse(
            {"status": "error", "detail": str(e)}, status_code=503
        )


@app.post("/infer")
async def infer(
    person: UploadFile = File(...),
    garment: Optional[UploadFile] = File(None),
    prompt: str = Form(""),
):
    person_bytes = await person.read()
    if not person_bytes:
        raise HTTPException(status_code=400, detail="person image is empty")

    garment_bytes: Optional[bytes] = None
    if garment is not None:
        data = await garment.read()
        garment_bytes = data if data else None

    try:
        png = backend().infer(person_bytes, garment_bytes, prompt or "")
    except NotImplementedError as e:
        # 백엔드는 있으나 아직 설정/구현이 안 된 상태(예: local인데 모델 미설치)
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"inference failed: {e}")

    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/personal-color")
async def personal_color(image: UploadFile = File(...)):
    """얼굴 사진(multipart 'image') -> 퍼스널컬러 분석 JSON.

    반환: {type, type_ko, season, season_ko, axes{...}, palette[...],
           confidence, face_detected}
    """
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="image is empty")
    try:
        result = personal_color_analyzer().analyze_bytes(data)
    except FileNotFoundError as e:
        # ONNX 모델/taxonomy 미배포 — 학습/내보내기 먼저 필요
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"personal-color failed: {e}")

    return JSONResponse(result, headers={"Cache-Control": "no-store"})


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
