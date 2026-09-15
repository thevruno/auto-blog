import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/lib/discovery/list";
import { runAllTopics } from "@/lib/discovery/search";
import { rateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";
import { clientIp, safeEqualString } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Rastreos permitidos por IP cada 5 minutos. */
const CRON_LIMIT = { limit: 6, windowMs: 5 * 60_000 };

/**
 * Rastreo automático de todos los temas vigilados.
 *
 * Pensado para un cron externo:
 *   curl -X POST "https://tu-sitio.com/api/cron/discovery" \
 *     -H "x-cron-key: $DISCOVERY_CRON_KEY"
 *
 * La clave también se acepta por query string (`?key=…`) por comodidad, pero
 * conviene usar la cabecera: las URLs quedan en los logs de los proxies.
 *
 * Si no se define DISCOVERY_CRON_KEY, el endpoint queda cerrado.
 */
async function handle(req: NextRequest) {
  const expected = process.env.DISCOVERY_CRON_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Definí DISCOVERY_CRON_KEY para habilitar el rastreo automático." },
      { status: 503 },
    );
  }

  const limit = rateLimit(`cron:${clientIp(req)}`, CRON_LIMIT);
  if (!limit.ok) {
    return tooManyRequestsResponse(
      limit.retryAfterSeconds,
      "El rastreo ya se ejecutó varias veces seguidas. Esperá unos minutos.",
    );
  }

  const url = new URL(req.url);
  const provided =
    req.headers.get("x-cron-key") ?? url.searchParams.get("key") ?? "";

  // Comparación en tiempo constante: no se filtra la clave carácter a carácter.
  if (!safeEqualString(provided, expected)) {
    return NextResponse.json({ error: "Clave inválida." }, { status: 401 });
  }

  const results = await runAllTopics();
  const leads = await listLeads({ status: "open", limit: 1 });

  return NextResponse.json({
    ok: true,
    topics: results.map((entry) => ({
      topicId: entry.topicId,
      label: entry.label,
      ...("error" in entry.result
        ? { error: entry.result.error }
        : {
            inserted: entry.result.inserted,
            known: entry.result.known,
            providers: entry.result.providers.map((p) => ({
              provider: p.provider,
              ok: p.ok,
              error: p.error ?? null,
              kept: p.kept,
            })),
          }),
    })),
    pendientes: leads.counts.open,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
