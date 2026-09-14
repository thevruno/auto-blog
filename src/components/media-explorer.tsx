"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/db/schema";
import { formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import YoutubeEmbed from "@/components/youtube-embed";

type Filter = "all" | "video" | "article" | "podcast";

const LABELS: Record<string, string> = {
  video: "Video",
  article: "Nota escrita",
  podcast: "Podcast",
};

const BADGE_STYLES: Record<string, string> = {
  video: "bg-red-50 text-red-600 ring-red-100",
  article: "bg-brand-50 text-brand-600 ring-brand-100",
  podcast: "bg-accent-50 text-accent-700 ring-accent-100",
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
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              filter === b.key
                ? "bg-brand-700 text-white shadow-sm"
                : "bg-white text-ink/60 ring-1 ring-brand-100 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {b.label}
            <span className="ml-1.5 text-xs opacity-60">{counts[b.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
          <p className="text-ink/50">Todavía no hay apariciones en medios de este tipo.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {filtered.map((item, i) => {
            const isVideo = item.type === "video" && item.embedUrl;
            return (
              <article
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-brand-100/60 bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {isVideo ? (
                  <YoutubeEmbed
                    embedUrl={item.embedUrl!}
                    title={item.title}
                    thumbnail={item.thumbnail}
                  />
                ) : (
                  <div className="relative aspect-[16/9] overflow-hidden bg-brand-50">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.thumbnailAlt || item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-brand-100/50">
                        <span className="text-4xl opacity-30">
                          {item.type === "podcast" ? "🎙️" : "📰"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE_STYLES[item.type]}`}
                    >
                      {LABELS[item.type]}
                    </span>
                    <span className="text-xs text-ink/45">
                      {item.source}
                      {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-semibold leading-snug text-ink transition-colors duration-200 group-hover:text-brand-700">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/55">
                      {item.description}
                    </p>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-700 transition-all duration-200 hover:gap-2.5 hover:text-brand-800"
                    >
                      Ver publicación
                      <ExternalLink className="h-3.5 w-3.5" />
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
