"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DiscoveryLead, DiscoveryTopic, MediaItem, Post } from "@/db/schema";
import { formatDateShort, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/admin/ui";
import DiscoveryLeadCard from "@/components/admin/discovery-lead-card";
import DiscoveryImportDialog from "@/components/admin/discovery-import-dialog";
import {
  PROVIDERS,
  type LeadCounts,
  type ProviderId,
  type ProviderReport,
  type SearchRunResult,
} from "@/lib/discovery/types";

const EMPTY_COUNTS: LeadCounts = {
  total: 0,
  new: 0,
  saved: 0,
  imported: 0,
  discarded: 0,
  open: 0,
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "open", label: "Pendientes" },
  { value: "new", label: "Sin revisar" },
  { value: "saved", label: "Para repostear" },
  { value: "imported", label: "En el sitio" },
  { value: "discarded", label: "Descartados" },
  { value: "all", label: "Todos" },
];

const PAGE_SIZE = 10;

// Caché de la última búsqueda (solo lectura, se inicializa una vez)
function getCachedQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    const cached = sessionStorage.getItem("discovery:lastQuery");
    return cached ? JSON.parse(cached).query ?? "" : "";
  } catch {
    return "";
  }
}

function getCachedFilters(): { status: string; type: string } {
  if (typeof window === "undefined") return { status: "open", type: "" };
  try {
    const cached = sessionStorage.getItem("discovery:lastQuery");
    if (!cached) return { status: "open", type: "" };
    const parsed = JSON.parse(cached);
    return { status: parsed.status || "open", type: parsed.type || "" };
  } catch {
    return { status: "open", type: "" };
  }
}

export default function DiscoveryPanel() {
  const [topics, setTopics] = useState<DiscoveryTopic[]>([]);
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [counts, setCounts] = useState<LeadCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [reports, setReports] = useState<ProviderReport[] | null>(null);
  const [summary, setSummary] = useState<SearchRunResult | null>(null);
  const [newIds, setNewIds] = useState<number[]>([]);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const [query, setQuery] = useState(getCachedQuery);
  const [strict, setStrict] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<ProviderId[]>(
    PROVIDERS.map((provider) => provider.id),
  );

  const [filters, setFilters] = useState(() => ({ q: "", ...getCachedFilters() }));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [topicFormOpen, setTopicFormOpen] = useState(false);
  const [topicDraft, setTopicDraft] = useState({ label: "", query: "", strict: false });
  const [editingTopic, setEditingTopic] = useState<{
    id: number;
    label: string;
    query: string;
    strict: boolean;
  } | null>(null);

  const [importTarget, setImportTarget] = useState<DiscoveryLead | null>(null);
  const [toDelete, setToDelete] = useState<DiscoveryLead | null>(null);
  const [busyLead, setBusyLead] = useState<number | null>(null);
  const [busyTopic, setBusyTopic] = useState<number | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);
  const [toDiscardClear, setToDiscardClear] = useState(false);

  const loadTopics = useCallback(async () => {
    const res = await fetch("/api/admin/discovery/topics");
    if (!res.ok) return;
    const data = await res.json();
    setTopics(data.topics ?? []);
    const primary = (data.topics ?? []).find((topic: DiscoveryTopic) => topic.isPrimary);
    setQuery((current) => current || primary?.query || data.topics?.[0]?.query || "");
  }, []);

  const loadLeads = useCallback(async (resetPage = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.status) params.set("status", filters.status);
      if (filters.type) params.set("type", filters.type);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(resetPage ? 0 : (page - 1) * PAGE_SIZE));
      const res = await fetch(`/api/admin/discovery?${params.toString()}`);
      if (!res.ok) {
        setMessage({ tone: "error", text: "No se pudieron cargar los hallazgos." });
        return;
      }
      const data = await res.json();
      const newItems = data.items ?? [];
      const total = data.total ?? 0;
      const newTotalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

      if (resetPage) {
        setLeads(newItems);
        setPage(1);
      } else {
        setLeads((prev) => [...prev, ...newItems]);
      }
      setTotalPages(newTotalPages);
      setHasMore(page * PAGE_SIZE < total);
      setCounts(data.counts ?? EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    // Diferido para no llamar a setState dentro del cuerpo del efecto.
    const timer = setTimeout(() => void loadTopics(), 0);
    return () => clearTimeout(timer);
  }, [loadTopics]);

  // Cargar leads iniciales
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLeads(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadLeads]);

  const activeTopics = useMemo(
    () => topics.filter((topic) => topic.isActive),
    [topics],
  );

  function toggleProvider(id: ProviderId) {
    setSelectedProviders((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function runSearch(payload: { query?: string; topicId?: number }) {
    const label = payload.topicId
      ? `tema «${topics.find((topic) => topic.id === payload.topicId)?.label ?? ""}»`
      : `«${payload.query ?? query}»`;

    setRunning(label);
    setMessage(null);
    setReports(null);
    setSummary(null);

    try {
      const res = await fetch("/api/admin/discovery/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload.topicId
            ? { topicId: payload.topicId, strict }
            : {
                query: payload.query ?? query,
                providers: selectedProviders,
                strict,
              },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          tone: "error",
          text: data.error ?? "No se pudo completar el rastreo.",
        });
        return;
      }

      const result = data.result as SearchRunResult;
      setReports(result.providers);
      setSummary(result);
      setNewIds(result.leadIds ?? []);
      setCounts((data.counts as LeadCounts) ?? EMPTY_COUNTS);
      if (filters.status === "open" || filters.status === "all" || filters.status === "new") {
        setLeads(data.items ?? []);
      } else {
        void loadLeads(true);
      }
      void loadTopics();

      // Guardar en caché
      if (typeof window !== "undefined") {
        sessionStorage.setItem("discovery:lastQuery", JSON.stringify({
          query: payload.query ?? query,
          status: filters.status,
          type: filters.type,
        }));
      }

      setMessage({
        tone: "ok",
        text:
          result.inserted > 0
            ? `Rastreo terminado: ${result.inserted} hallazgo(s) nuevo(s).`
            : "Rastreo terminado: no hay novedades (ya tenías todo guardado).",
      });
    } catch {
      setMessage({ tone: "error", text: "Error de conexión durante el rastreo." });
    } finally {
      setRunning(null);
    }
  }

  async function runAllTopics() {
    if (activeTopics.length === 0) {
      setMessage({ tone: "error", text: "Todavía no hay temas vigilados." });
      return;
    }
    for (const topic of activeTopics) {
      await runSearch({ topicId: topic.id });
    }
    setMessage({
      tone: "ok",
      text: `Listo: se rastrearon ${activeTopics.length} tema(s).`,
    });
  }

  async function saveTopicAsWatched() {
    const label = topicDraft.label.trim() || query.trim();
    const searchQuery = topicDraft.query.trim() || query.trim();
    if (!label || !searchQuery) {
      setMessage({ tone: "error", text: "Completá el nombre y la búsqueda del tema." });
      return;
    }

    setSavingTopic(true);
    try {
      const res = await fetch("/api/admin/discovery/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          query: searchQuery,
          strict: topicDraft.strict,
          providers: selectedProviders,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "No se pudo guardar el tema." });
        return;
      }
      setTopicDraft({ label: "", query: "", strict: false });
      setTopicFormOpen(false);
      setMessage({ tone: "ok", text: `Tema «${label}» agregado al rastreo.` });
      void loadTopics();
    } finally {
      setSavingTopic(false);
    }
  }

  async function updateTopic(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/discovery/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ tone: "error", text: data.error ?? "No se pudo actualizar el tema." });
      return;
    }
    setEditingTopic(null);
    void loadTopics();
  }

  async function deleteTopic(id: number) {
    setBusyTopic(id);
    try {
      const res = await fetch(`/api/admin/discovery/topics/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setMessage({ tone: "error", text: "No se pudo eliminar el tema." });
        return;
      }
      setMessage({ tone: "ok", text: "Tema eliminado. Los hallazgos se conservan." });
      void loadTopics();
    } finally {
      setBusyTopic(null);
    }
  }

  async function changeStatus(lead: DiscoveryLead, status: string) {
    setBusyLead(lead.id);
    try {
      const res = await fetch(`/api/admin/discovery/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setMessage({ tone: "error", text: "No se pudo actualizar el hallazgo." });
        return;
      }
      const data = await res.json();
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? data.item : item)),
      );
      void loadLeads();
    } finally {
      setBusyLead(null);
    }
  }

  async function deleteLead() {
    if (!toDelete) return;
    setBusyLead(toDelete.id);
    try {
      await fetch(`/api/admin/discovery/${toDelete.id}`, { method: "DELETE" });
      setLeads((current) => current.filter((item) => item.id !== toDelete.id));
      setNewIds((current) => current.filter((id) => id !== toDelete.id));
      setToDelete(null);
      void loadLeads();
    } finally {
      setBusyLead(null);
    }
  }

  async function clearDiscarded() {
    const res = await fetch("/api/admin/discovery?status=discarded", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setToDiscardClear(false);
    setMessage({
      tone: "ok",
      text: `Se eliminaron ${data.deleted ?? 0} hallazgo(s) descartado(s).`,
    });
    void loadLeads();
  }

  function handleImported(result: {
    mediaItem: MediaItem;
    post: Post | null;
    leadId: number;
  }) {
    setLeads((current) =>
      current.map((item) =>
        item.id === result.leadId
          ? {
              ...item,
              status: "imported",
              mediaItemId: result.mediaItem.id,
              postId: result.post?.id ?? null,
            }
          : item,
      ),
    );
    setMessage({
      tone: "ok",
      text: result.post
        ? "Hallazgo reposteado: ítem de medios y borrador de nota creados."
        : "Hallazgo reposteado en «En los medios».",
    });
    setImportTarget(null);
    void loadLeads();
  }

  const providerReportsById = useMemo(() => {
    const map = new Map<string, ProviderReport>();
    for (const report of reports ?? []) map.set(report.provider, report);
    return map;
  }, [reports]);

  return (
    <div>
      <PageHeader
        title="Rastreo web"
        description="Buscá y seguí notas, videos, podcasts y posteos sobre una persona o un tema para republicarlos en el sitio."
      />

      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            message.tone === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {message.text}
        </div>
      )}

      {/* ------------------------------------------------ Búsqueda */}
      <section className="rounded-2xl border border-ink/10 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Buscar en internet
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          El sistema consulta buscadores, YouTube, podcasts y redes en paralelo y
          guarda cada hallazgo para que lo revises antes de publicarlo.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              type="search"
              value={query}
              placeholder="Ej.: Elena Kuchimpos"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch({ query: e.currentTarget.value });
              }}
              aria-label="Qué querés rastrear"
            />
          </div>
          <Button onClick={() => void runSearch({ query })} disabled={Boolean(running)}>
            {running && !running.startsWith("tema") ? (
              <Spinner className="h-4 w-4" />
            ) : (
              "Rastrear ahora"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setTopicDraft({ label: query, query, strict });
              setTopicFormOpen(true);
            }}
            disabled={Boolean(running)}
          >
            + Tema vigilado
          </Button>
        </div>

        {topicFormOpen && (
          <div className="mt-4 grid gap-3 rounded-xl bg-cream/60 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Nombre del tema" htmlFor="topic-label">
              <Input
                id="topic-label"
                value={topicDraft.label}
                onChange={(e) =>
                  setTopicDraft((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="Elena Kuchimpos"
              />
            </Field>
            <Field
              label="Búsqueda"
              htmlFor="topic-query"
              hint="Podés usar comillas o sumar palabras: «Elena Kuchimpos» altas capacidades"
            >
              <Input
                id="topic-query"
                value={topicDraft.query}
                onChange={(e) =>
                  setTopicDraft((prev) => ({ ...prev, query: e.target.value }))
                }
                placeholder="Elena Kuchimpos"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button onClick={() => void saveTopicAsWatched()} disabled={savingTopic}>
                {savingTopic ? (
                  <span className="flex items-center gap-1.5">
                    <Spinner className="h-4 w-4" />
                    Guardando…
                  </span>
                ) : (
                  "Guardar tema"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setTopicFormOpen(false)} disabled={savingTopic}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Fuentes a consultar
          </p>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((provider) => {
              const active = selectedProviders.includes(provider.id);
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => toggleProvider(provider.id)}
                  aria-pressed={active}
                  title={provider.detail}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-brand-700 text-white"
                      : "bg-white text-ink/60 ring-1 ring-ink/15 hover:bg-brand-50"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {provider.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
          />
          <span>
            <span className="font-medium">Coincidencia estricta</span>
            <span className="block text-xs text-ink/55">
              Exige que aparezcan todas las palabras buscadas. Útil para nombres
              comunes; deja afuera menciones más sueltas.
            </span>
          </span>
        </label>

        {summary && (
          <div className="mt-5 rounded-xl border border-ink/10 bg-cream/50 p-4">
            <p className="text-sm text-ink/75">
              <strong>{summary.inserted}</strong> hallazgo(s) nuevo(s) ·{" "}
              <strong>{summary.known}</strong> ya conocidos ·{" "}
              <strong>{summary.filtered}</strong> descartados por relevancia ·{" "}
              {(summary.durationMs / 1000).toFixed(1)}s
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.providers.map((report) => {
                const active = selectedProviders.includes(report.provider);
                return (
                  <span
                    key={report.provider}
                    title={report.error ?? report.label}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                      !active
                        ? "bg-ink/5 text-ink/40"
                        : report.ok
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {report.ok ? "✓" : "!"} {report.label}
                    <span className="opacity-70">
                      {report.ok ? `${report.kept} resultados` : report.error}
                    </span>
                  </span>
                );
              })}
            </div>
            {reports && reports.some((report) => !report.ok) && (
              <p className="mt-3 text-xs leading-relaxed text-ink/55">
                Las fuentes marcadas con «!» no respondieron. Suele pasar por
                límites de consultas o porque el servidor no tiene salida a
                internet: probá de nuevo en unos minutos o desde el sitio
                publicado.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ Temas vigilados */}
      <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">
              Temas vigilados
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Guardá los temas que querés seguir y rastreá todos con un clic (o
              programá <code className="text-xs">/api/cron/discovery</code>).
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void runAllTopics()}
            disabled={Boolean(running) || activeTopics.length === 0}
          >
            {running?.startsWith("tema") ? (
              <Spinner className="h-4 w-4" />
            ) : (
              "Rastrear todos los temas"
            )}
          </Button>
        </div>

        {topics.length === 0 ? (
          <p className="mt-4 text-sm text-ink/55">
            Todavía no hay temas vigilados. Buscá algo y tocá «+ Tema vigilado».
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {topics.map((topic) => {
              const isEditing = editingTopic?.id === topic.id;
              return (
                <li key={topic.id} className="flex flex-wrap items-center gap-3 py-3">
                  {isEditing ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        className="max-w-xs"
                        value={editingTopic.label}
                        onChange={(e) =>
                          setEditingTopic({ ...editingTopic, label: e.target.value })
                        }
                        aria-label="Nombre del tema"
                      />
                      <Input
                        className="max-w-sm"
                        value={editingTopic.query}
                        onChange={(e) =>
                          setEditingTopic({ ...editingTopic, query: e.target.value })
                        }
                        aria-label="Búsqueda del tema"
                      />
                      <Button
                        onClick={() =>
                          void updateTopic(topic.id, {
                            label: editingTopic.label,
                            query: editingTopic.query,
                            strict: editingTopic.strict,
                          })
                        }
                      >
                        Guardar
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingTopic(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium text-ink">
                          {topic.label}
                          {topic.isPrimary && <Badge tone="info">Principal</Badge>}
                          {!topic.isActive && <Badge>Pausado</Badge>}
                        </p>
                        <p className="truncate text-xs text-ink/55">
                          «{topic.query}»
                          {topic.lastRunAt
                            ? ` · última corrida ${formatDateTime(topic.lastRunAt)} (${topic.lastRunNew} nuevo/s)`
                            : " · todavía sin rastrear"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void runSearch({ topicId: topic.id })}
                          disabled={Boolean(running)}
                          className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                        >
                          Rastrear
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingTopic({
                              id: topic.id,
                              label: topic.label,
                              query: topic.query,
                              strict: topic.strictMatch,
                            })
                          }
                          className="rounded-lg px-2.5 py-2 text-xs font-medium text-ink/60 hover:bg-ink/5"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void updateTopic(topic.id, { isActive: !topic.isActive })
                          }
                          className="rounded-lg px-2.5 py-2 text-xs font-medium text-ink/60 hover:bg-ink/5"
                        >
                          {topic.isActive ? "Pausar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteTopic(topic.id)}
                          disabled={busyTopic === topic.id}
                          className="rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busyTopic === topic.id ? (
                            <span className="flex items-center gap-1.5">
                              <Spinner className="h-3 w-3" />
                              Eliminando…
                            </span>
                          ) : (
                            "Eliminar"
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------ Biblioteca */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">
              Hallazgos guardados
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              {counts.open} pendiente(s) · {counts.imported} ya en el sitio ·{" "}
              {counts.total} en total
            </p>
          </div>
          {counts.discarded > 0 && (
            <Button variant="ghost" onClick={() => setToDiscardClear(true)}>
              Vaciar descartados ({counts.discarded})
            </Button>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Buscar en los hallazgos…"
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            />
          </div>
          <Select
            className="sm:w-44"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            aria-label="Filtrar por estado"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            className="sm:w-44"
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            <option value="article">Notas y prensa</option>
            <option value="video">Videos</option>
            <option value="podcast">Podcasts</option>
            <option value="social">Redes sociales</option>
          </Select>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20 text-brand-700">
            <Spinner className="h-6 w-6" />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            title="Sin hallazgos para mostrar"
            description="Hacé una búsqueda arriba para ver notas, videos y posteos sobre el tema."
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead) => (
                <DiscoveryLeadCard
                  key={lead.id}
                  lead={lead}
                  isNew={newIds.includes(lead.id)}
                  busy={busyLead === lead.id}
                  onStatus={(status) => void changeStatus(lead, status)}
                  onImport={() => setImportTarget(lead)}
                  onDelete={() => setToDelete(lead)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => void loadLeads(false)}
                  disabled={loading}
                >
                  {loading ? <Spinner className="h-4 w-4" /> : `Cargar más (página ${page + 1} de ${totalPages})`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {providerReportsById.size === 0 && (
        <p className="mt-8 text-xs leading-relaxed text-ink/45">
          ¿No aparece nada? Revisá que el servidor tenga salida a internet y que
          la búsqueda no sea demasiado específica. Podés guardar un tema vigilado
          y volver a rastrear más tarde: los hallazgos nuevos quedan resaltados.
        </p>
      )}

      <DiscoveryImportDialog
        key={importTarget?.id ?? "sin-hallazgo"}
        lead={importTarget}
        onClose={() => setImportTarget(null)}
        onImported={handleImported}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este hallazgo?"
        message={`Se quita «${toDelete?.title ?? ""}» de la lista. La publicación original no se modifica.`}
        confirmLabel={busyLead === toDelete?.id ? "Eliminando…" : "Sí, eliminar"}
        busy={busyLead === toDelete?.id}
        onConfirm={deleteLead}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={toDiscardClear}
        title="¿Vaciar los descartados?"
        message={`Se eliminarán ${counts.discarded} hallazgo(s) marcados como descartados.`}
        confirmLabel="Sí, vaciar"
        onConfirm={clearDiscarded}
        onCancel={() => setToDiscardClear(false)}
      />

      <p className="mt-10 text-xs text-ink/45">
        Última fecha de hallazgo más reciente:{" "}
        {leads[0]?.discoveredAt ? formatDateShort(leads[0].discoveredAt) : "—"}
      </p>
    </div>
  );
}
