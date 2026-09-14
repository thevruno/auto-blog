import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryTopics } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { normalizeProviders } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body?.label === "string" && body.label.trim()) {
    patch.label = body.label.trim().slice(0, 120);
  }
  if (typeof body?.query === "string" && body.query.trim()) {
    patch.query = body.query.trim().slice(0, 200);
  }
  if (body?.isActive !== undefined) patch.isActive = Boolean(body.isActive);
  if (body?.strict !== undefined) patch.strictMatch = Boolean(body.strict);
  if (body?.isPrimary !== undefined) patch.isPrimary = Boolean(body.isPrimary);
  if (Array.isArray(body?.providers)) {
    patch.providers = normalizeProviders(body.providers);
  }

  await ensureSchema();
  const [topic] = await db
    .update(discoveryTopics)
    .set(patch)
    .where(eq(discoveryTopics.id, topicId))
    .returning();

  if (!topic) {
    return NextResponse.json({ error: "Tema no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ topic });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isInteger(topicId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await ensureSchema();
  // Los hallazgos ya guardados se conservan (topicId pasa a null).
  await db.delete(discoveryTopics).where(eq(discoveryTopics.id, topicId));
  return NextResponse.json({ ok: true });
}
