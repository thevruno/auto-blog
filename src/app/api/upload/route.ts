import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

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

  const ext = EXT_BY_TYPE[file.type] ?? ".bin";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "La imagen supera los 5 MB." },
      { status: 400 },
    );
  }

  const name = `${randomBytes(10).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);

  return NextResponse.json({ url: `/api/uploads/${name}`, name });
}
