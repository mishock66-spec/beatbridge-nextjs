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

// ─── DashboardClient ──────────────────────────────────────────────────────────

export default function DashboardClient({ artists }: { artists: ArtistData[] }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { statuses, mounted, updateStatus } = useStatusState(artists, user?.id);

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
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
          <h1 className="text-3xl font-black">{displayName}</h1>
          <p className="text-gray-500 text-sm mt-2">Your outreach dashboard</p>
        </div>

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
