"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  dms_sent: number;
  replies_received: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  total_sent: number;
  total_replied: number;
  my_rank: LeaderboardEntry | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function GhostRow({ rank }: { rank: number }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-white/[0.04] bg-white/[0.015]">
      <span className="text-sm font-bold text-gray-700 w-6 text-center">{rank}</span>
      <div className="flex-1 flex items-center gap-3">
        <div className="h-3 w-24 bg-white/[0.06] rounded-full blur-sm" />
      </div>
      <div className="h-3 w-10 bg-white/[0.06] rounded-full blur-sm" />
      <div className="h-3 w-10 bg-white/[0.06] rounded-full blur-sm hidden sm:block" />
    </div>
  );
}

function RankRow({
  entry,
  isCurrentUser,
  isPinned,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  isPinned?: boolean;
}) {
  const medal = MEDALS[entry.rank - 1] ?? null;

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
        isCurrentUser
          ? "border-orange-500/40 bg-orange-500/[0.07]"
          : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.1]"
      } ${isPinned ? "mt-2" : ""}`}
    >
      <span className="text-sm font-bold w-6 text-center flex-shrink-0">
        {medal ?? <span className="text-gray-500">#{entry.rank}</span>}
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            isCurrentUser ? "text-orange-400" : "text-white"
          }`}
        >
          {entry.username}
          {isCurrentUser && (
            <span className="ml-2 text-xs font-normal text-orange-500/70">you</span>
          )}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${isCurrentUser ? "text-orange-400" : "text-white"}`}>
          {entry.dms_sent}
        </p>
        <p className="text-xs text-gray-600">DMs</p>
      </div>

      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-sm font-bold text-green-400">{entry.replies_received}</p>
        <p className="text-xs text-gray-600">Replies</p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    const url = user?.id
      ? `/api/leaderboard?userId=${encodeURIComponent(user.id)}`
      : "/api/leaderboard";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ leaderboard: [], total_sent: 0, total_replied: 0, my_rank: null }))
      .finally(() => setLoading(false));
  }, [isLoaded, user?.id]);

  const isEmpty = !loading && data?.leaderboard.length === 0;
  const currentUserId = user?.id;

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs text-orange-400/70 font-semibold uppercase tracking-[0.1em] mb-2">
            Community
          </p>
          <h1 className="text-3xl font-light tracking-[0.02em] mb-3">Leaderboard</h1>
          <p className="text-[#a0a0a0] text-sm">
            Top producers ranked by outreach. Every DM counts.
          </p>
        </div>

        {/* Global Stats Banner */}
        {!loading && data && (data.total_sent > 0 || data.total_replied > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-3xl font-black text-orange-400">{data.total_sent}</p>
              <p className="text-xs text-[#a0a0a0] mt-1">DMs sent by the community</p>
            </div>
            <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-3xl font-black text-green-400">{data.total_replied}</p>
              <p className="text-xs text-[#a0a0a0] mt-1">Replies received</p>
            </div>
          </div>
        )}

        {/* Table header */}
        {!isEmpty && (
          <div className="flex items-center gap-4 px-5 mb-2">
            <span className="w-6" />
            <p className="flex-1 text-xs text-gray-600 uppercase tracking-[0.08em] font-medium">
              Producer
            </p>
            <p className="text-xs text-gray-600 uppercase tracking-[0.08em] font-medium w-10 text-right">
              Sent
            </p>
            <p className="text-xs text-gray-600 uppercase tracking-[0.08em] font-medium w-10 text-right hidden sm:block">
              Replies
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <GhostRow key={n} rank={n} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div>
            <div className="space-y-2 mb-8">
              {[1, 2, 3].map((n) => (
                <GhostRow key={n} rank={n} />
              ))}
            </div>
            <div className="text-center py-4">
              <p className="text-white font-semibold mb-2">No activity yet.</p>
              <p className="text-[#a0a0a0] text-sm mb-6">
                Be the first to climb the ranks. Start sending DMs.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
              >
                Go to Dashboard →
              </Link>
            </div>
          </div>
        )}

        {/* Leaderboard rows */}
        {!loading && data && data.leaderboard.length > 0 && (
          <>
            <div className="space-y-2">
              {data.leaderboard.map((entry) => (
                <RankRow
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={entry.user_id === currentUserId}
                />
              ))}
            </div>

            {/* Current user pinned at bottom if outside top 10 */}
            {data.my_rank && (
              <>
                <div className="flex items-center gap-3 my-3 px-2">
                  <div className="flex-1 border-t border-dashed border-white/[0.08]" />
                  <span className="text-xs text-gray-600">your rank</span>
                  <div className="flex-1 border-t border-dashed border-white/[0.08]" />
                </div>
                <RankRow entry={data.my_rank} isCurrentUser isPinned />
              </>
            )}
          </>
        )}

        {/* CTA for non-signed-in users */}
        {isLoaded && !user && (
          <p className="text-center text-sm text-gray-600 mt-8">
            <Link href="/sign-in" className="text-orange-400 hover:underline">
              Sign in
            </Link>{" "}
            to see your rank on the leaderboard.
          </p>
        )}
      </div>
    </div>
  );
}
