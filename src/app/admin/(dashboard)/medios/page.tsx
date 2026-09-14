"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MediaItem } from "@/db/schema";
import { formatDateShort } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/admin/ui";

const TYPE_LABELS: Record<string, string> = {
  video: "Video",
  article: "Nota escrita",
  podcast: "Podcast",
};

export default function MediaAdminPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (type) sp.set("type", type);
      if (status) sp.set("status", status);
      const res = await fetch(`/api/admin/media?${sp.toString()}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [q, type, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleStatus(item: MediaItem) {
    const next = item.status === "published" ? "draft" : "published";
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, status: next } : row)),
    );
    const res = await fetch(`/api/admin/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/media/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Medios"
        description="Entrevistas, notas de prensa, videos y podcasts."
        actions={
          <Link href="/admin/medios/new">
            <Button>+ Nuevo ítem</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por título o fuente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-52"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="video">Videos</option>
          <option value="article">Notas escritas</option>
          <option value="podcast">Podcasts</option>
        </Select>
        <Select
          className="sm:w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Publicados y borradores</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-brand-700">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay ítems de medios"
          description="Cargá entrevistas y notas para que aparezcan en la sección «En los medios»."
          action={
            <Link href="/admin/medios/new">
              <Button>Crear el primero</Button>
            </Link>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {items.map((m, i) => (
            <li
              key={m.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i > 0 ? "border-t border-ink/10" : ""
              }`}
            >
              <div className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream text-xl">
                {m.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden="true">{m.type === "podcast" ? "🎙️" : m.type === "video" ? "🎬" : "📰"}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={m.type === "video" ? "danger" : m.type === "podcast" ? "warning" : "info"}>
                    {TYPE_LABELS[m.type] ?? m.type}
                  </Badge>
                  {m.status !== "published" && <Badge tone="warning">Borrador</Badge>}
                  <span className="truncate text-xs text-ink/50">{m.source}</span>
                </div>
                <p className="mt-1 truncate font-medium text-ink">{m.title}</p>
                <p className="text-xs text-ink/45">{formatDateShort(m.publishedAt)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleStatus(m)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink/60 hover:bg-ink/5"
                >
                  {m.status === "published" ? "Pasar a borrador" : "Publicar"}
                </button>
                <Link
                  href={`/admin/medios/${m.id}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(m)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este ítem?"
        message={`Se eliminará «${toDelete?.title ?? ""}» de forma permanente.`}
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
