import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const institution = String(body?.institution ?? "").trim();
  const description = String(body?.description ?? "").trim();

  if (!title || !institution || !description) {
    return NextResponse.json(
      { error: "Completá título, institución y descripción." },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(credentials)
    .set({
      icon: body?.icon ? String(body.icon) : "🎓",
      title,
      institution,
      description,
      highlight: Boolean(body?.highlight),
      order:
        body?.order !== undefined && body?.order !== null
          ? Number(body.order)
          : undefined,
    })
    .where(eq(credentials.id, parsed))
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

  await db.delete(credentials).where(eq(credentials.id, parsed));
  return NextResponse.json({ ok: true });
}
