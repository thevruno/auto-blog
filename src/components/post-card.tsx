import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/db/schema";
import { formatDate, timeAgo } from "@/lib/utils";
import { ArrowRight, Clock } from "lucide-react";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-brand-100/60 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-[16/10] overflow-hidden bg-brand-50"
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.coverImageAlt || post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-brand-100/50">
            <span className="text-4xl opacity-40">📚</span>
          </div>
        )}
        {/* Overlay sutil en hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-serif text-lg font-semibold leading-snug text-ink transition-colors duration-200 group-hover:text-brand-700">
          <Link href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/60">
          {post.excerpt}
        </p>

        <div className="mt-auto">
          <div className="mt-4 border-t border-brand-100/60 pt-4 text-xs text-ink/50">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{formatDate(post.publishedAt)}</span>
              {post.publishedAt && (
                <span className="shrink-0 text-ink/40">{timeAgo(post.publishedAt)}</span>
              )}
            </div>
            {post.readingTime ? (
              <div className="mt-1.5 flex items-center gap-1 text-ink/40">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{post.readingTime} min de lectura</span>
              </div>
            ) : null}
          </div>

          <Link
            href={`/blog/${post.slug}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-all duration-200 hover:gap-2.5 hover:text-brand-800"
          >
            Leer nota
            <ArrowRight className="h-4 w-4 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </article>
  );
}
