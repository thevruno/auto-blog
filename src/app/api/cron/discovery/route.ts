import { NextRequest, NextResponse } from "next/server";
import { listLeads } from "@/lib/discovery/list";
import { runAllTopics } from "@/lib/discovery/search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Rastreo automático de todos los temas vigilados.
 *
 * Pensado para un cron externo:
 *   curl -X POST "https://tu-sitio.com/api/cron/discovery?key=$DISCOVERY_CRON_KEY"
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

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("key") ?? req.headers.get("x-cron-key") ?? "";
  if (provided !== expected) {
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
