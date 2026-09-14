import type { LeadCandidate } from "../types";
import { fetchJson, fetchText } from "../http";
import {
  cleanViewCount,
  extractYouTubeId,
  parseRelativeDate,
  truncateText,
} from "../text";

/**
 * YouTube. Estrategias en orden:
 *  1. API oficial v3 si existe YOUTUBE_API_KEY (lo más estable).
 *  2. Búsqueda pública por HTML (ytInitialData).
 *  3. Instancias alternativas compatibles (Piped / Invidious) si están
 *     configuradas con PIPED_BASE_URL o INVIDIOUS_BASE_URL.
 */
const BASE_URL = () => process.env.YOUTUBE_BASE_URL ?? "https://www.youtube.com";
const API_BASE = () =>
  process.env.YOUTUBE_API_BASE_URL ?? "https://www.googleapis.com/youtube/v3";

interface YtNode {
  [key: string]: unknown;
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const record = value as YtNode;
    if (typeof record.simpleText === "string") return record.simpleText;
    if (Array.isArray(record.runs)) {
      return (record.runs as YtNode[])
        .map((run) => (typeof run.text === "string" ? run.text : ""))
        .join("");
    }
    if (typeof record.content === "string") return record.content;
  }
  return "";
}

/** Recorta el objeto JSON balanceado que empieza en `start`. */
function sliceBalanced(source: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function extractInitialData(html: string): unknown | null {
  const markers = [
    "var ytInitialData =",
    "window[\"ytInitialData\"] =",
    "ytInitialData =",
    '"ytInitialData":',
  ];

  for (const marker of markers) {
    const index = html.indexOf(marker);
    if (index === -1) continue;
    const start = html.indexOf("{", index + marker.length - 1);
    if (start === -1) continue;
    const raw = sliceBalanced(html, start);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

function collectRenderers(node: unknown, out: YtNode[], depth = 0): void {
  if (!node || typeof node !== "object" || depth > 20 || out.length > 200) return;
  if (Array.isArray(node)) {
    for (const child of node) collectRenderers(child, out, depth + 1);
    return;
  }
  const record = node as YtNode;
  for (const key of ["videoRenderer", "gridVideoRenderer", "reelItemRenderer"]) {
    const value = record[key];
    if (value && typeof value === "object") out.push(value as YtNode);
  }
  for (const value of Object.values(record)) {
    collectRenderers(value, out, depth + 1);
  }
}

function bestThumbnail(renderer: YtNode, videoId: string): string | null {
  const thumbnails = (renderer.thumbnail as YtNode | undefined)?.thumbnails;
  if (Array.isArray(thumbnails)) {
    const urls = (thumbnails as YtNode[])
      .map((thumb) => (typeof thumb.url === "string" ? thumb.url : ""))
      .filter((url) => url.startsWith("http"));
    if (urls.length > 0) {
      // Se prefiere una versión mediana-grande pero no la máxima (más liviana).
      const sorted = urls.sort(
        (a, b) => (b.match(/\/(hq|sd|mq|maxres)\w*\./)?.[1] ? 1 : 0) - (a.match(/\/(hq|sd|mq|maxres)\w*\./)?.[1] ? 1 : 0),
      );
      return sorted.sort((a, b) => a.length - b.length)[Math.min(1, sorted.length - 1)] ?? urls[0];
    }
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function rendererToCandidate(renderer: YtNode): LeadCandidate | null {
  const videoId = typeof renderer.videoId === "string" ? renderer.videoId : null;
  if (!videoId) return null;

  const title = textOf(renderer.title) || textOf(renderer.headline);
  if (!title) return null;

  const author =
    textOf(renderer.ownerText) ||
    textOf(renderer.longBylineText) ||
    textOf(renderer.shortBylineText) ||
    null;

  const snippets = renderer.detailedMetadataSnippets;
  let snippet = textOf(renderer.descriptionSnippet);
  if (!snippet && Array.isArray(snippets) && snippets[0]) {
    snippet = textOf((snippets[0] as YtNode).snippet);
  }

  const viewCount = cleanViewCount(
    textOf(renderer.viewCountText) || textOf(renderer.shortViewCountText),
  );

  const parts = [truncateText(snippet, 240), viewCount].filter(Boolean);

  return {
    provider: "youtube",
    type: "video",
    title: truncateText(title, 200),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    sourceName: author ? `YouTube · ${author}` : "YouTube",
    author,
    snippet: parts.length > 0 ? parts.join(" · ") : null,
    thumbnail: bestThumbnail(renderer, videoId),
    publishedAt: parseRelativeDate(textOf(renderer.publishedTimeText)),
  };
}

async function searchViaApi(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  const url = `${API_BASE()}/search?part=snippet&type=video&maxResults=${Math.min(
    limit,
    50,
  )}&relevanceLanguage=es&q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;

  interface ApiResponse {
    items?: {
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
    }[];
    error?: { message?: string };
  }

  const data = await fetchJson<ApiResponse>(url, {
    headers: { Accept: "application/json" },
    timeoutMs: 12_000,
  });

  if (data.error) {
    throw new Error(`YouTube API: ${data.error.message ?? "error desconocido"}`);
  }

  return (data.items ?? [])
    .map((item) => {
      const videoId = item.id?.videoId;
      const snippet = item.snippet;
      if (!videoId || !snippet?.title) return null;
      const publishedAt = snippet.publishedAt ? new Date(snippet.publishedAt) : null;
      const thumbs = snippet.thumbnails ?? {};
      const thumbnail =
        thumbs.medium?.url ??
        thumbs.high?.url ??
        thumbs.standard?.url ??
        thumbs.default?.url ??
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      const candidate: LeadCandidate = {
        provider: "youtube",
        type: "video",
        title: truncateText(snippet.title, 200),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        sourceName: snippet.channelTitle
          ? `YouTube · ${snippet.channelTitle}`
          : "YouTube",
        author: snippet.channelTitle ?? null,
        snippet: snippet.description ? truncateText(snippet.description, 240) : null,
        thumbnail,
        publishedAt:
          publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
      };
      return candidate;
    })
    .filter((item): item is LeadCandidate => item !== null)
    .slice(0, limit);
}

async function searchViaHtml(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const url = `${BASE_URL()}/results?search_query=${encodeURIComponent(
    query,
  )}&hl=es&gl=AR`;

  const { text: html } = await fetchText(url, { timeoutMs: 14_000 });
  const data = extractInitialData(html);
  if (!data) {
    throw new Error(
      "YouTube no devolvió resultados legibles (puede estar mostrando un aviso de consentimiento o bloqueando la consulta).",
    );
  }

  const renderers: YtNode[] = [];
  collectRenderers(data, renderers);

  const seen = new Set<string>();
  const candidates: LeadCandidate[] = [];
  for (const renderer of renderers) {
    const candidate = rendererToCandidate(renderer);
    if (!candidate) continue;
    const id = extractYouTubeId(candidate.url);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    candidates.push(candidate);
    if (candidates.length >= limit) break;
  }

  if (candidates.length === 0) {
    throw new Error("YouTube no devolvió videos para esta búsqueda.");
  }
  return candidates;
}

interface PipedItem {
  url?: string;
  title?: string;
  uploaderName?: string;
  thumbnail?: string;
  shortDescription?: string;
  duration?: number;
  uploadedDate?: string;
}

async function searchViaPiped(
  base: string,
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const data = await fetchJson<{ items?: PipedItem[] }>(
    `${base.replace(/\/$/, "")}/search?q=${encodeURIComponent(
      query,
    )}&filter=videos`,
    { headers: { Accept: "application/json" }, timeoutMs: 10_000 },
  );

  return (data.items ?? [])
    .map((item) => {
      const videoId = item.url ? extractYouTubeId(item.url) : null;
      if (!videoId || !item.title) return null;
      const candidate: LeadCandidate = {
        provider: "youtube",
        type: "video",
        title: truncateText(item.title, 200),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        sourceName: item.uploaderName ? `YouTube · ${item.uploaderName}` : "YouTube",
        author: item.uploaderName ?? null,
        snippet: item.shortDescription
          ? truncateText(item.shortDescription, 240)
          : null,
        thumbnail:
          item.thumbnail?.startsWith("http")
            ? item.thumbnail
            : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: parseRelativeDate(item.uploadedDate),
      };
      return candidate;
    })
    .filter((item): item is LeadCandidate => item !== null)
    .slice(0, limit);
}

interface InvidiousItem {
  videoId?: string;
  title?: string;
  author?: string;
  description?: string;
  published?: number;
  publishedText?: string;
  videoThumbnails?: { url?: string; quality?: string }[];
}

async function searchViaInvidious(
  base: string,
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const data = await fetchJson<InvidiousItem[]>(
    `${base.replace(/\/$/, "")}/api/v1/search?q=${encodeURIComponent(
      query,
    )}&type=video`,
    { headers: { Accept: "application/json" }, timeoutMs: 10_000 },
  );

  return (Array.isArray(data) ? data : [])
    .map((item) => {
      if (!item.videoId || !item.title) return null;
      const thumbs = item.videoThumbnails ?? [];
      const thumbnail =
        thumbs.find((thumb) => thumb.quality === "medium")?.url ??
        thumbs.find((thumb) => thumb.quality === "high")?.url ??
        thumbs[0]?.url ??
        `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
      const candidate: LeadCandidate = {
        provider: "youtube",
        type: "video",
        title: truncateText(item.title, 200),
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        sourceName: item.author ? `YouTube · ${item.author}` : "YouTube",
        author: item.author ?? null,
        snippet: item.description ? truncateText(item.description, 240) : null,
        thumbnail: thumbnail?.startsWith("http")
          ? thumbnail
          : `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
        publishedAt: item.published
          ? new Date(item.published * 1000)
          : parseRelativeDate(item.publishedText),
      };
      return candidate;
    })
    .filter((item): item is LeadCandidate => item !== null)
    .slice(0, limit);
}

export async function searchYouTube(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const attempts: { label: string; run: () => Promise<LeadCandidate[]> }[] = [];

  if (process.env.YOUTUBE_API_KEY) {
    attempts.push({ label: "API v3", run: () => searchViaApi(query, limit) });
  }
  attempts.push({ label: "HTML", run: () => searchViaHtml(query, limit) });

  const piped = process.env.PIPED_BASE_URL;
  if (piped) {
    attempts.push({ label: "Piped", run: () => searchViaPiped(piped, query, limit) });
  }
  const invidious = process.env.INVIDIOUS_BASE_URL;
  if (invidious) {
    attempts.push({
      label: "Invidious",
      run: () => searchViaInvidious(invidious, query, limit),
    });
  }

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const results = await attempt.run();
      if (results.length > 0) return results;
      errors.push(`${attempt.label}: sin resultados`);
    } catch (error) {
      errors.push(
        `${attempt.label}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(errors.join(" · ") || "YouTube no devolvió resultados.");
}
