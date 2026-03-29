"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AirtableRecord } from "@/lib/airtable";
import {
  type ContactStatus,
  CONTACT_STATUSES,
  STATUS_STYLE,
  statusStorageKey,
} from "@/components/ConnectionCard";
import { supabase } from "@/lib/supabase";
import { getDmLimit, ACCOUNT_AGE_LIMITS, type AccountAge } from "@/lib/dmLimits";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import ProfileChecklist from "@/components/ProfileChecklist";

interface ArtistData {
  slug: string;
  name: string;
  photo: string;
  records: AirtableRecord[];
}

// ─── shared helpers ────────────────────────────────────────────────────────────

function openExternalUrl(url: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function formatFollowers(count: number) {
  if (!count) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

const TYPE_COLORS: Record<string, string> = {
  Producer: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Label: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Sound Engineer": "bg-green-500/20 text-green-300 border-green-500/30",
  DJ: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Manager: "bg-red-500/20 text-red-300 border-red-500/30",
  Studio: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Artist/Rapper": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Photographer/Videographer": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

// ─── status hook (read + write) ────────────────────────────────────────────────

function useStatusState(artists: ArtistData[], userId: string | undefined) {
  const [statuses, setStatuses] = useState<Record<string, ContactStatus>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const all: Record<string, ContactStatus> = {};
    artists.forEach((artist) => {
      artist.records.forEach((record) => {
        all[statusStorageKey(artist.slug, record.username)] = "To contact";
      });
    });

    if (!userId || !supabase) {
      setStatuses(all);
      setMounted(true);
      return;
    }

    supabase
      .from("dm_status")
      .select("artist_slug, username, status")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          data.forEach((row) => {
            const key = statusStorageKey(row.artist_slug, row.username);
            if (CONTACT_STATUSES.includes(row.status as ContactStatus)) {
              all[key] = row.status as ContactStatus;
            }
          });
        }
        setStatuses(all);
        setMounted(true);
      })
      .catch(() => {
        setStatuses(all);
        setMounted(true);
      });
  }, [artists, userId]);

  async function updateStatus(artistSlug: string, username: string, next: ContactStatus) {
    const key = statusStorageKey(artistSlug, username);
    setStatuses((prev) => ({ ...prev, [key]: next }));
    if (!userId || !supabase) return;
    try {
      await supabase.from("dm_status").upsert(
        {
          user_id: userId,
          artist_slug: artistSlug,
          username: username.replace("@", ""),
          status: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,artist_slug,username" }
      );
    } catch {
      // silent — status is already updated in UI
    }
  }

  return { statuses, mounted, updateStatus };
}

// ─── StatusPill (inline, same logic as ConnectionCard) ─────────────────────────

function StatusPill({
  status,
  onChange,
}: {
  status: ContactStatus;
  onChange: (s: ContactStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const style = STATUS_STYLE[status];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-opacity hover:opacity-80 whitespace-nowrap"
        style={style.pill}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
        {status}
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1.5 right-0 z-20 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl overflow-hidden shadow-2xl min-w-[152px]">
          {CONTACT_STATUSES.map((s) => {
            const st = STATUS_STYLE[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className="w-full text-left text-xs px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2.5"
                style={{ color: st.pill.color as string }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.dot }} />
                {s}
                {s === status && (
                  <svg className="w-3 h-3 ml-auto opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-3xl font-black" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ─── ArtistContactList ────────────────────────────────────────────────────────

type FilterTab = "All" | ContactStatus;

function ArtistContactList({
  artist,
  statuses,
  updateStatus,
  mounted,
}: {
  artist: ArtistData;
  statuses: Record<string, ContactStatus>;
  updateStatus: (slug: string, username: string, s: ContactStatus) => void;
  mounted: boolean;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const records = artist.records;

  const countFor = (tab: FilterTab) => {
    if (!mounted) return tab === "All" ? records.length : 0;
    if (tab === "All") return records.length;
    return records.filter((r) => {
      const key = statusStorageKey(artist.slug, r.username);
      return (statuses[key] ?? "To contact") === tab;
    }).length;
  };

  const filtered = !mounted
    ? records
    : activeTab === "All"
    ? records
    : records.filter((r) => {
        const key = statusStorageKey(artist.slug, r.username);
        return (statuses[key] ?? "To contact") === activeTab;
      });

  const tabs: FilterTab[] = ["All", ...CONTACT_STATUSES];

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {tabs.map((tab) => {
          const count = countFor(tab);
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                isActive
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "bg-transparent border-[#2f2f2f] text-gray-400 hover:border-gray-500 hover:text-gray-300"
              }`}
            >
              {tab}
              {mounted && (
                <span className={`ml-1.5 ${isActive ? "opacity-80" : "opacity-50"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contact rows */}
      <div className="space-y-1.5">
        {filtered.map((record) => {
          const key = statusStorageKey(artist.slug, record.username);
          const status: ContactStatus = mounted ? (statuses[key] ?? "To contact") : "To contact";
          const typeColor = TYPE_COLORS[record.profileType] || TYPE_COLORS.Other;
          const followers = formatFollowers(record.followers);
          const username = record.username.replace("@", "");

          return (
            <div
              key={record.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl border bg-[#111111] border-[#1f1f1f] hover:border-orange-500/20 transition-colors"
            >
              {/* Name + username */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{record.fullName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={() => { openExternalUrl(record.profileUrl || `https://instagram.com/${username}`); }}
                    className="text-xs text-orange-400 hover:underline flex-shrink-0 text-left"
                  >
                    @{username}
                  </button>
                  {followers && (
                    <span className="text-xs text-gray-600">{followers} followers</span>
                  )}
                </div>
              </div>

              {/* Actions row: type badge + status + Send DM */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Profile type badge */}
                <span
                  className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${typeColor}`}
                >
                  {record.profileType}
                </span>

                {/* Status dropdown */}
                <StatusPill
                  status={status}
                  onChange={(s) => updateStatus(artist.slug, record.username, s)}
                />

                {/* Send DM */}
                <button
                  onClick={() => { openExternalUrl(`https://ig.me/m/${username}`); }}
                  className="flex-1 sm:flex-none text-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/70 transition-all whitespace-nowrap"
                >
                  Send DM →
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-gray-600 px-4 py-4 text-center">
            No contacts with status &quot;{activeTab}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── useDailyDMData ───────────────────────────────────────────────────────────

function useDailyDMData(userId: string | undefined) {
  const [count, setCount] = useState<number>(0);
  const [accountAge, setAccountAge] = useState<AccountAge | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // If supabase client is unavailable, nothing will ever load — mark done
    if (!supabase) { setLoaded(true); return; }
    // userId is still undefined while Clerk is initialising — wait for it
    if (!userId) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      supabase
        .from("dm_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("dm_sent_at", todayStart.toISOString()),
      supabase
        .from("user_profiles")
        .select("instagram_account_age")
        .eq("user_id", userId)
        .single(),
    ])
      .then(([activityRes, profileRes]) => {
        if (activityRes.count !== null) setCount(activityRes.count);
        const savedAge = profileRes.data?.instagram_account_age ?? null;
        console.log("[DashboardClient] instagram_account_age from Supabase:", savedAge);
        if (savedAge) {
          setAccountAge(savedAge as AccountAge);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [userId]);

  async function saveAccountAge(age: AccountAge) {
    if (!userId || !supabase) return;
    setAccountAge(age);
    await supabase.from("user_profiles").upsert(
      { user_id: userId, instagram_account_age: age, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    ).catch(() => {});
  }

  return { count, accountAge, loaded, saveAccountAge };
}

// ─── AccountAgeModal ──────────────────────────────────────────────────────────

const AGE_OPTIONS: { value: AccountAge; label: string; sublabel: string; limit: number }[] = [
  { value: "new",         label: "New account",         sublabel: "Less than 1 month old",   limit: ACCOUNT_AGE_LIMITS.new },
  { value: "growing",     label: "Growing account",     sublabel: "1 to 6 months old",        limit: ACCOUNT_AGE_LIMITS.growing },
  { value: "established", label: "Established account", sublabel: "More than 6 months old",   limit: ACCOUNT_AGE_LIMITS.established },
];

function AccountAgeModal({ onSelect }: { onSelect: (age: AccountAge) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111111] border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
        <p className="text-xs text-orange-400/70 font-semibold uppercase tracking-[0.1em] mb-2">One-time setup</p>
        <h2 className="text-xl font-black mb-1">How old is your Instagram?</h2>
        <p className="text-sm text-[#a0a0a0] mb-6 leading-relaxed">
          This sets your daily DM limit. Older accounts can send more DMs without getting flagged.
        </p>
        <div className="space-y-3">
          {AGE_OPTIONS.map(({ value, label, sublabel, limit }) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.025] hover:border-orange-500/40 hover:bg-orange-500/[0.05] transition-all duration-150 text-left group"
            >
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">{label}</p>
                <p className="text-xs text-[#606060] mt-0.5">{sublabel}</p>
              </div>
              <span className="text-xs font-bold text-orange-400 flex-shrink-0 ml-3">{limit}/day</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DailyDMSafety ────────────────────────────────────────────────────────────

function DailyDMSafety({
  count,
  loaded,
  accountAge,
  onChangeAge,
}: {
  count: number;
  loaded: boolean;
  accountAge: AccountAge | null;
  onChangeAge: () => void;
}) {
  const limit = getDmLimit(accountAge);
  const pct = Math.min(Math.round((count / limit) * 100), 100);

  let barColor = "bg-green-500";
  let statusText = "✅ Safe zone";
  let statusColor = "text-green-400";

  if (pct > 100) {
    barColor = "bg-red-500";
    statusText = "🚨 Stop for today";
    statusColor = "text-red-400";
  } else if (pct >= 75) {
    barColor = "bg-red-500";
    statusText = "⚠️ Almost at limit";
    statusColor = "text-red-400";
  } else if (pct >= 50) {
    barColor = "bg-orange-500";
    statusText = "⚡ Slow down";
    statusColor = "text-orange-400";
  }

  const ageLabelMap: Record<AccountAge, string> = {
    new: "New account",
    growing: "Growing account",
    established: "Established account",
  };

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Daily DM Safety</p>
        <div className="flex items-center gap-3">
          {loaded && accountAge && (
            <button
              onClick={onChangeAge}
              className="text-xs text-[#505050] hover:text-orange-400 transition-colors"
            >
              {ageLabelMap[accountAge]}
            </button>
          )}
          {loaded && (
            <span className={`text-xs font-semibold ${statusColor}`}>{statusText}</span>
          )}
        </div>
      </div>
      <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: loaded ? `${pct}%` : "0%" }}
        />
      </div>
      <p className="text-xs text-gray-600">
        {loaded ? `${count} DMs sent today` : "Loading…"} / {limit} recommended max
      </p>
    </div>
  );
}

// ─── LeaderboardWidget ───────────────────────────────────────────────────────

const WIDGET_MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  dms_sent: number;
  replies_received: number;
}

function LeaderboardWidget({ userId }: { userId: string | undefined }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const url = userId
      ? `/api/leaderboard?userId=${encodeURIComponent(userId)}`
      : "/api/leaderboard";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoaded(true));
  }, [userId]);

  const top3 = entries.slice(0, 3);

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Community</p>
          <h2 className="text-base font-black mt-0.5">Leaderboard</h2>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
        >
          See full leaderboard →
        </Link>
      </div>

      {!loaded && (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {loaded && top3.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-4">
          Be the first to climb the ranks. Start sending DMs.
        </p>
      )}

      {loaded && top3.length > 0 && (
        <div className="space-y-2">
          {top3.map((entry) => {
            const isMe = entry.user_id === userId;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  isMe
                    ? "border-orange-500/40 bg-orange-500/[0.07]"
                    : "border-white/[0.04] bg-white/[0.015]"
                }`}
              >
                <span className="text-base w-6 text-center flex-shrink-0">
                  {WIDGET_MEDALS[entry.rank - 1]}
                </span>
                <p
                  className={`flex-1 text-sm font-semibold truncate ${
                    isMe ? "text-orange-400" : "text-white"
                  }`}
                >
                  {entry.username}
                  {isMe && (
                    <span className="ml-1.5 text-xs font-normal text-orange-500/60">you</span>
                  )}
                </p>
                <span
                  className={`text-sm font-bold flex-shrink-0 ${
                    isMe ? "text-orange-400" : "text-white"
                  }`}
                >
                  {entry.dms_sent}
                  <span className="text-xs font-normal text-gray-600 ml-1">DMs</span>
                </span>
                <span className="text-sm font-bold text-green-400 flex-shrink-0 hidden sm:block">
                  {entry.replies_received}
                  <span className="text-xs font-normal text-gray-600 ml-1">replies</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DashboardClient ──────────────────────────────────────────────────────────

export default function DashboardClient({ artists }: { artists: ArtistData[] }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { statuses, mounted, updateStatus } = useStatusState(artists, user?.id);
  const { count: dailyCount, accountAge, loaded: dailyLoaded, saveAccountAge } = useDailyDMData(user?.id);
  const [showAgeModal, setShowAgeModal] = useState(false);

  // Show modal once data is loaded and no preference saved yet
  useEffect(() => {
    if (dailyLoaded && isSignedIn && accountAge === null) {
      setShowAgeModal(true);
    }
  }, [dailyLoaded, isSignedIn, accountAge]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-6">🔒</p>
          <h1 className="text-2xl font-black mb-3">Sign in to view your dashboard</h1>
          <p className="text-gray-400 mb-8 text-sm max-w-xs mx-auto">
            Track your outreach progress across all artists and never lose your place.
          </p>
          <Link
            href="/sign-in"
            className="bg-orange-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-400 transition-colors text-sm"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    user.firstName ??
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "Producer";

  const totalAll = artists.reduce((s, a) => s + a.records.length, 0);
  const totalDMsSent = mounted
    ? artists.reduce(
        (sum, a) =>
          sum +
          a.records.filter((r) => {
            const s = statuses[statusStorageKey(a.slug, r.username)] ?? "To contact";
            return s === "DM sent" || s === "Replied";
          }).length,
        0
      )
    : 0;
  const totalReplied = mounted
    ? artists.reduce(
        (sum, a) =>
          sum +
          a.records.filter(
            (r) => (statuses[statusStorageKey(a.slug, r.username)] ?? "To contact") === "Replied"
          ).length,
        0
      )
    : 0;
  const responseRate =
    totalDMsSent > 0 ? Math.round((totalReplied / totalDMsSent) * 100) : 0;

  return (
    <div className="min-h-screen">
      {showAgeModal && (
        <AccountAgeModal
          onSelect={(age) => {
            saveAccountAge(age);
            setShowAgeModal(false);
          }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-12 pb-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
          <h1 className="text-3xl font-black">{displayName}</h1>
          <p className="text-gray-500 text-sm mt-2">Your outreach dashboard</p>
        </div>

        {/* Daily DM Safety */}
        <DailyDMSafety
          count={dailyCount}
          loaded={dailyLoaded}
          accountAge={accountAge}
          onChangeAge={() => setShowAgeModal(true)}
        />

        {/* Instagram Safety Guide */}
        <div className="mb-6"><InstagramSafetyGuide /></div>

        {/* Profile Checklist */}
        <ProfileChecklist />

        {/* Stats row */}
        {mounted && (
          <div className="grid grid-cols-3 gap-3 mb-10">
            <StatCard
              label="DMs Sent"
              value={totalDMsSent}
              sub={`out of ${totalAll} contacts`}
              accent="#f97316"
            />
            <StatCard
              label="Replies"
              value={totalReplied}
              sub={totalDMsSent > 0 ? `from ${totalDMsSent} DMs sent` : "no DMs sent yet"}
              accent="#22c55e"
            />
            <StatCard
              label="Response Rate"
              value={totalDMsSent > 0 ? `${responseRate}%` : "—"}
              sub={totalDMsSent > 0 ? "replies ÷ DMs sent" : "send some DMs first"}
              accent={responseRate >= 20 ? "#22c55e" : responseRate > 0 ? "#f97316" : undefined}
            />
          </div>
        )}

        {/* Community Leaderboard */}
        <LeaderboardWidget userId={user?.id} />

        {/* Artist sections */}
        {artists.map((artist) => {
          const total = artist.records.length;
          const dmSentOrReplied = mounted
            ? artist.records.filter((r) => {
                const s = statuses[statusStorageKey(artist.slug, r.username)] ?? "To contact";
                return s === "DM sent" || s === "Replied";
              }).length
            : 0;
          const pct = total > 0 ? Math.round((dmSentOrReplied / total) * 100) : 0;

          return (
            <div key={artist.slug} className="mb-12">
              {/* Progress bar card */}
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1f1f1f] flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={artist.photo} alt={artist.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-black truncate">{artist.name}</h2>
                      <span className="text-sm flex-shrink-0">
                        <span className="text-orange-500 font-bold">{dmSentOrReplied}</span>
                        <span className="text-gray-600"> / {total}</span>
                        <span className="text-gray-500 ml-1 text-xs">contacted</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-600">{pct}% contacted (DM sent or replied)</span>
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    View network →
                  </Link>
                </div>
              </div>

              {/* Contact list with filter tabs */}
              <ArtistContactList
                artist={artist}
                statuses={statuses}
                updateStatus={updateStatus}
                mounted={mounted}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
