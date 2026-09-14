"use client";

import type { DiscoveryLead } from "@/db/schema";
import { formatDateShort } from "@/lib/utils";
import { ExternalIcon } from "@/components/icons";
import { Badge } from "@/components/admin/ui";
import { LEAD_STATUS_LABELS, LEAD_TYPE_LABELS, PROVIDER_MAP, isProviderId } from "@/lib/discovery/types";

const TYPE_EMOJI: Record<string, string> = {
  article: "📰",
  video: "🎬",
  podcast: "🎙️",
  social: "💬",
};

const STATUS_TONE: Record<string, "success" | "warning" | "info" | "danger" | "neutral"> = {
  new: "warning",
  saved: "info",
  imported: "success",
  discarded: "neutral",
};

export default function DiscoveryLeadCard({
  lead,
  isNew = false,
  busy = false,
  onStatus,
  onImport,
  onDelete,
}: {
  lead: DiscoveryLead;
  isNew?: boolean;
  busy?: boolean;
  onStatus: (status: string) => void;
  onImport: () => void;
  onDelete: () => void;
}) {
  const providerLabel = isProviderId(lead.provider)
    ? PROVIDER_MAP[lead.provider].label
    : lead.provider;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
        isNew ? "border-accent-300 ring-2 ring-accent-200" : "border-ink/10"
      }`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-cream">
        {lead.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl" aria-hidden="true">
            {TYPE_EMOJI[lead.type] ?? "🔎"}
          </div>
        )}
        {isNew && (
          <span className="absolute left-3 top-3 rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-bold text-brand-950">
            Nuevo
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={STATUS_TONE[lead.status] ?? "neutral"}>
            {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
          </Badge>
          <Badge tone="neutral">{LEAD_TYPE_LABELS[lead.type] ?? lead.type}</Badge>
          <span className="text-xs text-ink/45">{providerLabel}</span>
        </div>

        <h3 className="font-serif text-base font-semibold leading-snug text-ink">
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-700 hover:underline"
          >
            {lead.title}
          </a>
        </h3>

        <p className="mt-1 text-xs text-ink/55">
          {[lead.sourceName, lead.author].filter(Boolean).join(" · ") ||
            lead.sourceDomain}
          {lead.publishedAt ? ` · ${formatDateShort(lead.publishedAt)}` : ""}
        </p>

        {lead.snippet && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/65">
            {lead.snippet}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {lead.status === "imported" ? (
            <span className="text-xs font-semibold text-emerald-700">
              Ya está en el sitio
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onImport}
              className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
            >
              Repostear en la web
            </button>
          )}

          {lead.status !== "saved" && lead.status !== "imported" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("saved")}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-50 disabled:opacity-50"
            >
              Guardar
            </button>
          )}

          {lead.status !== "discarded" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("discarded")}
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-ink/60 transition hover:bg-ink/5 disabled:opacity-50"
            >
              Descartar
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus("saved")}
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
            >
              Recuperar
            </button>
          )}

          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-ink/60 transition hover:bg-ink/5"
          >
            Ver original
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="ml-auto rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}
