"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Post } from "@/db/schema";
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

function statusOf(p: Post): { label: string; tone: "neutral" | "success" | "warning" } {
  if (p.status === "draft") return { label: "Borrador", tone: "neutral" };
  if (p.publishedAt && new Date(p.publishedAt).getTime() > Date.now()) {
    return { label: "Programada", tone: "warning" };
  }
  return { label: "Publicada", tone: "success" };
}

export default function PostsAdminPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [toDelete, setToDelete] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (status) sp.set("status", status);
      const res = await fetch(`/api/admin/posts?${sp.toString()}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/posts/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notas del blog"
        description="Creá, editá y publicá tus notas."
        actions={
          <Link href="/admin/posts/new">
            <Button>+ Nueva nota</Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por título…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          className="sm:w-52"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="published">Publicadas</option>
          <option value="draft">Borradores</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-brand-700">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={q || status ? "No hay notas que coincidan" : "Todavía no hay notas"}
          description={
            q || status
              ? "Probá con otros filtros."
              : "Creá tu primera nota para que aparezca en el blog."
          }
          action={
            <Link href="/admin/posts/new">
              <Button>Crear la primera nota</Button>
            </Link>
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {items.map((p, i) => {
            const s = statusOf(p);
            return (
              <li
                key={p.id}
                className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${
                  i > 0 ? "border-t border-ink/10" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    {p.readingTime ? (
                      <span className="text-xs text-ink/45">{p.readingTime} min</span>
                    ) : null}
                  </div>
                  <Link
                    href={`/admin/posts/${p.id}`}
                    className="mt-1 block truncate font-medium text-ink hover:text-brand-700"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {p.slug} · {formatDateShort(p.publishedAt ?? p.updatedAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {p.status === "published" && (
                    <a
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-ink/60 hover:bg-ink/5"
                    >
                      Ver
                    </a>
                  )}
                  <Link
                    href={`/admin/posts/${p.id}`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setToDelete(p)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar esta nota?"
        message={`Se eliminará «${toDelete?.title ?? ""}» de forma permanente.`}
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
