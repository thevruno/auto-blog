"use client";

import { useCallback, useEffect, useState } from "react";
import type { Credential } from "@/db/schema";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
  EditIcon,
} from "@/components/icons";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/admin/ui";

type Draft = {
  icon: string;
  title: string;
  institution: string;
  description: string;
  highlight: boolean;
};

const EMPTY_DRAFT: Draft = {
  icon: "🎓",
  title: "",
  institution: "",
  description: "",
  highlight: false,
};

export default function CredentialsPage() {
  const [items, setItems] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number } | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Credential | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credentials");
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setDraft(EMPTY_DRAFT);
    setError("");
    setEditing("new");
  }

  function startEdit(c: Credential) {
    setDraft({
      icon: c.icon,
      title: c.title,
      institution: c.institution,
      description: c.description,
      highlight: c.highlight,
    });
    setError("");
    setEditing({ id: c.id });
  }

  async function save() {
    if (!editing) return;
    if (!draft.title.trim() || !draft.institution.trim() || !draft.description.trim()) {
      setError("Completá título, institución y descripción.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url =
        editing === "new" ? "/api/admin/credentials" : `/api/admin/credentials/${editing.id}`;
      const method = editing === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setSaving(false);
        return;
      }
      setSaving(false);
      setEditing(null);
      load();
    } catch {
      setError("Error de conexión.");
      setSaving(false);
    }
  }

  async function move(id: number, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    await fetch("/api/admin/credentials/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/credentials/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Credenciales"
        description="La línea de tiempo de tu perfil profesional que aparece en la portada."
        actions={<Button onClick={startNew}>+ Nueva credencial</Button>}
      />

      {editing && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-6">
          <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
            {editing === "new" ? "Nueva credencial" : "Editar credencial"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[80px_1fr_1fr]">
            <Field label="Ícono">
              <Input
                value={draft.icon}
                maxLength={4}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                placeholder="🎓"
              />
            </Field>
            <Field label="Título" required>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ej.: Directora General"
              />
            </Field>
            <Field label="Institución" required>
              <Input
                value={draft.institution}
                onChange={(e) =>
                  setDraft({ ...draft, institution: e.target.value })
                }
                placeholder="Ej.: IFOPAC · Concejo Deliberante"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Descripción" required>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.highlight}
              onChange={(e) =>
                setDraft({ ...draft, highlight: e.target.checked })
              }
              className="h-4 w-4 rounded border-ink/30 text-brand-700"
            />
            Destacar (resaltar con color ámbar)
          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : "Guardar"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-20 text-brand-700">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/20 bg-white/60 p-10 text-center text-ink/60">
          Todavía no hay credenciales. Creá la primera para armar tu línea de tiempo.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 ${
                c.highlight ? "border-accent-300" : "border-ink/10"
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">
                {c.icon || "🎓"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {i + 1}. {c.title}
                </p>
                <p className="truncate text-sm text-ink/55">{c.institution}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(c.id, -1)}
                  disabled={i === 0}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink/50 hover:bg-ink/5 disabled:opacity-30"
                  aria-label="Subir"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(c.id, 1)}
                  disabled={i === items.length - 1}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink/50 hover:bg-ink/5 disabled:opacity-30"
                  aria-label="Bajar"
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-brand-700 hover:bg-brand-50"
                  aria-label="Editar"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(c)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                  aria-label="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar esta credencial?"
        message={`Se eliminará «${toDelete?.title ?? ""}» de la línea de tiempo.`}
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
