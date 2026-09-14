export default function PostLoading() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-1.5">
        <div className="skeleton h-4 w-12" />
        <div className="skeleton h-4 w-1.5" />
        <div className="skeleton h-4 w-40" />
      </div>

      {/* Tags skeleton */}
      <div className="mt-8 flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>

      {/* Title skeleton */}
      <div className="skeleton mt-4 h-10 w-full" />
      <div className="skeleton mt-2 h-10 w-3/4" />

      {/* Meta skeleton */}
      <div className="mt-5 flex gap-5">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-4 w-32" />
      </div>

      {/* Cover image skeleton */}
      <div className="skeleton mt-8 aspect-[16/9] w-full rounded-2xl" />

      {/* Content skeleton */}
      <div className="mt-8 space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-8 w-1/3 mt-6" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    </article>
  );
}
