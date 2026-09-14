import { fetchJson, fetchText, trySilent } from "./http";
import { decodeEntities, extractYouTubeId, truncateText } from "./text";

/**
 * Enriquece un hallazgo con los metadatos públicos del enlace: imagen de
 * portada, descripción, nombre del sitio, fecha y URL final (resolviendo
 * redirecciones, por ejemplo los enlaces de Google News).
 */
export interface EnrichedMeta {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  publishedAt: Date | null;
  finalUrl: string | null;
}

const EMPTY: EnrichedMeta = {
  title: null,
  description: null,
  image: null,
  siteName: null,
  publishedAt: null,
  finalUrl: null,
};

function metaMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const metaRe = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaRe.exec(html)) !== null) {
    const tag = match[0];
    const keyMatch =
      tag.match(/(?:property|name|itemprop)\s*=\s*("([^"]*)"|'([^']*)'|([^\s/>]+))/i);
    const contentMatch = tag.match(/content\s*=\s*("([^"]*)"|'([^']*)'|([^\s/>]+))/i);
    if (!keyMatch || !contentMatch) continue;
    const key = (keyMatch[2] ?? keyMatch[3] ?? keyMatch[4] ?? "")
      .trim()
      .toLowerCase();
    const value = decodeEntities(
      (contentMatch[2] ?? contentMatch[3] ?? contentMatch[4] ?? "").trim(),
    );
    if (key && value && !map.has(key)) map.set(key, value);
  }

  return map;
}

function absolutize(url: string, base: string): string {
  if (!url) return "";
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function pickDate(html: string, map: Map<string, string>): Date | null {
  const candidates = [
    map.get("article:published_time"),
    map.get("og:published_time"),
    map.get("date"),
    map.get("datepublished"),
    map.get("pubdate"),
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/<time[^>]*datetime\s*=\s*"([^"]+)"/i)?.[1],
  ];
  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

async function enrichYouTube(videoId: string): Promise<EnrichedMeta> {
  const base = process.env.YOUTUBE_OEMBED_BASE_URL ?? process.env.YOUTUBE_BASE_URL ?? "https://www.youtube.com";
  const data = await fetchJson<{
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  }>(`${base.replace(/\/$/, "")}/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}`, { timeoutMs: 10_000, headers: { Accept: "application/json" } });

  return {
    ...EMPTY,
    title: data.title ?? null,
    image: data.thumbnail_url ?? null,
    siteName: data.author_name ? `YouTube · ${data.author_name}` : "YouTube",
    finalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export async function enrichFromUrl(url: string): Promise<EnrichedMeta> {
  const videoId = extractYouTubeId(url);
  if (videoId) {
    const result = await trySilent(() => enrichYouTube(videoId));
    if (result) return result;
  }

  const response = await fetchText(url, {
    timeoutMs: 12_000,
    headers: { Accept: "text/html,application/xhtml+xml,*/*" },
  });

  const isHtml =
    response.contentType.includes("html") || response.text.trimStart().startsWith("<");
  if (!isHtml) return { ...EMPTY, finalUrl: response.finalUrl };

  const html = response.text.slice(0, 600_000);
  const map = metaMap(html);
  const canonical = html.match(
    /<link[^>]+rel\s*=\s*("|')canonical\1[^>]*href\s*=\s*("([^"]*)"|'([^']*)')/i,
  );
  const canonicalUrl = canonical?.[3] ?? canonical?.[4];
  const base = response.finalUrl || url;

  const image = absolutize(
    map.get("og:image:secure_url") ??
      map.get("og:image") ??
      map.get("twitter:image") ??
      map.get("twitter:image:src") ??
      "",
    base,
  );

  const title =
    map.get("og:title") ??
    map.get("twitter:title") ??
    decodeEntities(html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1] ?? "") ??
    null;

  return {
    title: title ? truncateText(title, 200) : null,
    description: truncateText(
      map.get("og:description") ?? map.get("twitter:description") ?? map.get("description") ?? "",
      320,
    ) || null,
    image: image && /^https?:\/\//i.test(image) ? image : null,
    siteName: map.get("og:site_name") ?? null,
    publishedAt: pickDate(html, map),
    finalUrl: canonicalUrl ? absolutize(canonicalUrl, base) : base,
  };
}

export async function enrichFromUrlSafe(
  url: string,
): Promise<EnrichedMeta | null> {
  return trySilent(() => enrichFromUrl(url));
}
