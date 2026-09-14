"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/db/schema";
import { formatDate } from "@/lib/utils";
import { ExternalIcon } from "@/components/icons";
import YoutubeEmbed from "@/components/youtube-embed";

type Filter = "all" | "video" | "article" | "podcast";

const LABELS: Record<string, string> = {
  video: "Video",
  article: "Nota escrita",
  podcast: "Podcast",
};

const BADGE_STYLES: Record<string, string> = {
  video: "bg-red-50 text-red-700",
  article: "bg-brand-50 text-brand-700",
  podcast: "bg-accent-50 text-accent-700",
};

export default function MediaExplorer({ items }: { items: MediaItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      video: items.filter((i) => i.type === "video").length,
      article: items.filter((i) => i.type === "article").length,
      podcast: items.filter((i) => i.type === "podcast").length,
    }),
    [items],
  );

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [items, filter],
  );

  const buttons: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "video", label: "Videos" },
    { key: "article", label: "Notas escritas" },
    { key: "podcast", label: "Podcasts" },
  ];

  return (
    <div>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar por tipo de medio"
      >
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={filter === b.key}
            onClick={() => setFilter(b.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === b.key
                ? "bg-brand-700 text-white"
                : "bg-white text-ink/70 ring-1 ring-ink/10 hover:bg-brand-50 hover:text-brand-800"
            }`}
          >
            {b.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[b.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-ink/20 bg-white/60 p-10 text-center text-ink/60">
          Todavía no hay apariciones en medios de este tipo.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {filtered.map((item) => {
            const isVideo = item.type === "video" && item.embedUrl;
            return (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm"
              >
                {isVideo ? (
                  <YoutubeEmbed
                    embedUrl={item.embedUrl!}
                    title={item.title}
                    thumbnail={item.thumbnail}
                  />
                ) : (
                  <div className="aspect-[16/9] overflow-hidden bg-brand-100">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.thumbnailAlt || item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-4xl">
                        {item.type === "podcast" ? "🎙️" : "📰"}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STYLES[item.type]}`}
                    >
                      {LABELS[item.type]}
                    </span>
                    <span className="text-xs text-ink/55">
                      {item.source}
                      {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-semibold leading-snug text-ink">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/65">
                      {item.description}
                    </p>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-700 hover:underline"
                    >
                      Ver publicación
                      <ExternalIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
