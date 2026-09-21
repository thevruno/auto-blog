import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getPublishedPostBySlug,
  getRelatedPosts,
  getSiteProfile,
} from "@/lib/queries";
import { absoluteUrl, formatDate, timeAgo } from "@/lib/utils";
import RichText from "@/components/rich-text";
import PostCard from "@/components/post-card";
import { Calendar, Clock, Tag, ChevronRight } from "lucide-react";

export const revalidate = 3600;

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

  const image = resolveImage(post.coverImage) ?? absoluteUrl("/og-default.png");

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      url: absoluteUrl(`/blog/${post.slug}`),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: [image],
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
    publisher: {
      "@type": "Person",
      name: profile?.name ?? "Elena Kuchimpos",
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    wordCount: post.content ? post.content.split(/\s+/).length : undefined,
    articleSection: post.tags?.[0] ?? "Educación",
  };

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
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: absoluteUrl(`/blog/${post.slug}`),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Breadcrumbs */}
        <nav
          className="flex items-center gap-1.5 text-sm text-ink/45 animate-fade-in"
          aria-label="Miga de pan"
        >
          <Link
            href="/blog"
            className="transition-colors duration-200 hover:text-brand-700"
          >
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-ink/60 line-clamp-1">{post.title}</span>
        </nav>

        <header className="mt-8 animate-slide-up">
          {post.tags && post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 transition-colors duration-200 hover:bg-brand-100 hover:text-brand-700"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl md:text-[2.75rem] md:leading-[1.15]">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/50">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
            {post.publishedAt && (
              <span className="text-ink/40">{timeAgo(post.publishedAt)}</span>
            )}
            {post.readingTime ? (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingTime} min de lectura
              </span>
            ) : null}
            {post.tags && post.tags.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                {post.tags.join(", ")}
              </span>
            )}
          </div>
        </header>

        {post.coverImage && (
          <div className="relative mt-8 overflow-hidden rounded-2xl shadow-card">
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, 1200px"
              className="aspect-[16/9] w-full object-cover"
              priority
            />
          </div>
        )}

        <div className="prose-article mt-8">
          <RichText html={post.content} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-8 border-t border-brand-100 pt-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
              También te puede interesar
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <div
                key={p.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <PostCard post={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
