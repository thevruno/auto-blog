import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sirve las imágenes guardadas en `storage/uploads`.
 *
 * Sólo se sirven las extensiones de la lista blanca. Los SVG que hayan quedado
 * de antes (ya no se aceptan al subir) se entregan como descarga y con una CSP
 * que bloquea scripts, para que no puedan ejecutar código en el dominio.
 */
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const safe = path.basename(file);
  const extension = path.extname(safe).toLowerCase();
  const type = MIME[extension];

  if (!type) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "storage", "uploads", safe);

  try {
    const data = await readFile(filePath);
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (extension === ".svg") {
      headers["Content-Security-Policy"] =
        "default-src 'none'; style-src 'unsafe-inline'; sandbox";
      headers["Content-Disposition"] =
        `attachment; filename="${encodeURIComponent(safe)}"`;
    }

    return new NextResponse(new Uint8Array(data), { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
