import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublishedPostBySlug,
  getRelatedPosts,
  getSiteProfile,
} from "@/lib/queries";
import { absoluteUrl, formatDate } from "@/lib/utils";
import RichText from "@/components/rich-text";
import PostCard from "@/components/post-card";
import { CalendarIcon, ClockIcon, TagIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") ? absoluteUrl(url) : url;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Nota no encontrada" };

  const image = resolveImage(post.coverImage);

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      type: "article",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      url: absoluteUrl(`/blog/${post.slug}`),
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, profile] = await Promise.all([
    getPublishedPostBySlug(slug),
    getSiteProfile(),
  ]);

  if (!post) notFound();

  const related = await getRelatedPosts(post.id, post.tags ?? [], 3);
  const image = resolveImage(post.coverImage);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: image ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: {
      "@type": "Person",
      name: profile?.name ?? "Elena Kuchimpos",
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav className="text-sm text-ink/55" aria-label="Miga de pan">
          <Link href="/blog" className="hover:text-brand-700">
            Blog
          </Link>
          <span className="mx-1.5">/</span>
          <span>{post.title}</span>
        </nav>

        <header className="mt-6">
          {post.tags && post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl md:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/55">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
            {post.readingTime ? (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                {post.readingTime} min de lectura
              </span>
            ) : null}
            {post.tags && post.tags.length > 0 && (
              <span className="flex items-center gap-1.5">
                <TagIcon className="h-4 w-4" />
                {post.tags.join(", ")}
              </span>
            )}
          </div>
        </header>

        {post.coverImage && (
          <div className="mt-8 overflow-hidden rounded-2xl">
            <img
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              className="aspect-[16/9] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div className="mt-8">
          <RichText html={post.content} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-ink">
            También te puede interesar
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
