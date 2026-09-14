import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  saveUpload,
  storageMode,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo." },
      { status: 400 },
    );
  }

  if (file.type && !(file.type in ALLOWED_IMAGE_TYPES)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usá JPG, PNG, WebP, GIF, SVG o AVIF." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera los 5 MB." },
      { status: 400 },
    );
  }

  try {
    const stored = await saveUpload({
      fileName: file.name || "imagen",
      contentType: file.type || "application/octet-stream",
      buffer,
    });
    return NextResponse.json({
      url: stored.url,
      name: stored.name,
      storage: stored.storage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la imagen.",
        storage: storageMode(),
      },
      { status: 500 },
    );
  }
}
