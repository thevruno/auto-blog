import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const TYPES = ["video", "article", "podcast"];
const STATUSES = ["published", "draft"];

type Params = { params: Promise<{ id: string }> };

function parseDate(raw: unknown): Date | null {
  if (raw && typeof raw === "string" && raw.length > 0) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.id, parsed))
    .limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ item: rows[0] });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.id, parsed))
    .limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const source = String(body?.source ?? "").trim();
  const type = String(body?.type ?? "");

  if (!title || !source || !TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Completá título, fuente/medio y tipo." },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(mediaItems)
    .set({
      title,
      type,
      source,
      publishedAt: parseDate(body?.publishedAt),
      url: body?.url ? String(body.url) : null,
      embedUrl: body?.embedUrl ? String(body.embedUrl) : null,
      thumbnail: body?.thumbnail ? String(body.thumbnail) : null,
      thumbnailAlt: body?.thumbnailAlt ? String(body.thumbnailAlt) : null,
      description: body?.description ? String(body.description) : null,
      status: STATUSES.includes(String(body?.status))
        ? String(body.status)
        : existing[0].status,
      updatedAt: new Date(),
    })
    .where(eq(mediaItems.id, parsed))
    .returning();

  return NextResponse.json({ item: updated });
}

/** Cambio rápido de estado desde el listado: publicar u ocultar. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Estado inválido: usá published o draft." },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(mediaItems)
    .set({ status, updatedAt: new Date() })
    .where(eq(mediaItems.id, parsed))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  await db.delete(mediaItems).where(eq(mediaItems.id, parsed));
  return NextResponse.json({ ok: true });
}
