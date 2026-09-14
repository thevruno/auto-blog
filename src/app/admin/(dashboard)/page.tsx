import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  credentials,
  discoveryLeads,
  mediaItems,
  messages,
  posts,
} from "@/db/schema";
import { ensureSchemaSafe } from "@/db/bootstrap";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalPosts, publishedPosts, totalMedia, totalMessages, unreadMessages, totalCredentials, recent, pendingLeads] =
    await Promise.all([
      db.select({ value: count() }).from(posts),
      db.select({ value: count() }).from(posts).where(eq(posts.status, "published")),
      db.select({ value: count() }).from(mediaItems),
      db.select({ value: count() }).from(messages),
      db.select({ value: count() }).from(messages).where(eq(messages.isRead, false)),
      db.select({ value: count() }).from(credentials),
      db.select().from(messages).orderBy(desc(messages.createdAt)).limit(5),
      (async () => {
        if (!(await ensureSchemaSafe())) return [{ value: 0 }];
        return db
          .select({ value: count() })
          .from(discoveryLeads)
          .where(inArray(discoveryLeads.status, ["new", "saved"]));
      })(),
    ]);

  const stats = [
    { label: "Notas del blog", value: totalPosts[0]?.value ?? 0, href: "/admin/posts", icon: "📝" },
    { label: "Publicadas", value: publishedPosts[0]?.value ?? 0, href: "/admin/posts", icon: "✅" },
    { label: "Ítems de medios", value: totalMedia[0]?.value ?? 0, href: "/admin/medios", icon: "🎬" },
    { label: "Hallazgos por revisar", value: pendingLeads[0]?.value ?? 0, href: "/admin/rastreo", icon: "🔎" },
    { label: "Mensajes sin leer", value: unreadMessages[0]?.value ?? 0, href: "/admin/mensajes", icon: "✉️" },
    { label: "Credenciales", value: totalCredentials[0]?.value ?? 0, href: "/admin/credenciales", icon: "🏆" },
  ];

  return (
    <div>
      <PageHeader
        title="Hola, ¡bienvenida al panel!"
        description="Gestioná el contenido de tu sitio desde acá, sin tocar código."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden="true">
                {s.icon}
              </span>
              <span className="font-serif text-3xl font-semibold text-ink">
                {s.value}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-ink/60">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-ink">
              Últimos mensajes de contacto
            </h2>
            <Link href="/admin/mensajes" className="text-sm font-semibold text-brand-700 hover:underline">
              Ver todos
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-ink/55">
              Todavía no recibiste mensajes desde la web.
            </p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {recent.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {m.name}
                      {!m.isRead && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-accent-500" />
                      )}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink/55">{m.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink/45">
                    {formatDateTime(m.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Acciones rápidas
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/admin/posts/new"
              className="rounded-lg bg-brand-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              + Nueva nota del blog
            </Link>
            <Link
              href="/admin/medios/new"
              className="rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-50"
            >
              + Nuevo ítem de medios
            </Link>
            <Link
              href="/admin/rastreo"
              className="rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-50"
            >
              🔎 Buscar menciones en internet
            </Link>
            <Link
              href="/admin/perfil"
              className="rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-50"
            >
              Editar perfil
            </Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink/50">
            Consejo: escribí tus notas como borrador y publicalas cuando estén
            listas. Podés programar la fecha de publicación a futuro.
          </p>
        </section>
      </div>
    </div>
  );
}
