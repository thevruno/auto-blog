import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { validateImageUpload } from "@/lib/image-file";
import { rateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";
import { clientIp, crossOriginResponse, isSameOrigin } from "@/lib/security";
import { MAX_UPLOAD_BYTES, saveUpload, storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Subidas permitidas por cuenta y minuto. */
const UPLOAD_LIMIT = { limit: 30, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossOriginResponse();

  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limit = rateLimit(
    `upload:${session.userId}:${clientIp(req)}`,
    UPLOAD_LIMIT,
  );
  if (!limit.ok) {
    return tooManyRequestsResponse(
      limit.retryAfterSeconds,
      "Subiste demasiadas imágenes seguidas. Esperá un momento.",
    );
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `La imagen supera los ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // El formato se decide por los bytes del archivo: el nombre y el
  // Content-Type que manda el navegador no son de confianza.
  const validation = validateImageUpload(
    { name: file.name, declaredType: file.type, size: file.size },
    buffer,
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const stored = await saveUpload({
      fileName: file.name || "imagen",
      contentType: validation.contentType,
      buffer,
    });
    return NextResponse.json({
      url: stored.url,
      name: stored.name,
      storage: stored.storage,
      type: validation.contentType,
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
