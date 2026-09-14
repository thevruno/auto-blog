import Link from "next/link";
import type { Post } from "@/db/schema";
import { formatDate } from "@/lib/utils";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/blog/${post.slug}`}
        className="block aspect-[16/10] overflow-hidden bg-brand-100"
      >
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.coverImageAlt || post.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-brand-100 text-4xl">
            📚
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-serif text-lg font-semibold leading-snug text-ink">
          <Link
            href={`/blog/${post.slug}`}
            className="transition hover:text-brand-700"
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/65">
          {post.excerpt}
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4 text-xs text-ink/55">
          <span>{formatDate(post.publishedAt)}</span>
          {post.readingTime ? (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {post.readingTime} min
            </span>
          ) : null}
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:gap-2.5"
        >
          Leer nota
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
