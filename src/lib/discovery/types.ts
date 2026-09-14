/**
 * Tipos y catálogo de proveedores del rastreo web.
 */

export const PROVIDER_IDS = [
  "google_news",
  "duckduckgo",
  "youtube",
  "apple_podcasts",
  "bluesky",
  "reddit",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type LeadType = "article" | "video" | "podcast" | "social";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  detail: string;
  defaultType: LeadType;
  /** Requiere variables de entorno para funcionar. */
  envHint?: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "google_news",
    label: "Notas y prensa",
    detail: "Google News — diarios, portales y medios digitales",
    defaultType: "article",
  },
  {
    id: "duckduckgo",
    label: "Web general",
    detail: "DuckDuckGo — blogs, sitios institucionales y páginas sueltas",
    defaultType: "article",
  },
  {
    id: "youtube",
    label: "Videos",
    detail: "YouTube — entrevistas, charlas y programas",
    defaultType: "video",
    envHint: "Opcional: YOUTUBE_API_KEY para resultados más estables",
  },
  {
    id: "apple_podcasts",
    label: "Podcasts",
    detail: "Apple Podcasts — episodios donde la mencionan",
    defaultType: "podcast",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    detail: "Red social — posteos públicos que la mencionan",
    defaultType: "social",
  },
  {
    id: "reddit",
    label: "Reddit",
    detail: "Foros y comunidades (hilos y discusiones)",
    defaultType: "social",
  },
];

export const PROVIDER_MAP: Record<ProviderId, ProviderMeta> = PROVIDERS.reduce(
  (acc, provider) => {
    acc[provider.id] = provider;
    return acc;
  },
  {} as Record<ProviderId, ProviderMeta>,
);

export function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value)
  );
}

/** Normaliza la lista de proveedores pedida (vacía o inválida = todos). */
export function normalizeProviders(input?: unknown): ProviderId[] {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  const valid = values.filter(isProviderId);
  return valid.length > 0 ? Array.from(new Set(valid)) : [...PROVIDER_IDS];
}

/** Un hallazgo crudo devuelto por un proveedor, antes de guardarse. */
export interface LeadCandidate {
  provider: ProviderId;
  type: LeadType;
  title: string;
  url: string;
  sourceName?: string | null;
  author?: string | null;
  snippet?: string | null;
  thumbnail?: string | null;
  publishedAt?: Date | null;
}

export interface ProviderReport {
  provider: ProviderId;
  label: string;
  ok: boolean;
  error?: string;
  found: number;
  kept: number;
  ms: number;
}

export interface SearchRunResult {
  query: string;
  providers: ProviderReport[];
  candidates: number;
  filtered: number;
  inserted: number;
  known: number;
  duplicates: number;
  leadIds: number[];
  durationMs: number;
}

export interface DiscoveryLeadView {
  id: number;
  topicId: number | null;
  query: string;
  provider: string;
  type: string;
  title: string;
  url: string;
  sourceName: string | null;
  sourceDomain: string | null;
  author: string | null;
  snippet: string | null;
  thumbnail: string | null;
  publishedAt: string | null;
  status: string;
  timesSeen: number;
  discoveredAt: string | null;
  mediaItemId: number | null;
  postId: number | null;
  /** true si el hallazgo se agregó en esta corrida. */
  isNew?: boolean;
}

export const LEAD_STATUSES = ["new", "saved", "imported", "discarded"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface LeadCounts {
  total: number;
  new: number;
  saved: number;
  imported: number;
  discarded: number;
  open: number;
}

export const LEAD_TYPE_LABELS: Record<string, string> = {
  article: "Nota / prensa",
  video: "Video",
  podcast: "Podcast",
  social: "Red social",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Sin revisar",
  saved: "Para repostear",
  imported: "En el sitio",
  discarded: "Descartado",
};
