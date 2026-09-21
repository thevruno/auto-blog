import type { Metadata } from "next";
import Link from "next/link";
import { getDistinctTags, getPublishedPosts } from "@/lib/queries";
import PostCard from "@/components/post-card";
import { Search } from "lucide-react";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notas sobre altas capacidades, neuroeducación, inclusión educativa y política educativa, escritas por Elena Kuchimpos.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog · Elena Kuchimpos",
    description:
      "Notas sobre altas capacidades, neuroeducación, inclusión educativa y política educativa, escritas por Elena Kuchimpos.",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Blog de Elena Kuchimpos",
      },
    ],
  },
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

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: absoluteUrl("/blog"),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6">
      <header className="max-w-2xl animate-fade-in">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
          Blog
        </span>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Notas para educar con evidencia
        </h1>
        <p className="mt-4 text-lg text-ink/65">
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
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar notas…"
            className="w-full rounded-full border border-brand-100 bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink/35 transition-all duration-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98]"
        >
          Buscar
        </button>
      </form>

      {/* Filtros por etiqueta */}
      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href="/blog"
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              !tag
                ? "bg-brand-700 text-white shadow-sm"
                : "bg-white text-ink/60 ring-1 ring-brand-100 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            Todas
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              href={`/blog${buildQuery({ tag: t })}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                tag === t
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-white text-ink/60 ring-1 ring-brand-100 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-ink/50">
        {total === 0
          ? ""
          : `${total} ${total === 1 ? "nota encontrada" : "notas encontradas"}`}
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 p-12 text-center">
          <p className="font-serif text-xl font-semibold text-ink">
            {isFiltered
              ? "No encontramos resultados"
              : "Todavía no hay notas publicadas"}
          </p>
          <p className="mt-2 text-sm text-ink/55">
            {isFiltered
              ? "Probá con otra palabra o quitá los filtros."
              : "Volvé pronto: el blog se está actualizando."}
          </p>
          {isFiltered && (
            <Link
              href="/blog"
              className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md"
            >
              Limpiar filtros
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post, i) => (
            <div
              key={post.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <PostCard post={post} />
            </div>
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
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200/60 shadow-sm transition-all duration-200 hover:bg-brand-50 hover:ring-brand-300 hover:shadow-md"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink/50">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/blog${buildQuery({ q, tag, page: page + 1 })}`}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200/60 shadow-sm transition-all duration-200 hover:bg-brand-50 hover:ring-brand-300 hover:shadow-md"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
    </>
  );
}
