"use client";

import { useState, useMemo, useEffect } from "react";
import StatusDropdown from "@/components/ui/StatusDropdown";
import Link from "next/link";
import type { AirtableRecord } from "@/lib/airtable";
import { replyProbability, contactPriority } from "@/lib/scoreContact";
import { getContactTier } from "@/lib/contactTier";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import ScoringDisclaimer from "@/components/ScoringDisclaimer";
import toast from "react-hot-toast";

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

const TYPE_EMOJI: Record<string, string> = {
  Producer: "🎹",
  Label: "💿",
  DJ: "🎧",
  Studio: "🎙️",
  Manager: "📋",
  "Sound Engineer": "🔊",
  "Artist/Rapper": "🎤",
  "Photographer/Videographer": "📸",
  Other: "💼",
};

type ContactStatus = "To contact" | "DM sent" | "Replied" | "Not interested";

const CONTACT_STATUSES: ContactStatus[] = [
  "To contact",
  "DM sent",
  "Replied",
  "Not interested",
];


function formatFollowers(count: number) {
  if (!count) return "N/A";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function openExternal(url: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function DemoConnectionCard({
  record,
  artistSlug,
  producerName,
  expanded: externalExpanded,
  onExpandChange,
}: {
  record: AirtableRecord;
  artistSlug: string;
  producerName: string;
  expanded?: boolean;
  onExpandChange?: (v: boolean) => void;
}) {
  const storageKey = `beatbridge_demo_status_${artistSlug}_${record.username.replace("@", "").toLowerCase()}`;
  const username = record.username.replace("@", "");

  const [status, setStatus] = useState<ContactStatus>("To contact");
  const [copied, setCopied] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  function toggleExpand() {
    const next = !isExpanded;
    if (onExpandChange) onExpandChange(next);
    else setInternalExpanded(next);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as ContactStatus | null;
      if (saved && CONTACT_STATUSES.includes(saved)) setStatus(saved);
    } catch { /* localStorage blocked */ }
  }, [storageKey]);

  function handleStatusChange(next: ContactStatus) {
    setStatus(next);
    try { localStorage.setItem(storageKey, next); } catch { /* blocked */ }
  }

  function handleCopyDM() {
    if (!record.template) return;
    const resolved = producerName ? record.template.replace(/\[BEATMAKER_NAME\]/g, producerName) : record.template;
    navigator.clipboard.writeText(resolved).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const typeColor = TYPE_COLORS[record.profileType] ?? TYPE_COLORS.Other;
  const emoji = TYPE_EMOJI[record.profileType] ?? "✦";
  const reply = replyProbability(record);
  const priority = contactPriority(record);
  const ct = record.followers > 0 ? getContactTier(record.followers) : null;

  const MARK = `<mark style="background-color:rgba(249,115,22,0.25);color:rgb(251,146,60);border-radius:3px;padding:0 3px;font-weight:600;">`;
  const highlightedTemplate = useMemo(() => {
    if (!record.template) return "";
    let html = record.template;
    html = producerName
      ? html.replace(/\[BEATMAKER_NAME\]/g, `${MARK}${producerName}</mark>`)
      : html.replace(/\[BEATMAKER_NAME\]/g, `${MARK}[BEATMAKER_NAME]</mark>`);
    html = html.replace(/\[(?:YOUR (?:LISTENING )?)?LINK\]/gi, (m) => `${MARK}${m}</mark>`);
    return html;
  }, [record.template, producerName]);

  return (
    <div className={`bg-white/[0.025] border rounded-xl transition-all duration-200 relative overflow-visible
      ${isExpanded ? "border-l-[3px] border-l-orange-500 border-white/[0.08]" : "border-white/[0.08] hover:border-white/[0.15]"}`}
    >
      {/* ── COLLAPSED ROW ── */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 cursor-pointer select-none min-h-[60px]" onClick={toggleExpand}>
        <div className="w-8 h-8 bg-white/[0.05] rounded-lg flex items-center justify-center text-sm flex-shrink-0">{emoji}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap leading-tight">
            <p className="text-sm font-semibold text-white truncate max-w-[140px] sm:max-w-none">{record.fullName || `@${username}`}</p>
            <button
              onClick={(e) => { e.stopPropagation(); openExternal(record.profileUrl || `https://instagram.com/${username}`); }}
              className="text-orange-400 text-xs hover:underline flex-shrink-0"
            >@{username}</button>
            {record.followers > 0 && <span className="text-xs text-gray-600 flex-shrink-0 hidden sm:inline">{formatFollowers(record.followers)} followers</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className={`hidden md:inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}>{record.profileType}</span>
          <span className={`hidden lg:inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${priority.classes}`}>{priority.symbol} {priority.label}</span>
          <StatusDropdown status={status} onChange={handleStatusChange} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (record.template) {
                const resolved = producerName ? record.template.replace(/\[BEATMAKER_NAME\]/g, producerName) : record.template;
                navigator.clipboard.writeText(resolved).then(() => {
                  toast("✅ DM copied — paste it on Instagram");
                });
              }
              openExternal(`https://ig.me/m/${username}`);
            }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/70 transition-all whitespace-nowrap min-h-[32px]"
          >Send DM →</button>
        </div>

        <svg className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── EXPANDED PANEL ── */}
      <div style={{ display: "grid", gridTemplateRows: isExpanded ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div className="px-4 pb-5 pt-3 flex flex-col gap-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3 flex-wrap">
              {record.followers > 0 && <span className="text-xs text-gray-600">{formatFollowers(record.followers)} followers</span>}
              {ct && <span className="text-[11px] text-gray-600">{ct.emoji} {ct.label} · {ct.points} pts if they reply</span>}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${reply.classes}`}>{reply.symbol} {reply.label}</span>
            </div>

            {record.description && <p className="text-[#a0a0a0] text-sm leading-relaxed">{record.description}</p>}

            {record.template && (
              <div className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.06]">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-[0.08em]">Step 1 — Ice Breaker</span>
                <p className="text-[#505050] text-[11px] mt-1 mb-2">Send this first — no link</p>
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap mb-3" dangerouslySetInnerHTML={{ __html: highlightedTemplate }} />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleCopyDM}
                    className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 hover:scale-[1.02] transition-all duration-200 active:scale-95 min-h-[44px]">
                    {copied ? "✓ Copied!" : "Copy DM"}
                  </button>
                  <button onClick={() => {
                    if (record.template) {
                      const resolved = producerName ? record.template.replace(/\[BEATMAKER_NAME\]/g, producerName) : record.template;
                      navigator.clipboard.writeText(resolved).then(() => {
                        toast("✅ DM copied — paste it on Instagram");
                      });
                    }
                    openExternal(`https://ig.me/m/${username}`);
                  }}
                    className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 hover:scale-[1.02] transition-all duration-200 active:scale-95 min-h-[44px]">
                    Send DM →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type DemoArtist = {
  name: string;
  slug: string;
  photo: string;
  subtitle: string;
};

type DemoRange = {
  slug: string;
  label: string;
  min: number;
  max: number;
};

export default function DemoNetworkClient({
  records,
  artists,
  ranges,
  currentArtistSlug,
  currentRangeSlug,
  artistName,
  artistPhoto,
  artistSubtitle,
  rangeLabel,
}: {
  records: AirtableRecord[];
  artists: DemoArtist[];
  ranges: DemoRange[];
  currentArtistSlug: string;
  currentRangeSlug: string;
  artistName: string;
  artistPhoto: string;
  artistSubtitle: string;
  rangeLabel: string;
}) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [producerName, setProducerName] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load producer name from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("demo_beatmaker_name");
      if (saved) setProducerName(saved);
    } catch {
      // localStorage blocked
    }
  }, []);

  function handleProducerNameChange(val: string) {
    setProducerName(val);
    try {
      if (val) {
        localStorage.setItem("demo_beatmaker_name", val);
      } else {
        localStorage.removeItem("demo_beatmaker_name");
      }
    } catch {
      // localStorage blocked
    }
  }

  const filterTypes = useMemo(() => {
    const types = new Set<string>();
    records.forEach((r) => { if (r.profileType) types.add(r.profileType); });
    return ["All", ...Array.from(types).sort()];
  }, [records]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: records.length };
    records.forEach((r) => { map[r.profileType] = (map[r.profileType] || 0) + 1; });
    return map;
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchType = activeFilter === "All" || r.profileType === activeFilter;
      const matchSearch =
        !search ||
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.username.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [records, activeFilter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-2">Live Demo</p>
        <h1 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-1">
          Browse{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
            {artistName}
          </span>
          &apos;s Network
        </h1>
        <p className="text-[#a0a0a0] text-sm mt-1">
          {records.length} contacts in the {rangeLabel} range — real data, full access.
        </p>
      </div>

      {/* Producer name input */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-2">
          Personalize your DMs
        </label>
        <input
          type="text"
          value={producerName}
          onChange={(e) => handleProducerNameChange(e.target.value)}
          placeholder="Enter your producer name..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-colors min-h-[44px]"
        />
        {producerName && (
          <p className="text-xs text-orange-400/70 mt-1.5">
            ✓ [BEATMAKER_NAME] replaced with &quot;{producerName}&quot; in all templates
          </p>
        )}
      </div>

      {/* Artist picker */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-3">
          Pick an artist
        </p>
        <div className="flex flex-wrap gap-2">
          {artists.map((a) => {
            const isActive = a.slug === currentArtistSlug;
            return (
              <Link
                key={a.slug}
                href={`/demo?artist=${a.slug}&range=${currentRangeSlug}`}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                    : "bg-white/[0.025] border-white/[0.08] text-[#a0a0a0] hover:border-orange-500/30 hover:text-orange-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.photo} alt={a.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                <span>{a.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Artist header card */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-5 mb-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
        <div className="w-20 h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artistPhoto} alt={artistName} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{artistName}</h2>
          <p className="text-[#606060] text-sm">{artistSubtitle}</p>
        </div>
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl px-5 py-3 text-center flex-shrink-0">
          <p className="text-2xl font-black text-orange-500">{records.length}</p>
          <p className="text-gray-500 text-xs mt-0.5">Contacts in range</p>
        </div>
      </div>

      {/* Range picker */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-3">
          Follower range
        </p>
        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => {
            const isActive = r.slug === currentRangeSlug;
            return (
              <Link
                key={r.slug}
                href={`/demo?artist=${currentArtistSlug}&range=${r.slug}`}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150 tracking-[0.05em] uppercase min-h-[36px] flex items-center ${
                  isActive
                    ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                    : "border-white/[0.08] text-[#a0a0a0] hover:border-orange-500/30 hover:text-orange-400"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-orange-500/[0.06] border border-orange-500/15 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
        <span className="text-base leading-none mt-0.5">💡</span>
        <p className="text-sm text-[#a0a0a0] leading-relaxed">
          <span className="text-orange-400 font-semibold">Smaller accounts = higher response rate.</span>{" "}
          Start with 500–5K for best results. Copy DMs and send directly — no account needed.
        </p>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-14 z-40 bg-[rgba(8,8,8,0.92)] backdrop-blur-[20px] py-4 mb-8 border-b border-white/[0.05]">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, or keyword..."
            className="w-full sm:max-w-sm bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2.5 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors min-h-[44px]"
          />
          <div className="flex gap-2 flex-wrap">
            {filterTypes.map((type) => {
              const count = counts[type] || 0;
              if (type !== "All" && !count) return null;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150 tracking-[0.05em] uppercase min-h-[36px] ${
                    activeFilter === type
                      ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                      : "border-white/[0.08] text-[#a0a0a0] hover:border-orange-500/30 hover:text-orange-400"
                  }`}
                >
                  {type}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs ${activeFilter === type ? "text-white/60" : "text-[#505050]"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <InstagramSafetyGuide />
      <ScoringDisclaimer />

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#505050]">
          <p className="text-lg mb-2">No contacts found</p>
          <p className="text-sm">Try a different filter or follower range.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => {
                const allExpanded = filtered.every((r) => expandedIds.has(r.id));
                if (allExpanded) setExpandedIds(new Set());
                else setExpandedIds(new Set(filtered.map((r) => r.id)));
              }}
              className="text-xs text-gray-500 hover:text-orange-400 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-orange-500/30"
            >
              ↕ {filtered.every((r) => expandedIds.has(r.id)) ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {filtered.map((record, index) => (
              <div key={record.id} style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}>
                <DemoConnectionCard
                  record={record}
                  artistSlug={currentArtistSlug}
                  producerName={producerName}
                  expanded={expandedIds.has(record.id)}
                  onExpandChange={(v) =>
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(record.id);
                      else next.delete(record.id);
                      return next;
                    })
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* CTA footer */}
      <div className="mt-16 border-t border-white/[0.05] pt-12 text-center">
        <p className="text-xl sm:text-2xl font-light tracking-[0.02em] mb-3">
          Sign up to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
            save your progress.
          </span>
        </p>
        <p className="text-[#a0a0a0] text-sm mb-8 max-w-md mx-auto">
          Your contact statuses are saved in this browser. Create a free account to sync them across devices and unlock the full dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-8 py-4 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200 text-base"
          >
            Create free account →
          </Link>
          <Link
            href="/sign-in"
            className="border border-white/[0.1] text-white font-medium px-8 py-4 rounded-lg hover:border-orange-500/40 hover:text-orange-400 hover:scale-[1.02] transition-all duration-200 text-base"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
