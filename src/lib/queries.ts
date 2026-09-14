import { db } from "@/db";
import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import {
  credentials,
  mediaItems,
  posts,
  siteProfile,
  type Post,
} from "@/db/schema";

const published = () =>
  and(eq(posts.status, "published"), isNotNull(posts.publishedAt));

export async function getSiteProfile() {
  const rows = await db
    .select()
    .from(siteProfile)
    .orderBy(asc(siteProfile.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCredentials() {
  return db
    .select()
    .from(credentials)
    .orderBy(asc(credentials.order), asc(credentials.id));
}

export async function getLatestPosts(limit = 4) {
  return db
    .select()
    .from(posts)
    .where(published())
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export interface ListPostsParams {
  page?: number;
  pageSize?: number;
  tag?: string;
  q?: string;
}

export async function getPublishedPosts(params: ListPostsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(24, Math.max(1, params.pageSize ?? 9));
  const conditions: SQL[] = [
    eq(posts.status, "published"),
    isNotNull(posts.publishedAt),
  ];

  if (params.tag) {
    conditions.push(arrayContains(posts.tags, [params.tag]));
  }
  if (params.q && params.q.trim().length > 0) {
    const like = `%${params.q.trim()}%`;
    conditions.push(
      sql`(${ilike(posts.title, like)} OR ${ilike(posts.excerpt, like)})`,
    );
  }

  const where = and(...conditions);

  const [totalRow, items] = await Promise.all([
    db.select({ value: count() }).from(posts).where(where),
    db
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = totalRow[0]?.value ?? 0;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublishedPostBySlug(slug: string) {
  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), published()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRelatedPosts(
  currentId: number,
  tags: string[],
  limit = 3,
) {
  const all = await db
    .select()
    .from(posts)
    .where(and(published(), ne(posts.id, currentId)))
    .orderBy(desc(posts.publishedAt));

  if (tags.length > 0) {
    const scored = all.map((p) => ({
      post: p,
      score: (p.tags ?? []).filter((t) => tags.includes(t)).length,
    }));
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.publishedAt ?? 0).getTime() -
          new Date(a.post.publishedAt ?? 0).getTime(),
    );
    return scored.slice(0, limit).map((s) => s.post);
  }

  return all.slice(0, limit);
}

export async function getDistinctTags(): Promise<string[]> {
  const rows = await db
    .select({ tags: posts.tags })
    .from(posts)
    .where(published());
  const set = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function getMediaItems(type?: string) {
  return db
    .select()
    .from(mediaItems)
    .where(type ? eq(mediaItems.type, type) : undefined)
    .orderBy(desc(mediaItems.publishedAt));
}

export type { Post };
