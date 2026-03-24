export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header skeleton */}
        <div className="mb-10 space-y-3">
          <div className="h-3 w-28 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-8 w-40 bg-white/[0.05] rounded animate-pulse" />
          <div className="h-3 w-36 bg-white/[0.05] rounded animate-pulse" />
        </div>

        {/* Stats row skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 space-y-2 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-3 w-16 bg-white/[0.05] rounded" />
              <div className="h-8 w-10 bg-white/[0.05] rounded" />
              <div className="h-3 w-24 bg-white/[0.05] rounded" />
            </div>
          ))}
        </div>

        {/* Artist sections skeleton */}
        {Array.from({ length: 2 }).map((_, a) => (
          <div key={a} className="mb-12">
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 mb-4 animate-pulse">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-white/[0.05] rounded" />
                </div>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-[#111111] border border-[#1f1f1f] rounded-xl animate-pulse"
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
