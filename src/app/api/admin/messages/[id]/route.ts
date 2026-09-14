import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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
  const isRead = Boolean(body?.isRead);

  const [updated] = await db
    .update(messages)
    .set({ isRead })
    .where(eq(messages.id, parsed))
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

  await db.delete(messages).where(eq(messages.id, parsed));
  return NextResponse.json({ ok: true });
}
