import { fetchMutualContacts, type MutualContact } from "@/lib/mutualContacts";

export const revalidate = 0;

function formatFollowers(n: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function MutualContactsPage() {
  let contacts: MutualContact[] = [];
  try {
    contacts = await fetchMutualContacts();
  } catch {
    // show empty state
  }

  const in3Plus = contacts.filter((c) => c.artistCount >= 3).length;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16 pb-24">

        {/* Hero */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 text-orange-400 text-xs font-semibold uppercase tracking-[0.08em] mb-5">
            Exclusive Insight
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-4">
            Contacts in multiple{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              artist networks
            </span>
          </h1>
          <p className="text-[#a0a0a0] text-lg leading-relaxed max-w-2xl">
            These people are trusted by more than one established artist. Reaching them multiplies your impact — one DM, multiple doors.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-8">
            <div>
              <p className="text-3xl font-black text-orange-500">{contacts.length}</p>
              <p className="text-xs text-[#505050] mt-1 uppercase tracking-[0.08em]">
                Contacts in 2+ networks
              </p>
            </div>
            {in3Plus > 0 && (
              <div>
                <p className="text-3xl font-black text-orange-500">{in3Plus}</p>
                <p className="text-xs text-[#505050] mt-1 uppercase tracking-[0.08em]">
                  In 3+ networks
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact list */}
        {contacts.length === 0 ? (
          <div className="text-center py-24 text-[#505050]">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg font-medium text-[#a0a0a0]">No mutual contacts found</p>
            <p className="text-sm mt-2">Check back later as we add more artist networks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((c, index) => (
              <div
                key={c.username}
                className="bg-white/[0.025] border border-white/[0.08] rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-white/[0.15] hover:-translate-y-0.5 transition-all duration-200"
                style={{
                  animation: "fadeInUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94) both",
                  animationDelay: `${Math.min(index * 40, 300)}ms`,
                }}
              >
                {/* Left: index + username */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-bold text-[#303030] w-6 flex-shrink-0 tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`https://instagram.com/${c.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        @{c.username}
                      </a>
                      {c.artistCount >= 3 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider flex-shrink-0">
                          Highest Priority
                        </span>
                      )}
                    </div>
                    {c.fullName && (
                      <p className="text-xs text-[#606060] mt-0.5 truncate">{c.fullName}</p>
                    )}
                  </div>
                </div>

                {/* Middle: artist badges */}
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:justify-center">
                  {c.artists.map((artist) => (
                    <span
                      key={artist}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400/80 border border-orange-500/20 whitespace-nowrap"
                    >
                      {artist}
                    </span>
                  ))}
                  <span className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.06em] whitespace-nowrap ml-1">
                    IN {c.artistCount} NETWORKS
                  </span>
                </div>

                {/* Right: type + followers */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-xs text-[#606060]">{c.profileType}</p>
                  {c.followers > 0 && (
                    <p className="text-xs text-[#404040] mt-0.5">
                      {formatFollowers(c.followers)} followers
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
