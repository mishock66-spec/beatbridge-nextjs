export default function ArtistLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Back link skeleton */}
        <div className="h-4 w-24 bg-white/[0.05] rounded animate-pulse mb-10" />

        {/* Artist header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-12">
          <div className="w-32 h-32 rounded-xl bg-white/[0.05] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-16 bg-white/[0.05] rounded-full animate-pulse" />
            <div className="h-10 w-56 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-40 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-full max-w-lg bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-3/4 max-w-lg bg-white/[0.05] rounded animate-pulse" />
          </div>
          <div className="w-32 h-20 bg-white/[0.05] rounded-2xl animate-pulse flex-shrink-0" />
        </div>

        {/* Cards skeleton grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111111] rounded-2xl p-6 flex flex-col gap-4 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-32 bg-white/[0.05] rounded" />
                  <div className="h-3 w-24 bg-white/[0.05] rounded" />
                  <div className="h-3 w-16 bg-white/[0.05] rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-white/[0.05] rounded" />
                <div className="h-3 w-5/6 bg-white/[0.05] rounded" />
              </div>
              <div className="flex gap-2 mt-auto">
                <div className="flex-1 h-10 bg-white/[0.05] rounded-lg" />
                <div className="flex-1 h-10 bg-white/[0.05] rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
