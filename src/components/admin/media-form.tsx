"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaItem } from "@/db/schema";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from "@/components/admin/ui";
import ImageField from "@/components/admin/image-field";

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toYoutubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function MediaForm({ initial }: { initial?: MediaItem | null }) {
  const isEdit = Boolean(initial?.id);
  const router = useRouter();

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    type: initial?.type ?? "video",
    source: initial?.source ?? "",
    publishedAt: initial?.publishedAt
      ? toDateInput(new Date(initial.publishedAt))
      : "",
    url: initial?.url ?? "",
    embedUrl: initial?.embedUrl ?? "",
    thumbnail: initial?.thumbnail ?? "",
    thumbnailAlt: initial?.thumbnailAlt ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "published",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const patch = (partial: Partial<typeof form>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.source.trim()) {
      setError("El título y la fuente/medio son obligatorios.");
      return;
    }
    if (form.thumbnail && !form.thumbnailAlt.trim()) {
      setError("Si cargás una miniatura, completá su texto alternativo (alt).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/media/${initial!.id}` : "/api/admin/media",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            publishedAt: form.publishedAt
              ? new Date(form.publishedAt).toISOString()
              : null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setSaving(false);
        return;
      }
      router.push("/admin/medios");
      router.refresh();
    } catch {
      setError("Error de conexión al guardar.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/admin/media/${initial!.id}`, { method: "DELETE" });
      router.push("/admin/medios");
      router.refresh();
    } catch {
      setDeleting(false);
      setError("No se pudo eliminar el ítem.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? "Editar ítem de medios" : "Nuevo ítem de medios"}
        description="Entrevistas, notas de prensa, videos y podcasts."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/medios")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : "Guardar"}
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
          <Field label="Título" htmlFor="media-title" required>
            <Input
              id="media-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Ej.: El desafío de educar mentes brillantes"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="media-type" required>
              <Select
                id="media-type"
                value={form.type}
                onChange={(e) => patch({ type: e.target.value })}
              >
                <option value="video">Video</option>
                <option value="article">Nota escrita</option>
                <option value="podcast">Podcast</option>
              </Select>
            </Field>
            <Field label="Fuente / medio" htmlFor="media-source" required>
              <Input
                id="media-source"
                value={form.source}
                onChange={(e) => patch({ source: e.target.value })}
                placeholder="Ej.: Canal 12, Diario X"
              />
            </Field>
          </div>

          <Field label="Fecha" htmlFor="media-date">
            <Input
              id="media-date"
              type="date"
              value={form.publishedAt}
              onChange={(e) => patch({ publishedAt: e.target.value })}
            />
          </Field>

          <Field
            label="Link externo"
            htmlFor="media-url"
            hint="URL de la nota, el artículo o el episodio original."
          >
            <Input
              id="media-url"
              type="url"
              value={form.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://…"
            />
          </Field>

          <Field
            label="URL de embed (YouTube)"
            htmlFor="media-embed"
            hint="Pegá un link de YouTube; se convierte a formato embed automáticamente."
          >
            <Input
              id="media-embed"
              value={form.embedUrl}
              onChange={(e) => {
                const v = e.target.value;
                const converted = toYoutubeEmbed(v);
                patch({ embedUrl: converted ?? v });
              }}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </Field>

          <Field
            label="Estado en el sitio"
            htmlFor="media-status"
            hint="Los ítems importados desde el rastreo web entran como borrador."
          >
            <Select
              id="media-status"
              value={form.status}
              onChange={(e) => patch({ status: e.target.value })}
            >
              <option value="published">Publicado</option>
              <option value="draft">Borrador (no visible en el sitio)</option>
            </Select>
          </Field>

          <Field label="Descripción breve" htmlFor="media-desc">
            <Textarea
              id="media-desc"
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Una o dos líneas de contexto…"
            />
          </Field>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
              Miniatura
            </h2>
            <ImageField
              label="Imagen de miniatura"
              value={form.thumbnail}
              onChange={(url) => patch({ thumbnail: url })}
              alt={form.thumbnailAlt}
              onAltChange={(alt) => patch({ thumbnailAlt: alt })}
              altRequired
            />
          </div>

          {isEdit && (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
              <h2 className="font-serif text-lg font-semibold text-red-700">
                Zona de riesgo
              </h2>
              <Button
                type="button"
                variant="danger"
                className="mt-3"
                onClick={() => setConfirmOpen(true)}
              >
                Eliminar ítem
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar este ítem?"
        message="Esta acción es permanente y no se puede deshacer."
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}
