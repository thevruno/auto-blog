import type { MetadataRoute } from "next";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, "published"), isNotNull(posts.publishedAt)))
    .orderBy(desc(posts.publishedAt));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/medios"), changeFrequency: "weekly", priority: 0.8 },
  ];

  const postRoutes: MetadataRoute.Sitemap = items.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.updatedAt ?? p.publishedAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
