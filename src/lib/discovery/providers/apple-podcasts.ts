import type { LeadCandidate } from "../types";
import { fetchJson } from "../http";
import { truncateText } from "../text";

/**
 * Apple Podcasts (iTunes Search API): podcasts y episodios donde la mencionan.
 * API pública, sin key.
 */
const BASE_URL = () =>
  process.env.APPLE_PODCASTS_BASE_URL ?? "https://itunes.apple.com";

interface ItunesResult {
  wrapperType?: string;
  kind?: string;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  releaseDate?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  artworkUrl600?: string;
  artworkUrl160?: string;
  description?: string;
  shortDescription?: string;
  trackCount?: number;
}

export async function searchApplePodcasts(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const url = `${BASE_URL()}/search?term=${encodeURIComponent(
    query,
  )}&media=podcast&entity=podcastEpisode&limit=${Math.min(
    limit,
    50,
  )}&country=AR&lang=es_ar`;

  const data = await fetchJson<{ results?: ItunesResult[] }>(url, {
    headers: { Accept: "application/json" },
    timeoutMs: 12_000,
  });

  const candidates: LeadCandidate[] = [];

  for (const item of data.results ?? []) {
    const isEpisode = Boolean(item.trackName && item.collectionName);
    const title = isEpisode
      ? item.trackName!
      : (item.collectionName ?? item.trackName ?? "");
    const pageUrl = item.trackViewUrl ?? item.collectionViewUrl;
    if (!title || !pageUrl || !/^https?:\/\//i.test(pageUrl)) continue;

    const publishedAt = item.releaseDate ? new Date(item.releaseDate) : null;

    candidates.push({
      provider: "apple_podcasts",
      type: "podcast",
      title: truncateText(title, 200),
      url: pageUrl,
      sourceName: isEpisode
        ? `${item.collectionName} · Apple Podcasts`
        : "Apple Podcasts",
      author: item.artistName ?? null,
      snippet: truncateText(item.description ?? item.shortDescription ?? "", 280) || null,
      thumbnail: item.artworkUrl600 ?? item.artworkUrl160 ?? null,
      publishedAt:
        publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    });

    if (candidates.length >= limit) break;
  }

  if (candidates.length === 0) {
    throw new Error("Apple Podcasts no devolvió episodios para esta búsqueda.");
  }

  return candidates;
}
