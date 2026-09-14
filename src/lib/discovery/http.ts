/**
 * Cliente HTTP mínimo para el rastreo: timeouts, user-agent de navegador y
 * mensajes de error entendibles para mostrar en el panel.
 */

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
};

export interface FetchTextOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
}

export interface FetchTextResult {
  status: number;
  text: string;
  contentType: string;
  finalUrl: string;
}

export class DiscoveryHttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DiscoveryHttpError";
    this.status = status;
  }
}

function friendlyNetworkError(error: unknown, url: string): DiscoveryHttpError {
  const raw = error instanceof Error ? error.message : String(error);
  const host = safeHost(url);

  if (/abort|timeout|timed out/i.test(raw)) {
    return new DiscoveryHttpError(
      `Tiempo de espera agotado al contactar ${host}. Intentá de nuevo.`,
    );
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) {
    return new DiscoveryHttpError(
      `No se pudo resolver ${host} (¿sin salida a internet desde el servidor?).`,
    );
  }
  if (/ECONNREFUSED|ECONNRESET|EPIPE|socket hang up|fetch failed/i.test(raw)) {
    return new DiscoveryHttpError(
      `No se pudo conectar con ${host}. Puede ser un bloqueo de red del hosting.`,
    );
  }
  return new DiscoveryHttpError(`Error al contactar ${host}: ${raw}`);
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function fetchText(
  url: string,
  options: FetchTextOptions = {},
): Promise<FetchTextResult> {
  const { timeoutMs = 12_000, headers = {}, method = "GET", body } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      body,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { ...BROWSER_HEADERS, ...headers },
      cache: "no-store",
    });
  } catch (error) {
    throw friendlyNetworkError(error, url);
  }

  if (response.status === 429) {
    throw new DiscoveryHttpError(
      `${safeHost(url)} limitó la cantidad de consultas (429). Probá en unos minutos.`,
      429,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new DiscoveryHttpError(
      `${safeHost(url)} bloqueó la consulta (${response.status}).`,
      response.status,
    );
  }
  if (!response.ok) {
    throw new DiscoveryHttpError(
      `${safeHost(url)} respondió ${response.status}.`,
      response.status,
    );
  }

  const text = await response.text();
  return {
    status: response.status,
    text,
    contentType: response.headers.get("content-type") ?? "",
    finalUrl: response.url || url,
  };
}

export async function fetchJson<T>(
  url: string,
  options: FetchTextOptions = {},
): Promise<T> {
  const { text, ...rest } = await fetchText(url, {
    ...options,
    headers: { Accept: "application/json, text/plain, */*", ...options.headers },
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new DiscoveryHttpError(
      `${safeHost(url)} devolvió una respuesta que no es JSON válido.`,
    );
  }
}

/** Corre una promesa y devuelve null si falla, sin cortar el resto. */
export async function trySilent<T>(
  promise: () => Promise<T>,
): Promise<T | null> {
  try {
    return await promise();
  } catch {
    return null;
  }
}
