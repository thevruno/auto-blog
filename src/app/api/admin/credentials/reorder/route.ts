import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const ids: number[] = Array.isArray(body?.ids)
    ? body.ids.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Lista de orden inválida" }, { status: 400 });
  }

  const existing = await db
    .select({ id: credentials.id })
    .from(credentials)
    .where(inArray(credentials.id, ids));
  if (existing.length !== ids.length) {
    return NextResponse.json(
      { error: "Hay credenciales que no existen" },
      { status: 400 },
    );
  }

  for (let i = 0; i < ids.length; i += 1) {
    await db
      .update(credentials)
      .set({ order: i + 1 })
      .where(eq(credentials.id, ids[i]));
  }

  return NextResponse.json({ ok: true });
}
