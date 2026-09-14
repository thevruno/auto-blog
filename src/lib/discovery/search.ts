import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryLeads, discoveryTopics, mediaItems } from "@/db/schema";
import { PROVIDER_MAP, normalizeProviders } from "./types";
import type {
  LeadCandidate,
  ProviderId,
  ProviderReport,
  SearchRunResult,
} from "./types";
import { PROVIDER_RUNNERS } from "./providers";
import {
  checkRelevance,
  domainOf,
  isBlockedArticleUrl,
  normalizeUrl,
  truncateText,
} from "./text";

/** Tope de hallazgos guardados por corrida (evita llenar la base de ruido). */
const MAX_RESULTS = 60;
const DEFAULT_LIMIT_PER_PROVIDER = 20;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface RunSearchOptions {
  query: string;
  providers?: unknown;
  strict?: boolean;
  topicId?: number | null;
  limitPerProvider?: number;
}

/**
 * Corre la búsqueda en todos los proveedores elegidos, filtra ruido, deduplica
 * contra lo ya guardado y persiste los hallazgos nuevos.
 */
export async function runDiscoverySearch(
  options: RunSearchOptions,
): Promise<SearchRunResult> {
  const query = options.query.trim();
  if (!query) {
    throw new Error(
      "Escribí qué querés rastrear: una persona, una institución o un tema.",
    );
  }

  const providers = normalizeProviders(options.providers);
  const strict = options.strict ?? false;
  const limitPerProvider = options.limitPerProvider ?? DEFAULT_LIMIT_PER_PROVIDER;
  const startedAt = Date.now();

  const outcomes = await Promise.all(
    providers.map(async (provider) => {
      const providerStart = Date.now();
      try {
        const candidates = await PROVIDER_RUNNERS[provider](
          query,
          limitPerProvider,
        );
        return {
          provider,
          candidates,
          error: null as string | null,
          ms: Date.now() - providerStart,
        };
      } catch (error) {
        return {
          provider,
          candidates: [] as LeadCandidate[],
          error: errorMessage(error),
          ms: Date.now() - providerStart,
        };
      }
    }),
  );

  const seenUrls = new Set<string>();
  const kept: (LeadCandidate & { normalizedUrl: string; domain: string })[] = [];
  const keptByProvider = new Map<ProviderId, number>();
  let filtered = 0;
  let duplicates = 0;

  for (const outcome of outcomes) {
    for (const candidate of outcome.candidates) {
      const url = (candidate.url ?? "").trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        filtered += 1;
        continue;
      }
      const normalized = normalizeUrl(url);
      if (!normalized || (candidate.type === "article" && isBlockedArticleUrl(normalized))) {
        filtered += 1;
        continue;
      }
      if (!checkRelevance(candidate, query, strict).ok) {
        filtered += 1;
        continue;
      }
      if (seenUrls.has(normalized)) {
        duplicates += 1;
        continue;
      }
      seenUrls.add(normalized);
      kept.push({
        ...candidate,
        title: truncateText(candidate.title, 200),
        normalizedUrl: normalized,
        domain: domainOf(url),
      });
      keptByProvider.set(
        outcome.provider,
        (keptByProvider.get(outcome.provider) ?? 0) + 1,
      );
      if (kept.length >= MAX_RESULTS) break;
    }
    if (kept.length >= MAX_RESULTS) break;
  }

  await ensureSchema();

  const normalizedUrls = kept.map((item) => item.normalizedUrl);
  const rawUrls = kept.map((item) => item.url);

  const [knownRows, onSiteRows] = await Promise.all([
    normalizedUrls.length > 0
      ? db
          .select({
            id: discoveryLeads.id,
            normalizedUrl: discoveryLeads.normalizedUrl,
          })
          .from(discoveryLeads)
          .where(inArray(discoveryLeads.normalizedUrl, normalizedUrls))
      : Promise.resolve([] as { id: number; normalizedUrl: string }[]),
    rawUrls.length > 0
      ? db
          .select({ id: mediaItems.id, url: mediaItems.url })
          .from(mediaItems)
          .where(inArray(mediaItems.url, rawUrls))
      : Promise.resolve([] as { id: number; url: string | null }[]),
  ]);

  const knownByUrl = new Map(knownRows.map((row) => [row.normalizedUrl, row.id]));
  const onSiteUrls = new Set(
    onSiteRows.map((row) => row.url).filter((value): value is string => Boolean(value)),
  );

  const toInsert = kept
    .filter((item) => !knownByUrl.has(item.normalizedUrl))
    .map((item) => ({
      topicId: options.topicId ?? null,
      query,
      provider: item.provider,
      type: item.type,
      title: item.title,
      url: item.url,
      normalizedUrl: item.normalizedUrl,
      sourceName: item.sourceName ?? null,
      sourceDomain: item.domain,
      author: item.author ?? null,
      snippet: item.snippet ?? null,
      thumbnail: item.thumbnail ?? null,
      publishedAt: item.publishedAt ?? null,
      status: onSiteUrls.has(item.url) ? "imported" : "new",
      discoveredAt: new Date(),
      lastSeenAt: new Date(),
    }));

  let insertedIds: number[] = [];
  if (toInsert.length > 0) {
    const rows = await db
      .insert(discoveryLeads)
      .values(toInsert)
      .onConflictDoUpdate({
        target: discoveryLeads.normalizedUrl,
        set: {
          timesSeen: sql`${discoveryLeads.timesSeen} + 1`,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning({
        id: discoveryLeads.id,
        wasInserted: sql<boolean>`(xmax = 0)`.as("was_inserted"),
      });
    insertedIds = rows.filter((row) => row.wasInserted).map((row) => row.id);
  }

  const knownIds = Array.from(knownByUrl.values());
  if (knownIds.length > 0) {
    await db
      .update(discoveryLeads)
      .set({
        timesSeen: sql`${discoveryLeads.timesSeen} + 1`,
        lastSeenAt: new Date(),
      })
      .where(inArray(discoveryLeads.id, knownIds));
  }

  if (options.topicId) {
    await db
      .update(discoveryTopics)
      .set({
        lastRunAt: new Date(),
        lastRunNew: insertedIds.length,
        updatedAt: new Date(),
      })
      .where(inArray(discoveryTopics.id, [options.topicId]));
  }

  const reports: ProviderReport[] = outcomes.map((outcome) => ({
    provider: outcome.provider,
    label: PROVIDER_MAP[outcome.provider].label,
    ok: outcome.error === null,
    error: outcome.error ?? undefined,
    found: outcome.candidates.length,
    kept: keptByProvider.get(outcome.provider) ?? 0,
    ms: outcome.ms,
  }));

  return {
    query,
    providers: reports,
    candidates: outcomes.reduce((total, o) => total + o.candidates.length, 0),
    filtered,
    inserted: insertedIds.length,
    known: knownIds.length,
    duplicates,
    leadIds: insertedIds,
    durationMs: Date.now() - startedAt,
  };
}

/** Corre todos los temas vigilados activos (usado por el cron). */
export async function runAllTopics(): Promise<
  { topicId: number; label: string; result: SearchRunResult | { error: string } }[]
> {
  await ensureSchema();
  const topics = await db.select().from(discoveryTopics);
  const active = topics.filter((topic) => topic.isActive);

  const results: {
    topicId: number;
    label: string;
    result: SearchRunResult | { error: string };
  }[] = [];

  for (const topic of active) {
    try {
      const result = await runDiscoverySearch({
        query: topic.query,
        providers: topic.providers ?? [],
        strict: topic.strictMatch,
        topicId: topic.id,
      });
      results.push({ topicId: topic.id, label: topic.label, result });
    } catch (error) {
      results.push({
        topicId: topic.id,
        label: topic.label,
        result: { error: errorMessage(error) },
      });
    }
  }

  return results;
}
