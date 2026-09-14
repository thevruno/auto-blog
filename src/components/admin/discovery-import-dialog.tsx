"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiscoveryLead, MediaItem, Post } from "@/db/schema";
import {
  Button,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/components/admin/ui";

const DEFAULT_TYPE: Record<string, string> = {
  video: "video",
  podcast: "podcast",
  article: "article",
  social: "article",
};

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function DiscoveryImportDialog({
  lead,
  onClose,
  onImported,
}: {
  lead: DiscoveryLead | null;
  onClose: () => void;
  onImported: (result: {
    mediaItem: MediaItem;
    post: Post | null;
    leadId: number;
  }) => void;
}) {
  const [form, setForm] = useState(() => ({
    title: lead?.title ?? "",
    type: lead ? (DEFAULT_TYPE[lead.type] ?? "article") : "article",
    source: lead?.sourceName ?? "",
    url: lead?.url ?? "",
    publishedAt: toDateInput(lead?.publishedAt),
    description: lead?.snippet ?? "",
    thumbnail: lead?.thumbnail ?? "",
    thumbnailAlt: "",
    tags: "",
    publish: false,
    createPost: false,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ mediaItem: MediaItem; post: Post | null } | null>(
    null,
  );

  if (!lead) return null;

  const patch = (partial: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  async function submit() {
    if (!lead) return;
    setSaving(true);
    setError("");

    const overrides: Record<string, string> = {};
    if (form.title.trim()) overrides.title = form.title.trim();
    if (form.type) overrides.type = form.type;
    if (form.source.trim()) overrides.source = form.source.trim();
    if (form.url.trim()) overrides.url = form.url.trim();
    if (form.description.trim()) overrides.description = form.description.trim();
    if (form.thumbnail.trim()) overrides.thumbnail = form.thumbnail.trim();
    if (form.thumbnailAlt.trim()) overrides.thumbnailAlt = form.thumbnailAlt.trim();
    if (form.publishedAt) overrides.publishedAt = form.publishedAt;

    try {
      const res = await fetch("/api/admin/discovery/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          publish: form.publish,
          createPost: form.createPost,
          tags: form.tags,
          overrides,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo repostear el hallazgo.");
        setSaving(false);
        return;
      }
      setDone({ mediaItem: data.mediaItem, post: data.post ?? null });
      onImported({
        mediaItem: data.mediaItem,
        post: data.post ?? null,
        leadId: lead.id,
      });
    } catch {
      setError("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="Repostear hallazgo en la web"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink">
              Repostear en la web
            </h2>
            <p className="mt-0.5 text-xs text-ink/55">
              Se crea un ítem en «En los medios» con los datos del hallazgo. Si
              además pedís una nota, se crea como borrador del blog.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-ink/50 hover:bg-ink/5"
          >
            Cerrar
          </button>
        </div>

        {done ? (
          <div className="space-y-4 px-6 py-6">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              ¡Listo! El hallazgo se agregó al sitio como{" "}
              {done.mediaItem.status === "published" ? "público" : "borrador"}.
            </div>
            <ul className="space-y-2 text-sm text-ink/75">
              <li>
                <Link
                  href={`/admin/medios/${done.mediaItem.id}`}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Editar el ítem de medios →
                </Link>
                <span className="ml-2 text-ink/50">
                  {done.mediaItem.title}
                </span>
              </li>
              {done.post && (
                <li>
                  <Link
                    href={`/admin/posts/${done.post.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Editar el borrador de nota →
                  </Link>
                  <span className="ml-2 text-ink/50">{done.post.title}</span>
                </li>
              )}
              <li>
                <a
                  href={done.mediaItem.url ?? lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Ver la publicación original →
                </a>
              </li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Volver al rastreo
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            {error && (
              <div
                className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Título" htmlFor="import-title" required>
                  <Input
                    id="import-title"
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Tipo de contenido" htmlFor="import-type">
                <Select
                  id="import-type"
                  value={form.type}
                  onChange={(e) => patch({ type: e.target.value })}
                >
                  <option value="article">Nota escrita</option>
                  <option value="video">Video</option>
                  <option value="podcast">Podcast</option>
                </Select>
              </Field>

              <Field label="Fuente / medio" htmlFor="import-source">
                <Input
                  id="import-source"
                  value={form.source}
                  onChange={(e) => patch({ source: e.target.value })}
                  placeholder="Ej.: La Voz, Canal 12…"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Link original" htmlFor="import-url">
                  <Input
                    id="import-url"
                    value={form.url}
                    onChange={(e) => patch({ url: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Fecha de publicación" htmlFor="import-date">
                <Input
                  id="import-date"
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => patch({ publishedAt: e.target.value })}
                />
              </Field>

              <Field
                label="Etiquetas de la nota"
                htmlFor="import-tags"
                hint="Separadas por coma (solo si creás la nota)."
              >
                <Input
                  id="import-tags"
                  value={form.tags}
                  onChange={(e) => patch({ tags: e.target.value })}
                  placeholder="Educación, Entrevistas"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Descripción" htmlFor="import-description">
                  <Textarea
                    id="import-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="URL de la miniatura"
                  htmlFor="import-thumb"
                  hint="Dejalo vacío y el sistema intenta tomarla de la publicación original."
                >
                  <Input
                    id="import-thumb"
                    value={form.thumbnail}
                    onChange={(e) => patch({ thumbnail: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
              </div>

              {form.thumbnail && (
                <div className="sm:col-span-2">
                  <Field
                    label="Texto alternativo (alt)"
                    htmlFor="import-thumb-alt"
                    hint="Obligatorio para accesibilidad si hay miniatura."
                  >
                    <Input
                      id="import-thumb-alt"
                      value={form.thumbnailAlt}
                      onChange={(e) => patch({ thumbnailAlt: e.target.value })}
                      placeholder="Ej.: Elena Kuchimpos entrevistada en un estudio de TV"
                    />
                  </Field>
                  <div className="mt-3 h-32 w-56 overflow-hidden rounded-lg border border-ink/10 bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-cream/60 p-4">
              <label className="flex items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={form.publish}
                  onChange={(e) => patch({ publish: e.target.checked })}
                />
                <span>
                  <span className="font-medium">Publicar en el sitio ahora</span>
                  <span className="block text-xs text-ink/55">
                    Si lo dejás sin marcar, el ítem queda como borrador en
                    «Medios» hasta que lo revises.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={form.createPost}
                  onChange={(e) => patch({ createPost: e.target.checked })}
                />
                <span>
                  <span className="font-medium">
                    Crear también un borrador de nota del blog
                  </span>
                  <span className="block text-xs text-ink/55">
                    Incluye el contexto del hallazgo y el link a la publicación
                    original, listo para ampliar.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? <Spinner className="h-4 w-4" /> : "Repostear"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
