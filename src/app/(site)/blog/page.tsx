import type { Metadata } from "next";
import Link from "next/link";
import { getDistinctTags, getPublishedPosts } from "@/lib/queries";
import PostCard from "@/components/post-card";
import { SearchIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notas sobre altas capacidades, neuroeducación, inclusión educativa y política educativa, escritas por Elena Kuchimpos.",
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== 1) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tag = params.tag ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const [result, tags] = await Promise.all([
    getPublishedPosts({ page, pageSize: 9, tag, q }),
    getDistinctTags(),
  ]);

  const { items, total, totalPages } = result;
  const isFiltered = Boolean(q || tag);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-600">
          Blog
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink">
          Notas para educar con evidencia
        </h1>
        <p className="mt-3 text-ink/70">
          Altas capacidades, neuroeducación, inclusión y política educativa:
          ideas para familias, docentes y gestores.
        </p>
      </header>

      {/* Buscador */}
      <form
        action="/blog"
        method="get"
        className="mt-8 flex max-w-md items-center gap-2"
        role="search"
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar notas…"
            className="w-full rounded-full border border-ink/15 bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink/40 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          Buscar
        </button>
      </form>

      {/* Filtros por etiqueta */}
      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href="/blog"
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              !tag ? "bg-brand-700 text-white" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:bg-brand-50"
            }`}
          >
            Todas
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              href={`/blog${buildQuery({ tag: t })}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                tag === t
                  ? "bg-brand-700 text-white"
                  : "bg-white text-ink/70 ring-1 ring-ink/10 hover:bg-brand-50"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-ink/55">
        {total === 0
          ? ""
          : `${total} ${total === 1 ? "nota encontrada" : "notas encontradas"}`}
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-white/60 p-12 text-center">
          <p className="font-serif text-xl font-semibold text-ink">
            {isFiltered
              ? "No encontramos resultados"
              : "Todavía no hay notas publicadas"}
          </p>
          <p className="mt-2 text-sm text-ink/60">
            {isFiltered
              ? "Probá con otra palabra o quitá los filtros."
              : "Volvé pronto: el blog se está actualizando."}
          </p>
          {isFiltered && (
            <Link
              href="/blog"
              className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Limpiar filtros
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <nav
          className="mt-12 flex items-center justify-between"
          aria-label="Paginación"
        >
          {page > 1 ? (
            <Link
              href={`/blog${buildQuery({ q, tag, page: page - 1 })}`}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink/60">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/blog${buildQuery({ q, tag, page: page + 1 })}`}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
