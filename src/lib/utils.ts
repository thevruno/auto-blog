export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function readingTimeMinutes(html: string): number {
  const words = stripHtml(html)
    .split(/\s+/)
    .filter(Boolean).length;
  const wpm = 200;
  return Math.max(1, Math.round(words / wpm));
}

/**
 * Saneado básico de HTML de autor (contenido de confianza del panel).
 * Elimina scripts, estilos, handlers inline y URLs javascript:.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*("|')javascript:[^"']*\2/gi, "$1=$2#$2");
}

export function formatDate(
  input: Date | string | number | null | undefined,
): string {
  if (!input) return "";
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(
  input: Date | string | number | null | undefined,
): string {
  if (!input) return "";
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(
  input: Date | string | number | null | undefined,
): string {
  if (!input) return "";
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function absoluteUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const clean = base.replace(/\/+$/, "");
  return `${clean}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}
