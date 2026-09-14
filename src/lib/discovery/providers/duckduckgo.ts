import type { LeadCandidate } from "../types";
import { fetchText } from "../http";
import { decodeEntities, stripTags, truncateText } from "../text";

/**
 * DuckDuckGo (HTML sin JavaScript): resultados web abiertos — blogs, sitios
 * institucionales, portales chicos que no aparecen en Google News.
 */
const BASE_URL = () =>
  process.env.DUCKDUCKGO_BASE_URL ?? "https://html.duckduckgo.com";

interface ParsedAnchor {
  kind: "link" | "snippet";
  href: string;
  text: string;
}

/** DDG devuelve links con redirección propia: hay que extraer `uddg`. */
function unwrapRedirect(href: string): string {
  const raw = href.startsWith("//") ? `https:${href}` : href;
  if (/^https?:\/\/duckduckgo\.com\/l\//i.test(raw)) {
    try {
      const target = new URL(raw).searchParams.get("uddg");
      if (target) return decodeURIComponent(target);
    } catch {
      const match = raw.match(/uddg=([^&]+)/);
      if (match) {
        try {
          return decodeURIComponent(match[1]);
        } catch {
          return raw;
        }
      }
    }
  }
  return raw;
}

function extractAnchors(html: string): ParsedAnchor[] {
  const results: ParsedAnchor[] = [];
  // Toma <a ...>...</a> y decide por la clase si es título o resumen.
  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const classMatch = attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)')/i);
    const className = (classMatch?.[2] ?? classMatch?.[3] ?? "").toLowerCase();
    const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
    const href = decodeEntities(hrefMatch?.[2] ?? hrefMatch?.[3] ?? "").trim();
    const text = truncateText(stripTags(inner), 400);

    if (
      (className.includes("result__a") || className.includes("result-link")) &&
      href &&
      text
    ) {
      results.push({ kind: "link", href, text });
      continue;
    }
    if (
      (className.includes("result__snippet") ||
        className.includes("result-snippet")) &&
      text
    ) {
      results.push({ kind: "snippet", href, text });
    }
  }

  // Respaldo: resúmenes como celdas de la versión "lite"
  if (results.length === 0) {
    const tdRe = /<td\b([^>]*)class\s*=\s*("|')([^"']*result-snippet[^"']*)\2[^>]*>([\s\S]*?)<\/td>/gi;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(html)) !== null) {
      const text = truncateText(stripTags(td[4]), 400);
      if (text) results.push({ kind: "snippet", href: "", text });
    }
  }

  return results;
}

export async function searchDuckDuckGo(
  query: string,
  limit: number,
): Promise<LeadCandidate[]> {
  const body = new URLSearchParams({
    q: query,
    kl: "ar-es",
    kp: "-1",
  }).toString();

  const { text: html } = await fetchText(`${BASE_URL()}/html/`, {
    method: "POST",
    timeoutMs: 14_000,
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE_URL()}/`,
      Origin: BASE_URL(),
    },
  });

  const anchors = extractAnchors(html);
  const candidates: LeadCandidate[] = [];
  let current: LeadCandidate | null = null;

  for (const anchor of anchors) {
    if (anchor.kind === "link") {
      if (candidates.length >= limit) break;
      const url = unwrapRedirect(anchor.href);
      if (!/^https?:\/\//i.test(url)) continue;
      current = {
        provider: "duckduckgo",
        type: "article",
        title: anchor.text,
        url,
        snippet: null,
      };
      candidates.push(current);
    } else if (current && !current.snippet) {
      current.snippet = anchor.text;
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "DuckDuckGo no devolvió resultados legibles (puede estar limitando las consultas).",
    );
  }

  return candidates;
}
