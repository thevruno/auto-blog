import { XMLParser } from "fast-xml-parser";
import type { LeadCandidate } from "../types";
import { fetchText } from "../http";
import {
  splitTitleAndSource,
  stripTags,
  truncateText,
} from "../text";

/**
 * Google News (RSS de búsqueda): cubre diarios, portales y medios digitales.
 * No requiere API key.
 */
const BASE_URL = () => process.env.GOOGLE_NEWS_BASE_URL ?? "https://news.google.com";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  description?: unknown;
  source?: unknown;
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"];
    return Object.entries(record)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, val]) => textOf(val))
      .join(" ");
  }
  return "";
}

function sourceOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string" && record["#text"].trim()) {
      return record["#text"].trim();
    }
  }
  const text = textOf(value).trim();
  return text || null;
}

function linkOf(value: unknown): string | null {
  const text = textOf(value).trim();
  if (/^https?:\/\//i.test(text)) return text;
  return null;
}

export async function searchGoogleNews(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const url = `${BASE_URL()}/rss/search?q=${encodeURIComponent(
    query,
  )}&hl=es-419&gl=AR&ceid=AR:es-419`;

  const { text } = await fetchText(url, {
    timeoutMs: 12_000,
    headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(text);
  } catch {
    throw new Error("Google News devolvió un XML inválido.");
  }

  const channel = (parsed as { rss?: { channel?: { item?: unknown } } })?.rss
    ?.channel;
  const rawItems = channel?.item;
  const items: RssItem[] = Array.isArray(rawItems)
    ? (rawItems as RssItem[])
    : rawItems
      ? [rawItems as RssItem]
      : [];

  const candidates: LeadCandidate[] = [];

  for (const item of items) {
    const link = linkOf(item.link);
    if (!link) continue;

    const { title, source } = splitTitleAndSource(
      textOf(item.title),
      sourceOf(item.source),
    );
    if (!title) continue;

    const snippet = truncateText(stripTags(textOf(item.description)), 300);
    const publishedAt = item.pubDate ? new Date(textOf(item.pubDate)) : null;

    candidates.push({
      provider: "google_news",
      type: "article",
      title,
      url: link,
      sourceName: source,
      snippet: snippet || null,
      publishedAt:
        publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
      thumbnail: null,
    });

    if (candidates.length >= limit) break;
  }

  return candidates;
}
