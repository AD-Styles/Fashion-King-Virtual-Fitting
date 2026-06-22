import { NextRequest, NextResponse } from "next/server";

const IDM_VTON_URL = process.env.IDM_VTON_URL || "http://localhost:8000";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const person = formData.get("person");
    const garment = formData.get("garment");
    const prompt = formData.get("prompt");

    if (!person || !(person instanceof File)) {
      return NextResponse.json(
        { error: "person image is required (multipart 'person' field)" },
        { status: 400 },
      );
    }

    const forward = new FormData();
    forward.append("person", person, person.name);
    if (garment instanceof File) {
      forward.append("garment", garment, garment.name);
    }
    if (typeof prompt === "string" && prompt.length > 0) {
      forward.append("prompt", prompt);
    }

    const upstream = await fetch(`${IDM_VTON_URL}/infer`, {
      method: "POST",
      body: forward,
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: `IDM-VTON server returned ${upstream.status}`,
          detail: errorText.slice(0, 500),
        },
        { status: upstream.status },
      );
    }

    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "IDM-VTON proxy failed", detail: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const upstream = await fetch(`${IDM_VTON_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: `upstream ${upstream.status}` },
        { status: 502 },
      );
    }
    const data = await upstream.json();
    return NextResponse.json({ ok: true, upstream: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "IDM-VTON server unreachable", detail: message },
      { status: 503 },
    );
  }
}
