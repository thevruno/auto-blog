import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryTopics } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { normalizeProviders } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await ensureSchema();
  const topics = await db
    .select()
    .from(discoveryTopics)
    .orderBy(asc(discoveryTopics.isPrimary), asc(discoveryTopics.label));

  return NextResponse.json({ topics });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const label = String(body?.label ?? "").trim();
  const query = String(body?.query ?? "").trim() || label;

  if (!label || !query) {
    return NextResponse.json(
      { error: "Completá el nombre del tema y la búsqueda." },
      { status: 400 },
    );
  }

  await ensureSchema();
  const [topic] = await db
    .insert(discoveryTopics)
    .values({
      label: label.slice(0, 120),
      query: query.slice(0, 200),
      providers: Array.isArray(body?.providers)
        ? normalizeProviders(body.providers)
        : [],
      strictMatch: Boolean(body?.strict),
      isPrimary: Boolean(body?.isPrimary),
      isActive: true,
    })
    .returning();

  return NextResponse.json({ topic }, { status: 201 });
}
