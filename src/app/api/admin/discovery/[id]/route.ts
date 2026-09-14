import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryLeads } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

/** Cambia el estado de un hallazgo: new · saved · imported · discarded. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const leadId = parseId(id);
  if (leadId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: "Estado inválido. Usá new, saved, imported o discarded." },
      { status: 400 },
    );
  }

  await ensureSchema();
  const [updated] = await db
    .update(discoveryLeads)
    .set({ status: status as LeadStatus, updatedAt: new Date() })
    .where(eq(discoveryLeads.id, leadId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const leadId = parseId(id);
  if (leadId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await ensureSchema();
  await db.delete(discoveryLeads).where(eq(discoveryLeads.id, leadId));
  return NextResponse.json({ ok: true });
}
