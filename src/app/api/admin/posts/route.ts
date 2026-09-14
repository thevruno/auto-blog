import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, type SQL, sql } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(posts.status, status));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      sql`(${ilike(posts.title, like)} OR ${ilike(posts.excerpt, like)})`,
    );
  }

  const items = await db
    .select()
    .from(posts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(posts.updatedAt));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
  const slug = await uniquePostSlug(requestedSlug);

  const [inserted] = await db
    .insert(posts)
    .values({
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
    })
    .returning();

  return NextResponse.json({ item: inserted }, { status: 201 });
}
