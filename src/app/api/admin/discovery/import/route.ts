import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { importLead } from "@/lib/discovery/import";
import { normalizeTags } from "@/lib/post-input";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * «Repostear en la web»: convierte un hallazgo en un ítem de «En los medios»
 * (borrador por defecto) y, si se pide, en un borrador de nota del blog.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const leadId = Number(body?.id);
  if (!Number.isInteger(leadId)) {
    return NextResponse.json({ error: "Hallazgo inválido." }, { status: 400 });
  }

  const overridesInput = (body?.overrides ?? {}) as Record<string, unknown>;
  const overrides = {
    title: overridesInput.title ? String(overridesInput.title) : undefined,
    type: overridesInput.type ? String(overridesInput.type) : undefined,
    source: overridesInput.source ? String(overridesInput.source) : undefined,
    url: overridesInput.url ? String(overridesInput.url) : undefined,
    description: overridesInput.description
      ? String(overridesInput.description)
      : undefined,
    thumbnail: overridesInput.thumbnail
      ? String(overridesInput.thumbnail)
      : undefined,
    thumbnailAlt: overridesInput.thumbnailAlt
      ? String(overridesInput.thumbnailAlt)
      : undefined,
    publishedAt:
      typeof overridesInput.publishedAt === "string" && overridesInput.publishedAt
        ? overridesInput.publishedAt
        : undefined,
  };

  try {
    const result = await importLead(leadId, {
      publish: Boolean(body?.publish),
      createPost: Boolean(body?.createPost),
      tags: normalizeTags(body?.tags),
      overrides,
    });

    return NextResponse.json({
      ok: true,
      mediaItem: result.mediaItem,
      post: result.post,
      lead: result.lead,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo agregar el hallazgo al sitio.",
      },
      { status: 400 },
    );
  }
}
