/**
 * Utilidades de texto y URLs para el rastreo web: normalización, deduplicado,
 * comparación de relevancia y decodificación de entidades HTML.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  deg: "°",
  euro: "€",
  middot: "·",
  bull: "•",
  times: "×",
  eacute: "é",
  enie: "ñ",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? safeFromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? safeFromCodePoint(code) : match;
    }
    const found = ENTITIES[entity.toLowerCase()];
    return found ?? match;
  });
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Quita etiquetas HTML y normaliza espacios. */
export function stripTags(input: string): string {
  return decodeEntities(
    input
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Minúsculas, sin acentos y sin signos: sirve para comparar relevancia. */
export function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s@#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "sobre",
  "para",
  "como",
  "este",
  "esta",
  "estos",
  "estas",
  "desde",
  "hasta",
  "entre",
  "cuando",
  "donde",
  "porque",
  "tambien",
  "también",
  "the",
  "and",
  "for",
  "with",
  "from",
  "que",
  "los",
  "las",
  "del",
  "una",
  "unos",
  "unas",
  "con",
  "por",
  "sus",
]);

/** Palabras significativas de una consulta (para medir relevancia). */
export function queryTokens(query: string): string[] {
  return fold(query)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export interface RelevanceInput {
  title?: string | null;
  snippet?: string | null;
  author?: string | null;
  sourceName?: string | null;
  url?: string | null;
}

export interface RelevanceResult {
  ok: boolean;
  matched: number;
  total: number;
}

/**
 * Verifica que el hallazgo realmente mencione lo que se buscó.
 * En modo estricto exige todas las palabras significativas; en modo normal
 * alcanza con una, o con la mitad cuando la consulta tiene 4+ palabras.
 */
export function checkRelevance(
  input: RelevanceInput,
  query: string,
  strict = false,
): RelevanceResult {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return { ok: true, matched: 0, total: 0 };

  const haystack = fold(
    [input.title, input.snippet, input.author, input.sourceName, input.url]
      .filter(Boolean)
      .join(" "),
  );

  let matched = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) matched += 1;
  }

  const needed = strict
    ? tokens.length
    : tokens.length >= 4
      ? Math.ceil(tokens.length / 2)
      : 1;

  return { ok: matched >= needed, matched, total: tokens.length };
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_name",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "igshid",
  "igsh",
  "mc_cid",
  "mc_eid",
  "mibextid",
  "ref",
  "ref_src",
  "ref_url",
  "spm",
  "srsltid",
  "_ga",
  "wt_mc",
  "at_medium",
  "at_campaign",
  "cmpid",
  "ncid",
  "sh",
  "si",
  "t",
  "feature",
  "ab_channel",
]);

/**
 * Normaliza una URL para deduplicar: sin www, sin parámetros de seguimiento,
 * sin barra final y sin fragmento.
 */
export function normalizeUrl(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "";

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return value.toLowerCase();
  }

  const protocol = parsed.protocol === "http:" ? "http:" : "https:";
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  const params = new URLSearchParams();
  const entries = Array.from(parsed.searchParams.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [key, val] of entries) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) continue;
    params.append(key, val);
  }
  const search = params.toString();

  let path = parsed.pathname.replace(/\/+$/, "");
  if (path === "") path = "";

  // YouTube: cualquier variante apunta al mismo video.
  const youtubeId = extractYouTubeId(value);
  if (youtubeId) return `https://youtube.com/watch?v=${youtubeId}`;

  return `${protocol}//${host}${path}${search ? `?${search}` : ""}`;
}

export function domainOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const YOUTUBE_ID =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/;

export function extractYouTubeId(raw: string): string | null {
  const match = (raw ?? "").match(YOUTUBE_ID);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(raw ?? "")) return raw;
  return null;
}

/**
 * URLs que no sirven como nota/prensa: buscadores, redes sociales y páginas de
 * login. Solo se aplica a los hallazgos de tipo "article" (los videos de
 * YouTube o los posteos de Reddit llegan por sus propios proveedores).
 */
const BLOCKED_ARTICLE_RULES: { host: RegExp; path?: RegExp }[] = [
  {
    host: /(^|\.)google\.[a-z.]+$/,
    path: /^\/(search|url|preferences|maps|imgres|policies)/i,
  },
  { host: /(^|\.)bing\.com$/ },
  { host: /(^|\.)duckduckgo\.com$/ },
  { host: /(^|\.)yahoo\.[a-z.]+$/ },
  { host: /(^|\.)facebook\.com$/ },
  { host: /(^|\.)instagram\.com$/ },
  { host: /(^|\.)pinterest\.[a-z.]+$/ },
  { host: /(^|\.)tiktok\.com$/ },
  { host: /(^|\.)youtube\.com$/ },
  { host: /(^|\.)youtu\.be$/ },
  { host: /(^|\.)twitter\.com$/ },
  { host: /(^|\.)x\.com$/ },
  { host: /(^|\.)amazon\.[a-z.]+$/ },
  { host: /(^|\.)mercadolibre\.[a-z.]+$/ },
  { host: /(^|\.)ebay\.[a-z.]+$/ },
  { host: /(^|\.)linkedin\.com$/, path: /^\/(login|signup|feed)/i },
  { host: /(^|\.)t\.me$/ },
  { host: /(^|\.)whatsapp\.com$/ },
];

export function isBlockedArticleUrl(url: string): boolean {
  const domain = domainOf(url);
  if (!domain) return true;
  let path = "";
  try {
    path = new URL(url).pathname;
  } catch {
    path = "";
  }
  return BLOCKED_ARTICLE_RULES.some(
    (rule) => rule.host.test(domain) && (!rule.path || rule.path.test(path)),
  );
}

/** Limpia el nombre del medio que Google News agrega al final del título. */
export function splitTitleAndSource(
  title: string,
  source?: string | null,
): { title: string; source: string | null } {
  const clean = stripTags(title);
  if (source && source.trim()) {
    const suffix = ` - ${source.trim()}`;
    return {
      title: clean.endsWith(suffix)
        ? clean.slice(0, -suffix.length).trim()
        : clean,
      source: source.trim(),
    };
  }
  const parts = clean.split(" - ");
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 1].trim();
    if (candidate.length > 1 && candidate.length <= 60) {
      return { title: parts.slice(0, -1).join(" - ").trim(), source: candidate };
    }
  }
  return { title: clean, source: null };
}

/** Título corto para redes sociales: primera línea, sin links. */
export function titleFromText(text: string, max = 140): string {
  const firstLine = stripTags(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)[0];
  const base = (firstLine ?? stripTags(text)).replace(/https?:\/\/\S+/g, "").trim();
  if (base.length <= max) return base;
  return `${base.slice(0, max).trimEnd()}…`;
}

/**
 * Convierte textos relativos de YouTube ("hace 3 días") en fechas.
 * Devuelve null cuando la estimación sería demasiado imprecisa (meses, años)
 * o cuando el texto ya viene en formato absoluto.
 */
export function parseRelativeDate(text?: string | null): Date | null {
  if (!text) return null;
  const value = fold(text);

  const absolute = new Date(text);
  if (!Number.isNaN(absolute.getTime()) && /\d{4}/.test(text)) return absolute;

  const match = value.match(/(\d+)\s*(hora|horas|dia|dias|semana|semanas|mes|meses|ano|anos|year|years|month|months|week|weeks|day|days|hour|hours)/);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (unit.startsWith("hora") || unit.startsWith("hour")) {
    return new Date(now - amount * 60 * 60 * 1000);
  }
  if (unit.startsWith("dia") || unit.startsWith("day")) {
    return new Date(now - amount * day);
  }
  if (unit.startsWith("semana") || unit.startsWith("week")) {
    return new Date(now - amount * 7 * day);
  }
  // Meses y años: la imprecisión no vale la pena para una fecha de publicación.
  return null;
}

export function truncateText(text: string, max: number): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

/** "1,2 M de vistas" → texto corto para el resumen del hallazgo. */
export function cleanViewCount(text?: string | null): string | null {
  if (!text) return null;
  const clean = stripTags(text)
    .replace(/^(\d[\d.,]*\s*[KMBkmb]?)\s*(de\s*)?(vistas|views|visualizaciones|reproducciones)/i, "$1 vistas")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 0 && clean.length <= 60 ? clean : null;
}
