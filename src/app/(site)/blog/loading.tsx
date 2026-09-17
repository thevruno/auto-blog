export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6">
      {/* Header skeleton */}
      <div className="max-w-2xl">
        <div className="skeleton h-5 w-24 rounded-full" />
        <div className="skeleton mt-4 h-10 w-80" />
        <div className="skeleton mt-3 h-5 w-96" />
      </div>

      {/* Search skeleton */}
      <div className="mt-8 flex max-w-md items-center gap-2">
        <div className="skeleton h-10 flex-1 rounded-full" />
        <div className="skeleton h-10 w-20 rounded-full" />
      </div>

      {/* Tags skeleton */}
      <div className="mt-5 flex gap-2">
        <div className="skeleton h-8 w-14 rounded-full" />
        <div className="skeleton h-8 w-16 rounded-full" />
        <div className="skeleton h-8 w-20 rounded-full" />
        <div className="skeleton h-8 w-12 rounded-full" />
      </div>

      {/* Cards skeleton */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-brand-100/60 bg-white"
          >
            <div className="skeleton aspect-[16/10] w-full" />
            <div className="p-5">
              <div className="flex gap-1.5">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-12 rounded-full" />
              </div>
              <div className="skeleton mt-3 h-6 w-3/4" />
              <div className="skeleton mt-2 h-4 w-full" />
              <div className="skeleton mt-1 h-4 w-2/3" />
              <div className="mt-4 border-t border-brand-100/60 pt-4">
                <div className="flex justify-between">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-3 w-14" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
