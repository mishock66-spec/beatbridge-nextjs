"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const CANDIDATES = [
  {
    slug: "pierre-bourne",
    name: "Pi'erre Bourne",
    label: "Pi'erre Bourne",
    genre: "Atlanta · SoundCloud Rap",
    photo: "https://unavatar.io/instagram/pierrebourne",
  },
  {
    slug: "murda-beatz",
    name: "Murda Beatz",
    label: "Murda on the Beat",
    genre: "Toronto · Trap",
    photo: "https://unavatar.io/instagram/murdabeatz_",
  },
  {
    slug: "tay-keith",
    name: "Tay Keith",
    label: "Tay Keith",
    genre: "Memphis · Trap",
    photo: "https://unavatar.io/instagram/taykeith",
  },
  {
    slug: "nick-mira",
    name: "Nick Mira",
    label: "Nick Mira",
    genre: "Virginia · Melodic Trap",
    photo: "https://unavatar.io/instagram/nickmira",
  },
  {
    slug: "the-alchemist",
    name: "The Alchemist",
    label: "Alc",
    genre: "NYC · Boom-Bap",
    photo: "https://unavatar.io/instagram/alchemist",
  },
];

type VoteCounts = Record<string, number>;

export default function VoteClient({
  initialCounts,
  initialUserVotes,
}: {
  initialCounts: VoteCounts;
  initialUserVotes: string[];
}) {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [counts, setCounts] = useState<VoteCounts>(initialCounts);
  const [userVotes, setUserVotes] = useState<string[]>(initialUserVotes);
  const [voting, setVoting] = useState<string | null>(null);

  const remaining = 3 - userVotes.length;

  const totalVotes = Object.values(counts).reduce((s, v) => s + v, 0);

  const sorted = [...CANDIDATES].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0)
  );

  const handleVote = async (slug: string) => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.push("/sign-in?redirect_url=/vote");
      return;
    }

    if (userVotes.includes(slug)) {
      toast.error("You already voted for this artist.");
      return;
    }

    if (remaining <= 0) {
      toast.error("You've used all 3 votes.");
      return;
    }

    setVoting(slug);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, candidateSlug: slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "max_votes_reached") {
          toast.error("You've used all 3 votes.");
        } else if (data.error === "already_voted") {
          toast.error("Already voted for this artist.");
          setUserVotes((prev) => [...prev, slug]);
        } else {
          toast.error("Something went wrong. Try again.");
        }
        return;
      }

      setCounts((prev) => ({ ...prev, [slug]: (prev[slug] ?? 0) + 1 }));
      setUserVotes((prev) => [...prev, slug]);
      toast.success("Vote cast!");
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-500 text-xs font-medium mb-6 tracking-[0.1em] uppercase">
          Community Vote
        </div>
        <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-4">
          Who drops{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
            next?
          </span>
        </h1>
        <p className="text-[#a0a0a0] text-lg leading-relaxed max-w-md mx-auto">
          You decide which artist network we map next. Each account gets{" "}
          <span className="text-white font-medium">3 votes</span>.
        </p>
      </div>

      {/* Vote counter */}
      <div className="mb-8 flex items-center justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              i < userVotes.length
                ? "bg-orange-500 border-orange-500"
                : "border-white/20 bg-white/[0.03]"
            }`}
          >
            {i < userVotes.length && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ))}
        <p className="text-sm text-[#606060] ml-1">
          {remaining > 0
            ? `${remaining} vote${remaining !== 1 ? "s" : ""} remaining`
            : "All votes cast — thank you!"}
        </p>
      </div>

      {/* Candidate cards */}
      <div className="space-y-3 mb-12">
        {sorted.map((c, idx) => {
          const voteCount = counts[c.slug] ?? 0;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const voted = userVotes.includes(c.slug);
          const isVoting = voting === c.slug;
          const isLeader = idx === 0 && voteCount > 0;

          return (
            <div
              key={c.slug}
              className={`relative rounded-xl border p-4 transition-all duration-200 overflow-hidden ${
                voted
                  ? "bg-orange-500/[0.07] border-orange-500/30"
                  : "bg-white/[0.025] border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              {/* Progress bar background */}
              <div
                className="absolute inset-0 bg-orange-500/[0.04] transition-all duration-500 pointer-events-none"
                style={{ width: `${pct}%` }}
              />

              <div className="relative flex items-center gap-4">
                {/* Rank */}
                <span className="w-5 text-xs font-bold text-[#404040] text-center flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.photo}
                    alt={c.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Name + genre */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-white truncate">{c.name}</p>
                    {isLeader && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider flex-shrink-0">
                        Leading
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#606060]">{c.genre}</p>
                </div>

                {/* Vote count */}
                <div className="text-right flex-shrink-0 mr-2">
                  <p className="text-sm font-semibold text-white">{voteCount}</p>
                  <p className="text-[10px] text-[#505050]">{pct}%</p>
                </div>

                {/* Vote button */}
                <button
                  onClick={() => handleVote(c.slug)}
                  disabled={isVoting || voted || remaining <= 0}
                  className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 min-w-[72px] min-h-[36px] ${
                    voted
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-default"
                      : remaining <= 0
                      ? "bg-white/[0.04] text-[#404040] border border-white/[0.06] cursor-not-allowed"
                      : "bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 hover:scale-[1.02]"
                  }`}
                >
                  {isVoting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    </span>
                  ) : voted ? (
                    "Voted ✓"
                  ) : (
                    "Vote"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-[#404040]">
        Votes are permanent and public. Results influence the next drop.
      </p>
    </div>
  );
}
