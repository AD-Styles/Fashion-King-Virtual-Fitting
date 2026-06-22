import { NextRequest, NextResponse } from "next/server";

// 퍼스널컬러 분석은 IDM-VTON 과 같은 Python 서버(포트 8000)의 /personal-color 가 처리.
const IDM_VTON_URL = process.env.IDM_VTON_URL || "http://localhost:8000";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        { error: "image is required (multipart 'image' field)" },
        { status: 400 },
      );
    }

    const forward = new FormData();
    forward.append("image", image, image.name || "face.png");

    const upstream = await fetch(`${IDM_VTON_URL}/personal-color`, {
      method: "POST",
      body: forward,
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: `personal-color server returned ${upstream.status}`,
          detail: data?.detail ?? data,
        },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "personal-color proxy failed", detail: message },
      { status: 500 },
    );
  }
}
