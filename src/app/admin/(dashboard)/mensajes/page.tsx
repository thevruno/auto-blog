"use client";

import { useCallback, useEffect, useState } from "react";
import type { Message } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/admin/ui";

export default function MessagesPage() {
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async (): Promise<Message[]> => {
    const res = await fetch("/api/admin/messages");
    const data = await res.json();
    return data.items ?? [];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchList());
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  // Carga inicial sin `setState` sincrónico dentro del efecto, y sin pisar el
  // estado si el componente ya se desmontó.
  useEffect(() => {
    let alive = true;
    fetchList()
      .then((items) => {
        if (alive) setItems(items);
      })
      .catch((error) => {
        console.error("No se pudieron cargar los mensajes:", error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchList]);

  async function toggleRead(m: Message) {
    await fetch(`/api/admin/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: !m.isRead }),
    });
    load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/messages/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  const unread = items.filter((m) => !m.isRead).length;

  return (
    <div>
      <PageHeader
        title="Mensajes de contacto"
        description={
          unread > 0
            ? `${unread} ${unread === 1 ? "mensaje sin leer" : "mensajes sin leer"}`
            : "Todos los mensajes fueron leídos."
        }
      />

      {loading ? (
        <div className="grid place-items-center py-20 text-brand-700">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay mensajes"
          description="Cuando alguien complete el formulario de contacto de la web, el mensaje aparecerá acá."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((m) => {
            const isOpen = expanded === m.id;
            return (
              <li
                key={m.id}
                className={`rounded-2xl border bg-white transition ${
                  m.isRead ? "border-ink/10" : "border-accent-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      m.isRead ? "bg-ink/20" : "bg-accent-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{m.name}</span>
                      {!m.isRead && <Badge tone="warning">Nuevo</Badge>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink/55">
                      {m.message}
                    </span>
                    <span className="mt-1 block text-xs text-ink/40">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-ink/10 px-5 py-4">
                    <p className="text-sm text-ink/60">
                      De:{" "}
                      <a href={`mailto:${m.email}`} className="font-medium text-brand-700">
                        {m.email}
                      </a>
                    </p>
                    <p className="mt-3 whitespace-pre-wrap rounded-lg bg-cream/70 p-4 text-sm leading-relaxed text-ink">
                      {m.message}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" onClick={() => toggleRead(m)}>
                        {m.isRead ? "Marcar como no leído" : "Marcar como leído"}
                      </Button>
                      <Button variant="ghost" onClick={() => setToDelete(m)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este mensaje?"
        message="Se eliminará de forma permanente."
        confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
