import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import {
  discoveryLeads,
  mediaItems,
  posts,
  type DiscoveryLead,
  type MediaItem,
  type Post,
} from "@/db/schema";
import { uniquePostSlug } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { readingTimeMinutes, stripHtml, truncate } from "@/lib/utils";
import { enrichFromUrlSafe } from "./enrich";
import { extractYouTubeId, truncateText } from "./text";

/** Tipo de medio del sitio al que se mapea cada hallazgo. */
const MEDIA_TYPE_BY_LEAD: Record<string, string> = {
  video: "video",
  podcast: "podcast",
  article: "article",
  social: "article",
};

const MEDIA_TYPES = ["video", "article", "podcast"];

export interface ImportOverrides {
  title?: string;
  type?: string;
  source?: string;
  url?: string;
  description?: string;
  thumbnail?: string;
  thumbnailAlt?: string;
  publishedAt?: string | null;
}

export interface ImportLeadOptions {
  /** Si es true, el ítem se publica en el sitio; si no, queda como borrador. */
  publish?: boolean;
  /** Crea además un borrador de nota del blog con el contexto del hallazgo. */
  createPost?: boolean;
  tags?: string[];
  overrides?: ImportOverrides;
}

export interface ImportLeadResult {
  mediaItem: MediaItem;
  post: Post | null;
  lead: DiscoveryLead;
  enriched: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function importLead(
  leadId: number,
  options: ImportLeadOptions = {},
): Promise<ImportLeadResult> {
  await ensureSchema();

  const rows = await db
    .select()
    .from(discoveryLeads)
    .where(eq(discoveryLeads.id, leadId))
    .limit(1);
  const lead = rows[0];
  if (!lead) throw new Error("El hallazgo ya no existe o fue eliminado.");

  if (lead.status === "imported" && lead.mediaItemId) {
    throw new Error(
      "Este hallazgo ya se agregó al sitio. Editalo desde «Medios» o el blog.",
    );
  }

  const overrides = options.overrides ?? {};
  const enriched = await enrichFromUrlSafe(lead.url);

  const url = (overrides.url ?? enriched?.finalUrl ?? lead.url).trim();
  const title = truncateText(
    (overrides.title ?? enriched?.title ?? lead.title).trim(),
    200,
  );
  if (!title) throw new Error("El hallazgo no tiene título: completalo a mano.");

  const requestedType = overrides.type ?? "";
  const type = MEDIA_TYPES.includes(requestedType)
    ? requestedType
    : (MEDIA_TYPE_BY_LEAD[lead.type] ?? "article");

  const source = (
    overrides.source ??
    lead.sourceName ??
    enriched?.siteName ??
    lead.sourceDomain ??
    "Web"
  ).trim();

  const description =
    (overrides.description ?? lead.snippet ?? enriched?.description ?? "").trim() ||
    null;

  const thumbnail =
    (overrides.thumbnail ?? lead.thumbnail ?? enriched?.image ?? "").trim() || null;

  const thumbnailAlt =
    (overrides.thumbnailAlt ??
      (thumbnail
        ? `Miniatura de «${truncateText(title, 90)}» en ${source}`
        : "")).trim() || null;

  const publishedAt = (() => {
    if (overrides.publishedAt) {
      const date = new Date(overrides.publishedAt);
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (lead.publishedAt) return new Date(lead.publishedAt);
    if (enriched?.publishedAt) return enriched.publishedAt;
    return new Date();
  })();

  const videoId = extractYouTubeId(url);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

  const [mediaItem] = await db
    .insert(mediaItems)
    .values({
      title,
      type,
      source: source || "Web",
      publishedAt,
      url,
      embedUrl,
      thumbnail,
      thumbnailAlt,
      description,
      status: options.publish ? "published" : "draft",
    })
    .returning();

  let post: Post | null = null;
  if (options.createPost) {
    const sourceLine = [source, publishedAt.toISOString().slice(0, 10)]
      .filter(Boolean)
      .join(" · ");
    const content = [
      description ? `<p>${escapeHtml(description)}</p>` : "",
      "<h2>Contexto</h2>",
      `<p>Publicación detectada por el rastreo web el ${new Date().toISOString().slice(0, 10)} (${escapeHtml(sourceLine)}).</p>`,
      `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver la publicación original</a></p>`,
      "<p><em>Borrador generado automáticamente. Revisá los datos, sumá tu mirada y publicalo cuando esté listo.</em></p>",
    ]
      .filter(Boolean)
      .join("\n");

    const excerptSource = description ? stripHtml(description) : title;
    const slug = await uniquePostSlug(slugify(title) || "hallazgo");

    [post] = await db
      .insert(posts)
      .values({
        title,
        slug,
        excerpt: truncate(excerptSource, 200),
        content,
        coverImage: thumbnail,
        coverImageAlt: thumbnailAlt,
        tags: options.tags ?? [],
        status: "draft",
        readingTime: readingTimeMinutes(content),
      })
      .returning();
  }

  const [updatedLead] = await db
    .update(discoveryLeads)
    .set({
      status: "imported",
      mediaItemId: mediaItem.id,
      postId: post?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(discoveryLeads.id, lead.id))
    .returning();

  return {
    mediaItem,
    post,
    lead: updatedLead ?? lead,
    enriched: Boolean(enriched),
  };
}
