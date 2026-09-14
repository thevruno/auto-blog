import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryLeads } from "@/db/schema";
import { isProviderId, type LeadCounts, type ProviderId } from "./types";

export type { LeadCounts };

export interface ListLeadsParams {
  q?: string;
  type?: string;
  provider?: string;
  status?: string;
  topicId?: number | null;
  limit?: number;
  offset?: number;
}

export async function listLeads(params: ListLeadsParams = {}) {
  await ensureSchema();

  const limit = Math.min(Math.max(params.limit ?? 48, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions: SQL[] = [];
  if (params.status === "open") {
    conditions.push(inArray(discoveryLeads.status, ["new", "saved"]));
  } else if (params.status && params.status !== "all") {
    conditions.push(eq(discoveryLeads.status, params.status));
  }
  if (params.type) conditions.push(eq(discoveryLeads.type, params.type));
  if (params.provider && isProviderId(params.provider)) {
    conditions.push(eq(discoveryLeads.provider, params.provider as ProviderId));
  }
  if (params.topicId) conditions.push(eq(discoveryLeads.topicId, params.topicId));
  if (params.q && params.q.trim()) {
    const like = `%${params.q.trim()}%`;
    const clause = or(
      ilike(discoveryLeads.title, like),
      ilike(discoveryLeads.snippet, like),
      ilike(discoveryLeads.sourceName, like),
      ilike(discoveryLeads.author, like),
    );
    if (clause) conditions.push(clause);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalRow, countRows] = await Promise.all([
    db
      .select()
      .from(discoveryLeads)
      .where(where)
      .orderBy(desc(discoveryLeads.discoveredAt), desc(discoveryLeads.id))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(discoveryLeads).where(where),
    db
      .select({ status: discoveryLeads.status, value: count() })
      .from(discoveryLeads)
      .groupBy(discoveryLeads.status),
  ]);

  const counts: LeadCounts = {
    total: 0,
    new: 0,
    saved: 0,
    imported: 0,
    discarded: 0,
    open: 0,
  };

  for (const row of countRows) {
    const value = Number(row.value);
    counts.total += value;
    if (row.status === "new") counts.new += value;
    if (row.status === "saved") counts.saved += value;
    if (row.status === "imported") counts.imported += value;
    if (row.status === "discarded") counts.discarded += value;
  }
  counts.open = counts.new + counts.saved;

  return {
    items,
    total: Number(totalRow[0]?.value ?? 0),
    limit,
    offset,
    counts,
  };
}
