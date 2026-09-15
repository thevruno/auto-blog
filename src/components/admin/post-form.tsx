"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { Button, ConfirmDialog, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/admin/ui";
import RichTextEditor from "@/components/admin/rich-text-editor";
import ImageField from "@/components/admin/image-field";
import { useDraft } from "@/components/admin/use-draft";
import { ChevronDown, ChevronUp } from "lucide-react";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  tagsText: string;
  coverImage: string;
  coverImageAlt: string;
  status: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function PostForm({ initial }: { initial?: Post | null }) {
  const isEdit = Boolean(initial?.id);
  const router = useRouter();
  const storageKey = isEdit
    ? `ek_draft_post_${initial!.id}`
    : "ek_draft_post_new";

  const defaultState: FormState = {
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    tagsText: (initial?.tags ?? []).join(", "),
    coverImage: initial?.coverImage ?? "",
    coverImageAlt: initial?.coverImageAlt ?? "",
    status: initial?.status ?? "draft",
    publishedAt: initial?.publishedAt
      ? toLocalInput(new Date(initial.publishedAt))
      : "",
    metaTitle: initial?.metaTitle ?? "",
    metaDescription: initial?.metaDescription ?? "",
    content: initial?.content ?? "",
  };

  const { value, setValue, restored, discard } = useDraft<FormState>(
    storageKey,
    defaultState,
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [seoOpen, setSeoOpen] = useState(true);
  const slugTouched = useRef(Boolean(initial?.slug));

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((d) => setSuggestions(d.tags ?? []))
      .catch(() => {});
  }, []);

  const patch = (partial: Partial<FormState>) =>
    setValue((prev) => ({ ...prev, ...partial }));

  function handleTitleChange(title: string) {
    const next: Partial<FormState> = { title };
    if (!slugTouched.current) next.slug = slugify(title);
    patch(next);
  }

  const isScheduled =
    value.status === "published" &&
    value.publishedAt &&
    new Date(value.publishedAt).getTime() > Date.now();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!value.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!value.content.trim()) {
      setError("La nota no puede quedar sin contenido.");
      return;
    }
    if (value.coverImage && !value.coverImageAlt.trim()) {
      setError("Si cargás una imagen, completá su texto alternativo (alt).");
      return;
    }

    setSaving(true);
    const payload = {
      title: value.title,
      slug: value.slug,
      excerpt: value.excerpt,
      content: value.content,
      coverImage: value.coverImage,
      coverImageAlt: value.coverImageAlt,
      tags: value.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: value.status,
      publishedAt: value.publishedAt
        ? new Date(value.publishedAt).toISOString()
        : null,
      metaTitle: value.metaTitle,
      metaDescription: value.metaDescription,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/admin/posts/${initial!.id}` : "/api/admin/posts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar la nota.");
        setSaving(false);
        return;
      }
      discard();
      router.push("/admin/posts");
      router.refresh();
    } catch {
      setError("Error de conexión al guardar.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/admin/posts/${initial!.id}`, { method: "DELETE" });
      discard();
      router.push("/admin/posts");
      router.refresh();
    } catch {
      setDeleting(false);
      setError("No se pudo eliminar la nota.");
    }
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://elenakuchimpos.com";

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? "Editar nota" : "Nueva nota del blog"}
        description="Completá el contenido y la información de SEO. Se guarda como borrador automáticamente en este dispositivo."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/posts")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : "Guardar nota"}
            </Button>
          </>
        }
      />

      {restored && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-800">
          <span>
            <strong>Borrador restaurado</strong> desde el autoguardado de este
            dispositivo.
          </span>
          <button
            type="button"
            onClick={discard}
            className="font-semibold underline underline-offset-2"
          >
            Descartar
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6 min-w-0">
          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <div className="space-y-4">
              <Field label="Título" htmlFor="post-title" required>
                <Input
                  id="post-title"
                  value={value.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ej.: Altas capacidades: mitos y verdades"
                />
              </Field>

              <Field
                label="URL (slug)"
                htmlFor="post-slug"
                hint="Se genera solo desde el título, pero podés editarlo."
              >
                <Input
                  id="post-slug"
                  value={value.slug}
                  onChange={(e) => {
                    slugTouched.current = true;
                    patch({ slug: slugify(e.target.value) });
                  }}
                  placeholder="altas-capacidades-mitos-y-verdades"
                />
              </Field>

              <Field label="Extracto" htmlFor="post-excerpt" hint="Resumen corto que aparece en las tarjetas del blog.">
                <Textarea
                  id="post-excerpt"
                  rows={3}
                  value={value.excerpt}
                  onChange={(e) => patch({ excerpt: e.target.value })}
                  placeholder="Un resumen de una o dos líneas…"
                />
              </Field>

              <Field
                label="Categorías / etiquetas"
                htmlFor="post-tags"
                hint="Separá con comas. Ej.: Altas Capacidades, Neuroeducación"
              >
                <Input
                  id="post-tags"
                  value={value.tagsText}
                  onChange={(e) => patch({ tagsText: e.target.value })}
                  placeholder="Altas Capacidades, Inclusión"
                />
                {suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const current = value.tagsText
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean);
                          if (!current.includes(s)) {
                            patch({ tagsText: [...current, s].join(", ") });
                          }
                        }}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Contenido</p>
                <div className="min-h-[400px]">
                  <RichTextEditor
                    value={value.content}
                    onChange={(html) => patch({ content: html })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
              Publicación
            </h2>
            <div className="space-y-4">
              <Field label="Estado" htmlFor="post-status">
                <Select
                  id="post-status"
                  value={value.status}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </Select>
              </Field>

              <Field
                label="Fecha de publicación"
                htmlFor="post-date"
                hint={
                  isScheduled
                    ? "Programada: se publicará en la fecha indicada."
                    : "Si elegís una fecha futura, la nota queda programada."
                }
              >
                <Input
                  id="post-date"
                  type="datetime-local"
                  value={value.publishedAt}
                  onChange={(e) => patch({ publishedAt: e.target.value })}
                />
              </Field>
              {isScheduled && (
                <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
                  ⏰ Esta nota está programada para publicarse más adelante.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
              Imagen destacada
            </h2>
            <ImageField
              label="Imagen de portada"
              value={value.coverImage}
              onChange={(url) => patch({ coverImage: url })}
              alt={value.coverImageAlt}
              onAltChange={(alt) => patch({ coverImageAlt: alt })}
              altRequired
              hint="Se usa en las tarjetas del blog y al compartir en redes."
            />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="flex w-full items-center justify-between p-6 pb-0 text-left"
            >
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">
                  SEO
                </h2>
                <p className="mt-0.5 text-xs text-ink/50">
                  Así se verá esta nota en los resultados de búsqueda.
                </p>
              </div>
              {seoOpen ? (
                <ChevronUp className="h-5 w-5 flex-shrink-0 text-ink/40" />
              ) : (
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-ink/40" />
              )}
            </button>

            {seoOpen && (
              <div className="p-6 pt-4">
                <div className="mb-4 rounded-lg border border-ink/10 bg-ink/[0.02] p-3">
                  <p className="truncate text-xs text-ink/40">
                    {origin}/blog/{value.slug || "…"}
                  </p>
                  <p className="text-[#1a0dab] text-base leading-snug">
                    {value.metaTitle || value.title || "Título de la nota"}
                  </p>
                  <p className="line-clamp-2 text-sm text-ink/60">
                    {value.metaDescription || value.excerpt || "Descripción de la nota…"}
                  </p>
                </div>

                <div className="space-y-4">
                  <Field
                    label={`Meta título (${value.metaTitle.length}/60)`}
                    htmlFor="post-meta-title"
                  >
                    <Input
                      id="post-meta-title"
                      value={value.metaTitle}
                      onChange={(e) => patch({ metaTitle: e.target.value.slice(0, 70) })}
                      placeholder="Título optimizado para buscadores"
                    />
                  </Field>
                  <Field
                    label={`Meta descripción (${value.metaDescription.length}/155)`}
                    htmlFor="post-meta-desc"
                  >
                    <Textarea
                      id="post-meta-desc"
                      rows={3}
                      value={value.metaDescription}
                      onChange={(e) =>
                        patch({ metaDescription: e.target.value.slice(0, 170) })
                      }
                      placeholder="Descripción breve y atractiva para buscadores"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {isEdit && (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
              <h2 className="font-serif text-lg font-semibold text-red-700">
                Zona de riesgo
              </h2>
              <p className="mt-1 text-sm text-red-700/80">
                Eliminar una nota es permanente y no se puede deshacer.
              </p>
              <Button
                type="button"
                variant="danger"
                className="mt-3"
                onClick={() => setConfirmOpen(true)}
              >
                Eliminar nota
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar esta nota?"
        message="Esta acción es permanente y no se puede deshacer."
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}
