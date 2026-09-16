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
 * Saneado del HTML que se muestra con `dangerouslySetInnerHTML`
 * (el contenido que se escribe desde el editor del panel).
 *
 * Funciona con lista blanca: se conservan sólo las etiquetas y los atributos
 * que produce el editor, y todo lo demás se descarta. Además:
 *
 * - se eliminan los elementos peligrosos junto con su contenido
 *   (`<script>`, `<style>`, `<iframe>`, `<svg>`, `<form>`, …),
 * - se descartan los atributos `on*`, `style` y `srcdoc`,
 * - los `href`/`src` aceptan únicamente `http`, `https`, `mailto`, `tel` o
 *   rutas relativas: `javascript:` y `data:` quedan afuera incluso si vienen
 *   ofuscados con entidades HTML (`&#106;avascript:`).
 *
 * El texto libre se conserva; sólo se escapan los `<` que quedan sueltos para
 * que un tag mal formado no lo interprete el navegador.
 */

/** Etiquetas que puede generar el editor (TipTap con las extensiones del sitio). */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "span",
  "sub",
  "sup",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

/** Elementos que se borran enteros (etiqueta + contenido). */
const REMOVED_BLOCKS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
  "template",
  "form",
  "textarea",
  "title",
  "base",
  "meta",
  "link",
];

/** Atributos permitidos por etiqueta. `*` aplica a todas. */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  "*": new Set(["title"]),
};

const ALLOWED_URL_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  colon: ":",
  tab: "\t",
  newline: "\n",
};

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTRIBUTE_RE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

/** Decodifica entidades HTML una vez, para poder validar el valor real. */
function decodeEntitiesOnce(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, entity: string) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1] === "x" || entity[1] === "X";
        const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
        return String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

/**
 * Devuelve la URL si es segura, o null para que el atributo se descarte.
 * La validación se hace sobre el valor decodificado y sin espacios ni
 * caracteres de control (`java\tscript:` no pasa).
 */
function safeUrlValue(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const decoded = decodeEntitiesOnce(value);
  const compact = decoded.replace(/[\u0000-\u0020\u007f]+/g, "");

  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(compact);
  if (scheme && !ALLOWED_URL_SCHEMES.has(scheme[1].toLowerCase())) return null;

  return value;
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, "&quot;");
}

interface ParsedAttribute {
  name: string;
  value: string | null;
}

function parseAttributes(raw: string): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = [];
  const regex = new RegExp(ATTRIBUTE_RE.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? null;
    if (name) attributes.push({ name, value });
  }

  return attributes;
}

function sanitizeAttributes(tag: string, raw: string): string {
  const allowed = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>();
  const global = ALLOWED_ATTRIBUTES["*"];
  const kept: string[] = [];
  let rel: string | null = null;
  let target: string | null = null;

  for (const attribute of parseAttributes(raw)) {
    const { name, value } = attribute;

    // Los handlers inline, los estilos y srcdoc nunca se conservan.
    if (name.startsWith("on") || name === "style" || name === "srcdoc") continue;
    if (!allowed.has(name) && !global.has(name)) continue;

    if (name === "target") {
      if (value === "_blank" || value === "_self") target = value;
      continue;
    }

    if (name === "rel") {
      rel = value ?? "";
      continue;
    }

    if (name === "href" || name === "src") {
      const safe = value === null ? null : safeUrlValue(value);
      if (safe === null) continue;
      kept.push(`${name}="${escapeAttribute(safe)}"`);
      continue;
    }

    if (name === "width" || name === "height") {
      if (!value || !/^\d{1,5}$/.test(value.trim())) continue;
      kept.push(`${name}="${value.trim()}"`);
      continue;
    }

    if (value === null) {
      kept.push(name);
      continue;
    }

    kept.push(`${name}="${escapeAttribute(value)}"`);
  }

  if (tag === "a") {
    if (target) kept.push(`target="${target}"`);
    if (target === "_blank") {
      // Evita que la página abierta pueda manipular la nuestra.
      const tokens = new Set(
        (rel ?? "")
          .split(/\s+/)
          .map((token) => token.trim().toLowerCase())
          .filter((token) => token && token !== "opener"),
      );
      tokens.add("noopener");
      tokens.add("noreferrer");
      kept.push(`rel="${Array.from(tokens).join(" ")}"`);
    } else if (rel !== null) {
      kept.push(`rel="${escapeAttribute(rel)}"`);
    }
  }

  return kept.length ? ` ${kept.join(" ")}` : "";
}

/** Escapa los `<` que no forman parte de una etiqueta reconocida. */
function escapeDanglingTags(text: string): string {
  return text.replace(/</g, "&lt;");
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let source = html.replace(/<!--[\s\S]*?-->/g, "");

  for (const tag of REMOVED_BLOCKS) {
    source = source.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    source = source.replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "");
  }

  const regex = new RegExp(TAG_RE.source, "g");
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    result += escapeDanglingTags(source.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const tag = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;

    if (match[0].startsWith("</")) {
      if (!VOID_TAGS.has(tag)) result += `</${tag}>`;
      continue;
    }

    result += `<${tag}${sanitizeAttributes(tag, match[2] ?? "")}>`;
  }

  result += escapeDanglingTags(source.slice(cursor));
  return result;
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

export function timeAgo(
  input: Date | string | number | null | undefined,
): string {
  if (!input) return "";
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input;
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return "publicado recién";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;
  if (days === 1) return "hace 1 día";
  if (weeks < 1) return `hace ${days} días`;
  if (weeks === 1) return "hace 1 semana";
  return `hace ${weeks} semanas`;
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
