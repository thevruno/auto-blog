import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryTopics } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { listLeads } from "@/lib/discovery/list";
import { runDiscoverySearch } from "@/lib/discovery/search";
import { PROVIDERS, normalizeProviders } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Corre el rastreo: por consulta libre o por tema vigilado.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  let query = String(body?.query ?? "").trim();
  let providers = body?.providers;
  let strict = Boolean(body?.strict);
  let topicId: number | null = null;

  if (body?.topicId) {
    await ensureSchema();
    const parsed = Number(body.topicId);
    if (!Number.isInteger(parsed)) {
      return NextResponse.json({ error: "Tema inválido." }, { status: 400 });
    }
    const rows = await db
      .select()
      .from(discoveryTopics)
      .where(eq(discoveryTopics.id, parsed))
      .limit(1);
    const topic = rows[0];
    if (!topic) {
      return NextResponse.json({ error: "Tema no encontrado." }, { status: 404 });
    }
    topicId = topic.id;
    query = query || topic.query;
    if (providers === undefined || providers === null) providers = topic.providers;
    if (body?.strict === undefined) strict = topic.strictMatch;
  }

  if (!query) {
    return NextResponse.json(
      { error: "Escribí qué querés rastrear (una persona, un tema o una frase)." },
      { status: 400 },
    );
  }

  try {
    const result = await runDiscoverySearch({
      query,
      providers: normalizeProviders(providers),
      strict,
      topicId,
    });

    const leads = await listLeads({ status: "open", limit: 60 });

    return NextResponse.json({
      result,
      items: leads.items,
      counts: leads.counts,
      providers: PROVIDERS,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar el rastreo.",
      },
      { status: 500 },
    );
  }
}
