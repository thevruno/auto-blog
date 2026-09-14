import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const TYPES = ["video", "article", "podcast"];

function parseDate(raw: unknown): Date | null {
  if (raw && typeof raw === "string" && raw.length > 0) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";

  const conditions: SQL[] = [];
  if (type) conditions.push(eq(mediaItems.type, type));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      sql`(${ilike(mediaItems.title, like)} OR ${ilike(mediaItems.source, like)})`,
    );
  }

  const items = await db
    .select()
    .from(mediaItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(mediaItems.publishedAt));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

  const [inserted] = await db
    .insert(mediaItems)
    .values({
      title,
      type,
      source,
      publishedAt: parseDate(body?.publishedAt),
      url: body?.url ? String(body.url) : null,
      embedUrl: body?.embedUrl ? String(body.embedUrl) : null,
      thumbnail: body?.thumbnail ? String(body.thumbnail) : null,
      thumbnailAlt: body?.thumbnailAlt ? String(body.thumbnailAlt) : null,
      description: body?.description ? String(body.description) : null,
    })
    .returning();

  return NextResponse.json({ item: inserted }, { status: 201 });
}
