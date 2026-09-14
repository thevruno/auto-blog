import type { LeadCandidate, ProviderId } from "../types";
import { searchGoogleNews } from "./google-news";
import { searchDuckDuckGo } from "./duckduckgo";
import { searchYouTube } from "./youtube";
import { searchApplePodcasts } from "./apple-podcasts";
import { searchBluesky } from "./bluesky";
import { searchReddit } from "./reddit";

export type ProviderRunner = (
  query: string,
  limit: number,
) => Promise<LeadCandidate[]>;

export const PROVIDER_RUNNERS: Record<ProviderId, ProviderRunner> = {
  google_news: searchGoogleNews,
  duckduckgo: searchDuckDuckGo,
  youtube: searchYouTube,
  apple_podcasts: searchApplePodcasts,
  bluesky: searchBluesky,
  reddit: searchReddit,
};
