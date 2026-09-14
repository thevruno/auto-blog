import type { LeadCandidate } from "../types";
import { fetchJson } from "../http";
import { titleFromText, truncateText } from "../text";

/**
 * Bluesky: API pública de búsqueda de posteos, sin autenticación.
 * Es la red social donde hoy se puede rastrear contenido abierto de forma
 * confiable (X e Instagram no ofrecen búsqueda pública).
 */
const BASE_URL = () =>
  process.env.BLUESKY_BASE_URL ?? "https://public.api.bsky.app";

interface BlueskyPost {
  uri?: string;
  author?: { handle?: string; displayName?: string };
  record?: { text?: string; createdAt?: string };
  embed?: {
    images?: { thumb?: string; fullsize?: string }[];
    external?: { uri?: string; title?: string; thumb?: string };
    media?: { images?: { thumb?: string }[] };
  };
  replyCount?: number;
  likeCount?: number;
}

export async function searchBluesky(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const url = `${BASE_URL()}/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(
    query,
  )}&limit=${Math.min(limit, 50)}&sort=latest&lang=es`;

  const data = await fetchJson<{ posts?: BlueskyPost[] }>(url, {
    headers: { Accept: "application/json" },
    timeoutMs: 12_000,
  });

  const posts = data.posts ?? [];
  const candidates: LeadCandidate[] = [];

  for (const post of posts) {
    const handle = post.author?.handle;
    const uri = post.uri ?? "";
    const rkey = uri.split("/").pop();
    if (!handle || !rkey) continue;

    const text = (post.record?.text ?? "").trim();
    const url = `https://bsky.app/profile/${handle}/post/${rkey}`;
    const createdAt = post.record?.createdAt ? new Date(post.record.createdAt) : null;

    const thumbnail =
      [
        ...(post.embed?.images ?? []).map((image) => image.thumb ?? image.fullsize),
        ...(post.embed?.media?.images ?? []).map((image) => image.thumb),
        post.embed?.external?.thumb,
      ].find((url): url is string => Boolean(url)) ?? null;

    const display = post.author?.displayName?.trim();
    const author = display ? `${display} (@${handle})` : `@${handle}`;

    const engagement =
      post.likeCount || post.replyCount
        ? `${post.likeCount ?? 0} me gusta · ${post.replyCount ?? 0} respuestas`
        : null;

    candidates.push({
      provider: "bluesky",
      type: "social",
      title: titleFromText(text) || `Publicación de ${author} en Bluesky`,
      url,
      sourceName: "Bluesky",
      author,
      snippet: [truncateText(text, 260), engagement].filter(Boolean).join(" · ") || null,
      thumbnail,
      publishedAt:
        createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
    });

    if (candidates.length >= limit) break;
  }

  if (candidates.length === 0) {
    throw new Error("Bluesky no devolvió publicaciones para esta búsqueda.");
  }

  return candidates;
}
