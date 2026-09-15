"use client";

import { useState } from "react";
import { PlayIcon } from "@/components/icons";

export default function YoutubeEmbed({
  embedUrl,
  title,
  thumbnail,
}: {
  embedUrl: string;
  title: string;
  thumbnail?: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-brand-950">
      {playing ? (
        <iframe
          src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1&rel=0`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Reproducir video: ${title}`}
        >
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- la miniatura viene de la fuente original (YouTube, Pexels o cualquier sitio rastreado), así que no se puede optimizar con next/image sin listar cada dominio.
            <img
              src={thumbnail}
              alt={title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-800 to-brand-950" />
          )}
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-brand-800 shadow-lg transition group-hover:scale-105">
              <PlayIcon className="h-7 w-7 translate-x-0.5" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
