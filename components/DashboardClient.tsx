"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
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
import StickyDMBar from "@/components/StickyDMBar";
import MutualContactsWidget from "@/components/MutualContactsWidget";
import { getUserRank } from "@/lib/contactTier";
import { DMStatusProvider, useDMStatus } from "@/contexts/DMStatusContext";

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


// ─── StatusPill (inline, same logic as ConnectionCard) ─────────────────────────

function StatusPill({
  status,
  onChange,
}: {
  status: ContactStatus;
  onChange: (s: ContactStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - rect.top + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  }

  const style = STATUS_STYLE[status];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={handleToggle}
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
        <div
          className="fixed z-[9999] bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl overflow-hidden shadow-2xl min-w-[152px]"
          style={{ bottom: pos.bottom, right: pos.right }}
        >
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

// ─── useDMHistory ─────────────────────────────────────────────────────────────

const SLUG_TO_ARTIST: Record<string, string> = {
  "currensy":    "Curren$y",
  "harry-fraud": "Harry Fraud",
  "wheezy":      "Wheezy",
  "juke-wong":   "Juke Wong",
  "southside":   "Southside",
  "metro-boomin":"Metro Boomin",
};

interface DMHistoryItem {
  contactId: string;
  artistSlug: string;
  artistName: string;
  username: string;
  sentAt: string;
  status: string;
}

// Statuses that indicate a DM was sent at some point
const DM_SENT_STATUSES = ["DM sent", "Replied", "Not interested"];

function formatHistoryDate(ts: string): string {
  // Supabase returns "2026-04-08 14:32:00.000" — normalize to ISO for parsing
  const d = new Date(ts.includes("T") ? ts : ts.replace(" ", "T"));
  return d.toLocaleString("en-US", {
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute:"2-digit",
    hour12: false,
  });
}

function useDMHistory(userId: string | undefined, open: boolean) {
  const { updateStatus: globalUpdateStatus } = useDMStatus();
  const [items, setItems] = useState<DMHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (!open || !userId || !supabase) {
      if (!open) { setLoaded(false); setItems([]); setPage(0); }
      return;
    }
    setLoaded(false);
    fetchPage(0);
  }, [open, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPage(p: number) {
    if (!supabase || !userId) return;
    const from = p * PAGE_SIZE;

    const { data: rows, error } = await supabase
      .from("dm_status")
      .select("contact_id, username, artist_slug, status, updated_at")
      .eq("user_id", userId)
      .in("status", DM_SENT_STATUSES)
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE_SIZE);

    if (error) { console.error("[useDMHistory] dm_status error:", error); setLoaded(true); return; }
    if (!rows || rows.length === 0) { setLoaded(true); setHasMore(false); return; }

    setHasMore(rows.length === PAGE_SIZE + 1);
    const visible = rows.slice(0, PAGE_SIZE);

    const mapped: DMHistoryItem[] = visible.map((row) => ({
      contactId:  row.contact_id,
      artistSlug: row.artist_slug,
      artistName: SLUG_TO_ARTIST[row.artist_slug] ?? row.artist_slug,
      username:   row.username,
      sentAt:     row.updated_at,
      status:     row.status,
    }));

    setItems((prev) => p === 0 ? mapped : [...prev, ...mapped]);
    setPage(p);
    setLoaded(true);
  }

  function updateItemStatus(item: DMHistoryItem, newStatus: ContactStatus) {
    // Optimistic list update — remove row if reverting to "To contact"
    if (newStatus === "To contact") {
      setItems((prev) => prev.filter((i) => i.contactId !== item.contactId));
    } else {
      setItems((prev) =>
        prev.map((i) => i.contactId === item.contactId ? { ...i, status: newStatus } : i)
      );
    }
    // Delegate Supabase write + global state update to shared context
    globalUpdateStatus(item.artistSlug, item.username, newStatus);
  }

  function loadMore() { fetchPage(page + 1); }

  return { items, loaded, hasMore, loadMore, updateItemStatus };
}

// ─── HistoryStatusBadge ───────────────────────────────────────────────────────

const HISTORY_STATUS_OPTIONS: { value: ContactStatus; emoji: string; label: string }[] = [
  { value: "To contact",     emoji: "🔵", label: "To contact"     },
  { value: "DM sent",        emoji: "📤", label: "DM sent"        },
  { value: "Replied",        emoji: "✅", label: "Replied"         },
  { value: "Not interested", emoji: "❌", label: "Not interested"  },
];

const HISTORY_STATUS_STYLE: Record<string, { text: string; bg: string }> = {
  "DM sent":        { text: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  "Replied":        { text: "text-green-400",  bg: "bg-green-500/10  border-green-500/20"  },
  "Not interested": { text: "text-gray-500",   bg: "bg-white/[0.03]  border-white/[0.08]"  },
  "To contact":     { text: "text-gray-600",   bg: "bg-transparent   border-transparent"   },
};

function HistoryStatusBadge({
  item,
  onUpdate,
}: {
  item: DMHistoryItem;
  onUpdate: (item: DMHistoryItem, s: ContactStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - rect.top + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  }

  const style = HISTORY_STATUS_STYLE[item.status] ?? HISTORY_STATUS_STYLE["To contact"];
  const opt   = HISTORY_STATUS_OPTIONS.find((o) => o.value === item.status);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap transition-all hover:opacity-80 ${style.text} ${style.bg}`}
      >
        {opt?.emoji} {item.status === "DM sent" ? "Sent" : item.status === "Not interested" ? "No" : item.status}
      </button>

      {open && (
        <div
          className="fixed z-[9999] bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl overflow-hidden shadow-2xl min-w-[148px]"
          style={{ bottom: pos.bottom, right: pos.right }}
        >
          {HISTORY_STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { onUpdate(item, o.value); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-2.5 hover:bg-white/[0.06] transition-colors flex items-center gap-2 ${
                o.value === item.status ? "text-orange-400" : "text-gray-300"
              }`}
            >
              <span>{o.emoji}</span>
              <span>{o.label}</span>
              {o.value === item.status && (
                <svg className="w-3 h-3 ml-auto flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  "DM sent":        "text-orange-400",
  "Replied":        "text-green-400",
  "Not interested": "text-gray-500",
  "To contact":     "text-gray-600",
};

// ─── DMHistoryPanel ───────────────────────────────────────────────────────────

function DMHistoryPanel({ userId }: { userId: string }) {
  const { items, loaded, hasMore, loadMore, updateItemStatus } = useDMHistory(userId, true);

  if (!loaded) {
    return (
      <div className="space-y-1.5">
        {[1,2,3,4].map((n) => <div key={n} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-600 text-center py-4">No DMs sent yet.</p>;
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0 px-2 pb-2 border-b border-[#1f1f1f] mb-1">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Contact</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider hidden sm:block">Network</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Date &amp; time</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Status</p>
      </div>

      <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.contactId}-${i}`}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            {/* Contact */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">@{item.username}</p>
              <p className="text-[10px] text-gray-600 sm:hidden truncate">{item.artistName}</p>
            </div>

            {/* Network — desktop only */}
            <p className="text-xs text-gray-500 hidden sm:block flex-shrink-0 truncate max-w-[80px]">{item.artistName}</p>

            {/* Date + time */}
            <p className="text-[10px] text-gray-600 flex-shrink-0 tabular-nums whitespace-nowrap">
              {formatHistoryDate(item.sentAt)}
            </p>

            {/* Editable status badge */}
            <HistoryStatusBadge item={item} onUpdate={updateItemStatus} />
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full mt-2 text-xs text-orange-400 hover:text-orange-300 transition-colors py-2 text-center border-t border-[#1f1f1f]"
        >
          Load more
        </button>
      )}
    </div>
  );
}

// ─── ArtistContactList ────────────────────────────────────────────────────────

type FilterTab = "All" | ContactStatus;

function applyFollowerFilter(followers: number, followerFilter: string): boolean {
  if (!followerFilter) return true;
  if (followerFilter === "500 – 5K")   return followers >= 500   && followers <= 5000;
  if (followerFilter === "5K – 20K")   return followers >= 5001  && followers <= 20000;
  if (followerFilter === "20K – 50K")  return followers >= 20001 && followers <= 50000;
  if (followerFilter === "50K+")       return followers > 50000;
  return true;
}

function ArtistContactList({
  artist,
  typeFilter,
  followerFilter,
}: {
  artist: ArtistData;
  typeFilter: string;
  followerFilter: string;
}) {
  const { statuses, mounted, updateStatus } = useDMStatus();
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  // Apply global type + follower filters first, then local status tab
  const globalFiltered = artist.records.filter((r) => {
    if (typeFilter && r.profileType !== typeFilter) return false;
    if (!applyFollowerFilter(r.followers, followerFilter)) return false;
    return true;
  });

  const countFor = (tab: FilterTab) => {
    if (!mounted) return tab === "All" ? globalFiltered.length : 0;
    if (tab === "All") return globalFiltered.length;
    return globalFiltered.filter((r) => {
      const key = statusStorageKey(artist.slug, r.username);
      return (statuses[key] ?? "To contact") === tab;
    }).length;
  };

  const filtered = !mounted
    ? globalFiltered
    : activeTab === "All"
    ? globalFiltered
    : globalFiltered.filter((r) => {
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

// ─── useWelcomeStats ──────────────────────────────────────────────────────────

function useWelcomeStats(userId: string | undefined) {
  const [stats, setStats] = useState<{
    dmsSentTotal: number;
    repliesTotal: number;
    firstLoginDone: boolean;
  } | null>(null);

  useEffect(() => {
    if (!supabase) { setStats({ dmsSentTotal: 0, repliesTotal: 0, firstLoginDone: true }); return; }
    if (!userId) return;

    Promise.all([
      // Count unique contacts a DM was ever sent to (same source as history panel)
      supabase
        .from("dm_status")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["DM sent", "Replied", "Not interested"]),
      supabase
        .from("dm_status")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "Replied"),
      supabase
        .from("user_profiles")
        .select("first_login_done")
        .eq("user_id", userId)
        .single(),
    ])
      .then(([activityRes, statusRes, profileRes]) => {
        const firstLoginDone = profileRes.data?.first_login_done ?? false;
        setStats({
          dmsSentTotal: activityRes.count ?? 0,
          repliesTotal: statusRes.count ?? 0,
          firstLoginDone,
        });
        // Mark first login as done so subsequent visits show "welcome back"
        if (!firstLoginDone) {
          supabase!
            .from("user_profiles")
            .upsert({ user_id: userId, first_login_done: true }, { onConflict: "user_id" })
            .then(({ error }) => { if (error) console.error("first_login_done upsert error:", error); });
        }
      })
      .catch(() => setStats({ dmsSentTotal: 0, repliesTotal: 0, firstLoginDone: true }));
  }, [userId]);

  return stats;
}

// ─── WelcomeBanner ────────────────────────────────────────────────────────────

function WelcomeBanner({
  username,
  dmsSentToday,
  dailyLimit,
  dmsSentTotal,
  repliesTotal,
  totalContacts,
  firstLoginDone,
}: {
  username: string;
  dmsSentToday: number | null;
  dailyLimit: number;
  dmsSentTotal: number | null;
  repliesTotal: number | null;
  totalContacts: number;
  firstLoginDone: boolean | null;
}) {
  const [visible, setVisible] = useState(true);

  // Wait for DB to resolve before rendering — avoids flashing the wrong message
  if (firstLoginDone === null) return null;
  if (!visible) return null;

  const d = (v: number | null) => v !== null ? String(v) : "...";
  const contactsRemaining = dmsSentTotal !== null ? Math.max(totalContacts - dmsSentTotal, 0) : null;
  const dmsRemaining = dmsSentToday !== null ? Math.max(dailyLimit - dmsSentToday, 0) : null;

  let lines: ReactNode[];

  if (firstLoginDone === false) {
    // First ever visit — account just created
    lines = [
      <><span className="text-orange-400 font-bold">Yo {username}</span>, welcome to BeatBridge. 👋</>,
      "This is your networking HQ.",
      "Start by exploring the artist networks and sending your first DM. The game starts now.",
    ];
  } else if (dmsSentToday !== null && dmsSentToday >= dailyLimit) {
    lines = [
      <><span className="text-orange-400 font-bold">Yo {username}</span>, you maxed out today. 🏆</>,
      `${d(dmsSentToday)}/${dailyLimit} DMs sent — that's the move.`,
      "Come back tomorrow and keep building.",
      "And remember: if you're not sending DMs, you must be making beats.",
    ];
  } else if (dmsSentToday !== null && dmsSentToday > 0) {
    lines = [
      <><span className="text-orange-400 font-bold">Yo {username}</span>, you&apos;re warmed up. 💪</>,
      `${d(dmsSentToday)} DMs sent today — keep the momentum.`,
      `${d(dmsRemaining)} more before you hit your daily limit. Stay consistent.`,
    ];
  } else {
    lines = [
      <><span className="text-orange-400 font-bold">Yo {username}</span>, welcome back. 🔥</>,
      "You haven't sent any DMs today — let's change that.",
      `You've got ${d(contactsRemaining)} contacts waiting.`,
      "Go get it.",
    ];
  }

  return (
    <div className="mb-6">
      {/* Banner */}
      <div className="relative bg-[#111111] border border-[#1f1f1f] border-l-4 border-l-orange-500 rounded-2xl p-5">
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#505050] hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="pr-8 space-y-1">
          {lines.map((line, i) => (
            <p key={i} className={`text-sm leading-relaxed ${i === 0 ? "font-semibold text-white" : "text-[#a0a0a0]"}`}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Today's mission */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-center">
          <p className="text-base">📬</p>
          <p className="text-sm font-bold text-white mt-0.5">{dmsRemaining}</p>
          <p className="text-[10px] text-[#505050] mt-0.5 leading-tight">DMs left today</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-center">
          <p className="text-base">🎯</p>
          <p className="text-sm font-bold text-green-400 mt-0.5">{repliesTotal}</p>
          <p className="text-[10px] text-[#505050] mt-0.5 leading-tight">total replies</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-3 py-2.5 text-center">
          <p className="text-base">⚡</p>
          <p className="text-sm font-bold text-orange-400 mt-0.5">{contactsRemaining}</p>
          <p className="text-[10px] text-[#505050] mt-0.5 leading-tight">contacts to reach</p>
        </div>
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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    Promise.all([
      supabase
        .from("dm_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "sent")
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

// ─── useUserRank ─────────────────────────────────────────────────────────────

function useUserRank(userId: string | undefined) {
  const [data, setData] = useState<{ total_points: number } | null>(null);

  useEffect(() => {
    if (!supabase || !userId) return;
    supabase
      .from("user_profiles")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data: row }) => {
        setData({ total_points: row?.total_points ?? 0 });
      })
      .catch(() => setData({ total_points: 0 }));
  }, [userId]);

  return data;
}

// ─── RankCard ─────────────────────────────────────────────────────────────────

function RankCard({ userId }: { userId: string | undefined }) {
  const rankData = useUserRank(userId);
  if (!rankData) return null;

  const { total_points } = rankData;
  const rank = getUserRank(total_points);

  const THRESHOLDS = [0, 100, 500, 1500, 5000];
  const rankIndex = ["Rookie", "Networker", "Connector", "Industry", "Legend"].indexOf(rank.rank);
  const tierMin = THRESHOLDS[rankIndex] ?? 0;
  const tierMax = THRESHOLDS[rankIndex + 1] ?? 5000;
  const pct = rank.next ? Math.min(Math.round(((total_points - tierMin) / (tierMax - tierMin)) * 100), 100) : 100;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 mb-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Your Rank</p>
      <div className="mb-3">
        <p className="text-2xl font-black text-white">{rank.emoji} {rank.rank}</p>
        <p className="text-xs text-gray-500 mt-0.5">{total_points} points total</p>
        <p className="text-xs text-gray-600 mt-0.5">Points earned from profile setup, daily activity, DMs sent, and replies received.</p>
      </div>
      {rank.next && (
        <>
          <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{rank.pointsToNext} pts to {rank.next}</p>
        </>
      )}
    </div>
  );
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
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

  const isActive = value !== "";
  const displayLabel = value !== "" ? value : label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
          isActive
            ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
            : "border-[#2f2f2f] bg-[#111111] text-gray-400 hover:border-gray-500 hover:text-gray-300"
        }`}
      >
        {displayLabel}
        <svg
          className={`w-3 h-3 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl overflow-hidden shadow-2xl min-w-[160px]">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left text-xs px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between ${
              value === "" ? "text-orange-400" : "text-gray-400"
            }`}
          >
            All
            {value === "" && (
              <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left text-xs px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between ${
                value === opt ? "text-orange-400" : "text-gray-400"
              }`}
            >
              {opt}
              {value === opt && (
                <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ArtistSection (collapsible) ──────────────────────────────────────────────

function ArtistSection({
  artist,
  typeFilter,
  followerFilter,
}: {
  artist: ArtistData;
  typeFilter: string;
  followerFilter: string;
}) {
  const { statuses, mounted } = useDMStatus();
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(`dashboard_expanded_${artist.slug}`) === "1";
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`dashboard_expanded_${artist.slug}`, next ? "1" : "0");
    }
  };

  const total = artist.records.length;
  const dmSentOrReplied = mounted
    ? artist.records.filter((r) => {
        const s = statuses[statusStorageKey(artist.slug, r.username)] ?? "To contact";
        return s === "DM sent" || s === "Replied";
      }).length
    : 0;
  const pct = total > 0 ? Math.round((dmSentOrReplied / total) * 100) : 0;

  return (
    <div className="mb-4">
      {/* Clickable header */}
      <button
        onClick={toggle}
        className="w-full bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 flex items-center gap-4 hover:border-orange-500/20 transition-colors text-left"
      >
        {/* Artist photo */}
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#1f1f1f] flex-shrink-0">
          {artist.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.photo} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[#404040]">
              {artist.name[0]}
            </div>
          )}
        </div>

        {/* Name + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-sm font-black truncate">{artist.name}</h2>
            <span className="text-xs text-gray-600 flex-shrink-0">{total} contacts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-orange-500 flex-shrink-0 tabular-nums">{pct}%</span>
            <span className="text-xs text-gray-600 flex-shrink-0 tabular-nums">
              {dmSentOrReplied}/{total}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-300 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible contact list — grid-template-rows trick for smooth animation */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="pt-2">
            <ArtistContactList
              artist={artist}
              typeFilter={typeFilter}
              followerFilter={followerFilter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DashboardClient ──────────────────────────────────────────────────────────

export default function DashboardClient({ artists }: { artists: ArtistData[] }) {
  const { user } = useUser();
  return (
    <DMStatusProvider artists={artists} userId={user?.id}>
      <DashboardContent artists={artists} />
    </DMStatusProvider>
  );
}

const TYPE_FILTER_OPTIONS = [
  "Producer",
  "Artist/Rapper",
  "Manager",
  "Sound Engineer",
  "Label",
  "Studio",
  "Photographer/Videographer",
  "DJ",
  "Other",
];

const FOLLOWER_FILTER_OPTIONS = ["500 – 5K", "5K – 20K", "20K – 50K", "50K+"];

function DashboardContent({ artists }: { artists: ArtistData[] }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { statuses, mounted } = useDMStatus();
  const { count: dailyCount, accountAge, loaded: dailyLoaded, saveAccountAge } = useDailyDMData(user?.id);
  const welcomeStats = useWelcomeStats(user?.id);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showDMHistory, setShowDMHistory] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [followerFilter, setFollowerFilter] = useState("");
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);

  // Check onboarding status — redirect if not completed
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || !supabase) return;
    supabase
      .from("user_profiles")
      .select("onboarding_completed, instagram_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data || !data.onboarding_completed) {
          router.replace("/onboarding/social");
        } else {
          if (data.instagram_url) setInstagramUrl(data.instagram_url);
        }
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn, user?.id]);

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
        {/* Welcome banner — waits for first_login_done from DB before rendering */}
        <WelcomeBanner
          username={displayName}
          dmsSentToday={dailyLoaded ? dailyCount : null}
          dailyLimit={getDmLimit(accountAge)}
          dmsSentTotal={welcomeStats?.dmsSentTotal ?? null}
          repliesTotal={welcomeStats?.repliesTotal ?? null}
          totalContacts={totalAll}
          firstLoginDone={welcomeStats?.firstLoginDone ?? null}
        />

        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <Avatar
            url={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}.jpg`}
            username={displayName}
            size={64}
            className="flex-shrink-0"
          />
          <div>
            <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
            <h1 className="text-3xl font-black">{displayName}</h1>
            {instagramUrl ? (
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={`https://instagram.com/${instagramUrl.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#606060] hover:text-orange-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  {instagramUrl.startsWith("@") ? instagramUrl : `@${instagramUrl}`}
                </a>
                <Link
                  href="/onboarding#social-links"
                  className="text-xs text-[#404040] hover:text-orange-400 transition-colors"
                >
                  Edit
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500 text-sm">Your outreach dashboard</p>
                <Link
                  href="/onboarding#social-links"
                  className="text-xs text-[#404040] hover:text-orange-400 transition-colors"
                >
                  + Add socials
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Daily DM Safety */}
        <DailyDMSafety
          count={dailyCount}
          loaded={dailyLoaded}
          accountAge={accountAge}
          onChangeAge={() => setShowAgeModal(true)}
        />

        {/* Rank Card */}
        <RankCard userId={user?.id} />

        {/* Instagram Safety Guide */}
        <div className="mb-6"><InstagramSafetyGuide /></div>

        {/* Profile Checklist */}
        <ProfileChecklist />

        {/* Stats row */}
        {(mounted || welcomeStats !== null) && (
          <div className="mb-10">
            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* DMs Sent (total) — reads from dm_activity, clickable for history */}
              <div
                className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-1 cursor-pointer hover:border-orange-500/30 hover:-translate-y-0.5 transition-all duration-200 col-span-1"
                onClick={() => setShowDMHistory((v) => !v)}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">DMs Sent</p>
                <p className="text-3xl font-black" style={{ color: "#f97316" }}>
                  {mounted ? totalDMsSent : welcomeStats !== null ? welcomeStats.dmsSentTotal : "…"}
                </p>
                <p className="text-xs text-gray-600">total DMs sent</p>
                <p className="text-[10px] text-orange-500/50 mt-0.5">{showDMHistory ? "▲ hide history" : "▼ view history"}</p>
              </div>
              <StatCard
                label="Replies"
                value={mounted ? totalReplied : "…"}
                sub={mounted && totalDMsSent > 0 ? `from ${totalDMsSent} DMs sent` : "no DMs sent yet"}
                accent="#22c55e"
              />
              <StatCard
                label="Response Rate"
                value={mounted && totalDMsSent > 0 ? `${responseRate}%` : "—"}
                sub={mounted && totalDMsSent > 0 ? "replies ÷ DMs sent" : "send some DMs first"}
                accent={responseRate >= 20 ? "#22c55e" : responseRate > 0 ? "#f97316" : undefined}
              />
            </div>

            {/* DM History Panel — full width below stats grid */}
            {showDMHistory && user?.id && (
              <div className="bg-[#111111] border border-orange-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">DM History</p>
                  <button
                    onClick={() => setShowDMHistory(false)}
                    className="text-xs text-[#505050] hover:text-white transition-colors"
                  >
                    ✕ close
                  </button>
                </div>
                <DMHistoryPanel userId={user.id} />
              </div>
            )}
          </div>
        )}

        {/* Mutual Contacts */}
        <MutualContactsWidget />

        {/* Community Leaderboard */}
        <LeaderboardWidget userId={user?.id} />

        {/* Filter bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Filter:</span>
            <FilterDropdown
              label="Type ▾"
              options={TYPE_FILTER_OPTIONS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
            <FilterDropdown
              label="Followers ▾"
              options={FOLLOWER_FILTER_OPTIONS}
              value={followerFilter}
              onChange={setFollowerFilter}
            />
            {(typeFilter || followerFilter) && (
              <button
                onClick={() => { setTypeFilter(""); setFollowerFilter(""); }}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors ml-1 underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Artist sections — collapsible, state persisted in sessionStorage */}
        {artists.map((artist) => (
          <ArtistSection
            key={artist.slug}
            artist={artist}
            typeFilter={typeFilter}
            followerFilter={followerFilter}
          />
        ))}
      </div>

      <StickyDMBar
        dmSentCount={dailyCount}
        accountAge={accountAge}
        loaded={dailyLoaded}
      />
    </div>
  );
}
