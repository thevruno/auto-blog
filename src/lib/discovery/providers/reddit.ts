import type { LeadCandidate } from "../types";
import { fetchJson } from "../http";
import { stripTags, truncateText } from "../text";

/**
 * Reddit: hilos y discusiones públicas donde se la menciona.
 * Endpoint JSON público (sin key); Reddit puede limitar consultas repetidas.
 */
const BASE_URL = () => process.env.REDDIT_BASE_URL ?? "https://www.reddit.com";

const IGNORED_THUMBNAILS = new Set([
  "self",
  "default",
  "nsfw",
  "spoiler",
  "image",
  "",
]);

interface RedditChild {
  data?: {
    title?: string;
    permalink?: string;
    subreddit_name_prefixed?: string;
    author?: string;
    selftext?: string;
    created_utc?: number;
    thumbnail?: string;
    over_18?: boolean;
    is_self?: boolean;
    url_overridden_by_dest?: string;
    score?: number;
    num_comments?: number;
    link_flair_text?: string;
  };
}

export async function searchReddit(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const url = `${BASE_URL()}/search.json?q=${encodeURIComponent(
    query,
  )}&sort=new&t=all&limit=${Math.min(limit, 50)}&raw_json=1`;

  const data = await fetchJson<{ data?: { children?: RedditChild[] } }>(url, {
    timeoutMs: 12_000,
    headers: {
      Accept: "application/json",
      // Reddit bloquea user-agents de navegador en su API pública.
      "User-Agent": "web:auto-blog-rastreo:1.0 (rastreo de menciones)",
    },
  });

  const children = data.data?.children ?? [];
  const candidates: LeadCandidate[] = [];

  for (const child of children) {
    const post = child.data;
    if (!post?.title || !post.permalink) continue;
    if (post.over_18) continue;

    const url = `https://www.reddit.com${post.permalink}`;
    const thumbnail =
      post.thumbnail && !IGNORED_THUMBNAILS.has(post.thumbnail)
        ? post.thumbnail
        : null;

    const body = post.selftext ? stripTags(post.selftext) : "";
    const engagement =
      post.score || post.num_comments
        ? `${post.score ?? 0} puntos · ${post.num_comments ?? 0} comentarios`
        : null;

    candidates.push({
      provider: "reddit",
      type: "social",
      title: truncateText(post.title, 200),
      url,
      sourceName: `Reddit · ${post.subreddit_name_prefixed ?? "r/?"}`,
      author: post.author ? `u/${post.author}` : null,
      snippet:
        [truncateText(body, 240), engagement].filter(Boolean).join(" · ") || null,
      thumbnail,
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000) : null,
    });

    if (candidates.length >= limit) break;
  }

  if (candidates.length === 0) {
    throw new Error("Reddit no devolvió resultados para esta búsqueda.");
  }

  return candidates;
}
