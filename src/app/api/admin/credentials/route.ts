import { NextRequest, NextResponse } from "next/server";
import { asc, max } from "drizzle-orm";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const items = await db
    .select()
    .from(credentials)
    .orderBy(asc(credentials.order), asc(credentials.id));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

  const orderRows = await db
    .select({ value: max(credentials.order) })
    .from(credentials);
  const nextOrder = (orderRows[0]?.value ?? 0) + 1;

  const [inserted] = await db
    .insert(credentials)
    .values({
      order: nextOrder,
      icon: body?.icon ? String(body.icon) : "🎓",
      title,
      institution,
      description,
      highlight: Boolean(body?.highlight),
    })
    .returning();

  return NextResponse.json({ item: inserted }, { status: 201 });
}
