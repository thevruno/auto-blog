import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireAdmin, uniquePostSlug } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import {
  computePublishedAt,
  deriveExcerpt,
  normalizeTags,
} from "@/lib/post-input";
import { readingTimeMinutes, stripHtml } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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

  const rows = await db.select().from(posts).where(eq(posts.id, parsed)).limit(1);
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
    .from(posts)
    .where(eq(posts.id, parsed))
    .limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "El título es obligatorio." },
      { status: 400 },
    );
  }

  const content = String(body?.content ?? "");
  const status = body?.status === "published" ? "published" : "draft";
  const requestedSlug =
    slugify(String(body?.slug ?? "").trim()) || slugify(title);
  const slug = await uniquePostSlug(requestedSlug, parsed);

  const [updated] = await db
    .update(posts)
    .set({
      title,
      slug,
      excerpt: deriveExcerpt(content, String(body?.excerpt ?? "")),
      content,
      coverImage: body?.coverImage ? String(body.coverImage) : null,
      coverImageAlt: body?.coverImageAlt ? String(body.coverImageAlt) : null,
      tags: normalizeTags(body?.tags),
      status,
      publishedAt: computePublishedAt(status, body?.publishedAt),
      readingTime: readingTimeMinutes(stripHtml(content)),
      metaTitle: String(body?.metaTitle ?? "").trim() || null,
      metaDescription: String(body?.metaDescription ?? "").trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, parsed))
    .returning();

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

  await db.delete(posts).where(eq(posts.id, parsed));
  return NextResponse.json({ ok: true });
}
