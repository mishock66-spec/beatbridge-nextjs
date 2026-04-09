"use client";

import { useState, useMemo } from "react";
import StatusDropdown from "@/components/ui/StatusDropdown";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import type { AirtableRecord } from "@/lib/airtable";
import { supabase } from "@/lib/supabase";
import { replyProbability, contactPriority } from "@/lib/scoreContact";
import { getContactTier } from "@/lib/contactTier";

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

const CONTACT_EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function DescriptionWithEmailGate({
  description,
  isSignedIn,
}: {
  description: string;
  isSignedIn: boolean;
}) {
  const emails = description.match(CONTACT_EMAIL_RE);
  if (!emails || isSignedIn) {
    return <p className="text-[#a0a0a0] text-sm leading-relaxed">{description}</p>;
  }

  const parts = description.split(CONTACT_EMAIL_RE);
  return (
    <p className="text-[#a0a0a0] text-sm leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < emails.length && (
            <Link
              href="/sign-in"
              className="text-orange-400 hover:underline font-medium"
            >
              🔒 Sign in to reveal email
            </Link>
          )}
        </span>
      ))}
    </p>
  );
}

// Strip [LINK] placeholders and "here it is" phrases from ice-breakers (Step 1 only)
function cleanIceBreaker(text: string): string {
  return text
    .replace(/\[LINK\]/gi, "")
    .replace(/here it is:?\s*$/gi, "")
    .replace(/:\s*$/, "")
    .trim();
}

function openExternalUrl(url: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function getTypeEmoji(profileType: string): string {
  return TYPE_EMOJI[profileType] ?? "✦";
}

function TypeEmoji({ profileType }: { profileType: string }) {
  const emoji = getTypeEmoji(profileType);
  return (
    <div className="w-14 h-14 bg-white/[0.05] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
      {emoji}
    </div>
  );
}

function formatFollowers(count: number) {
  if (!count) return "N/A";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export type ContactStatus = "To contact" | "DM sent" | "Replied" | "Not interested";

export const CONTACT_STATUSES: ContactStatus[] = [
  "To contact",
  "DM sent",
  "Replied",
  "Not interested",
];

export const STATUS_STYLE: Record<
  ContactStatus,
  { pill: React.CSSProperties; dot: string; label: string }
> = {
  "To contact": {
    pill: {
      backgroundColor: "rgba(55,65,81,0.5)",
      color: "#9ca3af",
      border: "1px solid #374151",
    },
    dot: "#374151",
    label: "To contact",
  },
  "DM sent": {
    pill: {
      backgroundColor: "rgba(249,115,22,0.15)",
      color: "#f97316",
      border: "1px solid rgba(249,115,22,0.4)",
    },
    dot: "#f97316",
    label: "DM sent",
  },
  Replied: {
    pill: {
      backgroundColor: "rgba(34,197,94,0.15)",
      color: "#22c55e",
      border: "1px solid rgba(34,197,94,0.4)",
    },
    dot: "#22c55e",
    label: "Replied",
  },
  "Not interested": {
    pill: {
      backgroundColor: "rgba(127,29,29,0.3)",
      color: "#b45454",
      border: "1px solid rgba(127,29,29,0.5)",
    },
    dot: "#7f1d1d",
    label: "Not interested",
  },
};

export function statusStorageKey(artistSlug: string, username: string) {
  return `beatbridge_status_${artistSlug}_${username.replace("@", "")}`;
}


export default function ConnectionCard({
  record,
  listeningLink,
  producerName = "",
  dmPriority,
  artistSlug,
  artistName,
  initialStatus,
  initialIceBreaker,
  onStatusChange,
  userPlan = "free",
  originalIndex = 0,
  expanded: externalExpanded,
  onExpandChange,
}: {
  record: AirtableRecord;
  listeningLink: string;
  producerName?: string;
  dmPriority?: number;
  artistSlug?: string;
  artistName?: string;
  initialStatus?: ContactStatus;
  initialIceBreaker?: string;
  onStatusChange?: (contactId: string, next: ContactStatus, prev: ContactStatus) => void;
  userPlan?: string;
  originalIndex?: number;
  expanded?: boolean;
  onExpandChange?: (v: boolean) => void;
}) {
  const { isSignedIn, user } = useUser();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<string | null>(() =>
    initialIceBreaker ? cleanIceBreaker(initialIceBreaker) : null
  );
  const [draftTemplate, setDraftTemplate] = useState("");
  const [isEditingFollowUp, setIsEditingFollowUp] = useState(false);
  const [customFollowUp, setCustomFollowUp] = useState<string | null>(null);
  const [draftFollowUp, setDraftFollowUp] = useState("");
  const [copiedFollowUp, setCopiedFollowUp] = useState(false);
  const [status, setStatus] = useState<ContactStatus>(initialStatus ?? "To contact");
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardGlow, setCardGlow] = useState<"orange" | "green" | null>(null);
  const [showFire, setShowFire] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  function toggleExpand() {
    const next = !isExpanded;
    if (onExpandChange) onExpandChange(next);
    else setInternalExpanded(next);
  }

  async function handleStatusChange(next: ContactStatus) {
    if (!artistSlug || !isSignedIn || !user) return;
    const prev = status;
    setStatus(next);

    if (!supabase) return;

    const contactId = `${artistSlug}_${record.username.replace("@", "").toLowerCase()}`;

    // 1. Persist status to Supabase FIRST — before any side effects
    console.log("Upserting status:", { user_id: user.id, contact_id: contactId, status: next });
    const { data: upsertData, error: upsertError } = await supabase.from("dm_status").upsert(
      {
        user_id:     user.id,
        artist_slug: artistSlug,
        username:    record.username.replace("@", ""),
        contact_id:  contactId,
        status:      next,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: "user_id,contact_id" }
    );
    console.log("Upsert result:", { data: upsertData, error: upsertError });

    // 2. dm_activity tracking
    if (next === "DM sent" && prev !== "DM sent") {
      const { data: actData, error: actError } = await supabase.from("dm_activity").insert({
        user_id:    user.id,
        contact_id: contactId,
        action:     "sent",
        dm_sent_at: new Date().toISOString(),
      });
      console.log("dm_activity insert:", { data: actData, error: actError });
    } else if (prev === "DM sent" && next !== "DM sent") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      await supabase.from("dm_activity")
        .delete()
        .eq("user_id", user.id)
        .eq("contact_id", contactId)
        .eq("action", "sent")
        .gte("dm_sent_at", todayStart.toISOString());
    }

    // 3. Notify parent (DM counter update)
    onStatusChange?.(contactId, next, prev);

    // 4. Celebrations (fire-and-forget, never blocks the save)
    if (next === "DM sent" && prev !== "DM sent") {
      setShowFire(true);
      setTimeout(() => setShowFire(false), 1000);
      setCardGlow("orange");
      setTimeout(() => setCardGlow(null), 1000);
      toast("DM sent! 🔥 Keep the momentum going.", {
        duration: 3000,
        style: { border: "1px solid rgba(249,115,22,0.5)" },
      });
      // Award points for sending a DM (non-blocking, guard prevents double-award per contact)
      fetch("/api/points/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, contactId, followers: record.followers }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.pointsEarned) {
            toast(`+${data.pointsEarned} pts! ${data.emoji} ${data.label} contact outreach`, { duration: 3000, style: { border: "1px solid rgba(249,115,22,0.4)" } });
          }
        })
        .catch(() => {});
    } else if (next === "Replied" && prev !== "Replied") {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#f97316", "#ffffff", "#111111"] });
      });
      setCardGlow("green");
      setTimeout(() => setCardGlow(null), 2000);

      // Award points (non-blocking)
      fetch("/api/points/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, contactId, followers: record.followers }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.pointsEarned) {
            toast(`+${data.pointsEarned} points! 🎆 ${data.emoji} ${data.label} contact replied!`, { duration: 5000, style: { border: "1px solid rgba(34,197,94,0.5)" } });
          } else {
            toast("🎆 They replied! You're in. Now send your link.", { duration: 5000, style: { border: "1px solid rgba(34,197,94,0.5)" } });
          }
        })
        .catch(() => {
          toast("🎆 They replied! You're in. Now send your link.", { duration: 5000, style: { border: "1px solid rgba(34,197,94,0.5)" } });
        });
    }
  }

  const typeColor = TYPE_COLORS[record.profileType] || TYPE_COLORS.Other;
  const reply = replyProbability(record);
  const priority = contactPriority(record);

  const activeTemplate = customTemplate ?? (record.template ? cleanIceBreaker(record.template) : record.template);
  const activeFollowUp = customFollowUp ?? record.followUp;

  // Substitute [BEATMAKER_NAME] and [LINK] placeholders.
  // useMemo ensures recomputation whenever producerName or listeningLink change.
  const resolvedTemplate = useMemo(() => {
    if (!activeTemplate) return activeTemplate ?? undefined;
    let t = activeTemplate;
    if (producerName) t = t.split("[BEATMAKER_NAME]").join(producerName);
    if (listeningLink) t = t.replace(/\[(?:YOUR (?:LISTENING )?)?LINK\]/gi, listeningLink);
    return t;
  }, [activeTemplate, producerName, listeningLink]);

  const resolvedFollowUp = useMemo(() => {
    if (!activeFollowUp) return activeFollowUp ?? undefined;
    let t = activeFollowUp;
    if (producerName) t = t.split("[BEATMAKER_NAME]").join(producerName);
    if (listeningLink) t = t.replace(/\[(?:YOUR (?:LISTENING )?)?LINK\]/gi, listeningLink);
    return t;
  }, [activeFollowUp, producerName, listeningLink]);

  function handleCopyDM() {
    if (!isSignedIn) {
      toast("Sign in to copy DM templates", { icon: "🔒" });
      return;
    }
    if (!resolvedTemplate) return;
    navigator.clipboard.writeText(resolvedTemplate).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("DM copied to clipboard ✓");
    });
  }

  function handleEditClick() {
    setDraftTemplate(activeTemplate);
    setIsEditing(true);
  }

  function handleSave() {
    setCustomTemplate(draftTemplate);
    setIsEditing(false);
  }

  function handleReset() {
    setCustomTemplate(null);
    setDraftTemplate("");
    setIsEditing(false);
  }

  async function handleGenerateDM() {
    if (!isSignedIn) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: record.fullName,
          username: record.username.replace("@", ""),
          contactType: record.profileType,
          followers: record.followers,
          contactBio: record.description,
          artistName: artistName || artistSlug || "the artist",
          userId: user?.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }
      const { ice_breaker } = await res.json();
      if (ice_breaker) {
        setCustomTemplate(ice_breaker);
        setIsEditing(false);
        // Persist to Supabase so it survives page navigation
        if (artistSlug && supabase && user) {
          const contactId = `${artistSlug}_${record.username.replace("@", "").toLowerCase()}`;
          await supabase.from("dm_status").upsert(
            {
              user_id:     user.id,
              artist_slug: artistSlug,
              username:    record.username.replace("@", ""),
              contact_id:  contactId,
              ice_breaker,
              updated_at:  new Date().toISOString(),
            },
            { onConflict: "user_id,contact_id" }
          );
        }
      }
    } catch (err) {
      console.error("[generate-dm] client error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate DM");
    } finally {
      setIsGenerating(false);
    }
  }

  const MARK_LINK = `<mark style="background-color:rgba(249,115,22,0.15);color:rgb(251,146,60);border-radius:3px;padding:0 3px;font-weight:600;">`;
  const MARK_PLACEHOLDER = `<mark style="background-color:rgba(249,115,22,0.3);color:rgb(251,146,60);border-radius:3px;padding:0 3px;font-weight:600;">`;

  const highlightedTemplate = useMemo(() => {
    const text = resolvedTemplate;
    if (!text) return "";
    let html = text;
    if (producerName) {
      html = html.split(producerName).join(`${MARK_LINK}${producerName}</mark>`);
    } else {
      html = html.split("[BEATMAKER_NAME]").join(`${MARK_PLACEHOLDER}[BEATMAKER_NAME]</mark>`);
    }
    if (listeningLink) {
      html = html.replace(new RegExp(listeningLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `${MARK_LINK}${listeningLink}</mark>`);
    } else {
      html = html.replace(/\[(?:YOUR (?:LISTENING )?)?LINK\]/gi, (m) => `${MARK_PLACEHOLDER}${m}</mark>`);
    }
    return html;
  }, [resolvedTemplate, producerName, listeningLink]);

  const highlightedFollowUp = useMemo(() => {
    const text = resolvedFollowUp;
    if (!text) return "";
    let html = text;
    if (producerName) {
      html = html.split(producerName).join(`${MARK_LINK}${producerName}</mark>`);
    } else {
      html = html.split("[BEATMAKER_NAME]").join(`${MARK_PLACEHOLDER}[BEATMAKER_NAME]</mark>`);
    }
    if (listeningLink) {
      html = html.replace(new RegExp(listeningLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `${MARK_LINK}${listeningLink}</mark>`);
    } else {
      html = html.replace(/\[(?:YOUR (?:LISTENING )?)?LINK\]/gi, (m) => `${MARK_PLACEHOLDER}${m}</mark>`);
    }
    return html;
  }, [resolvedFollowUp, producerName, listeningLink]);

  const username = record.username.replace("@", "");
  const ct = record.followers > 0 ? getContactTier(record.followers) : null;

  return (
    <div
      className={`bg-white/[0.025] border rounded-xl transition-all duration-200 relative overflow-visible
        ${isExpanded ? "border-l-[3px] border-l-orange-500 border-white/[0.08]" : "border-white/[0.08] hover:border-white/[0.15]"}
        ${cardGlow === "orange" ? " card-glow-orange" : cardGlow === "green" ? " card-glow-green" : ""}
      `}
    >
      {/* Fire burst particles */}
      {showFire && (
        <>
          {[
            { left: "20%", delay: "0ms" },
            { left: "35%", delay: "80ms" },
            { left: "50%", delay: "30ms" },
            { left: "65%", delay: "120ms" },
            { left: "78%", delay: "60ms" },
          ].map((p, i) => (
            <span key={i} className="fire-particle" style={{ left: p.left, bottom: "50%", animationDelay: p.delay }}>🔥</span>
          ))}
        </>
      )}

      {/* ── COLLAPSED ROW — always visible, click to expand ── */}
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 cursor-pointer select-none min-h-[60px]"
        onClick={toggleExpand}
      >
        {/* DM priority number — far left, before avatar */}
        {dmPriority !== undefined && (
          <span className="text-[10px] font-bold w-6 text-center flex-shrink-0 text-[#505050]">#{dmPriority}</span>
        )}

        {/* 32px type emoji */}
        <div className="w-8 h-8 bg-white/[0.05] rounded-lg flex items-center justify-center text-sm flex-shrink-0">
          {getTypeEmoji(record.profileType)}
        </div>

        {/* Name + handle + followers */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap leading-tight">
            <p className="text-sm font-semibold text-white truncate max-w-[140px] sm:max-w-none">{record.fullName}</p>
            <button
              onClick={(e) => { e.stopPropagation(); openExternalUrl(record.profileUrl || `https://instagram.com/${username}`); }}
              className="text-orange-400 text-xs hover:underline flex-shrink-0"
            >
              @{username}
            </button>
            {record.followers > 0 && (
              <span className="text-xs text-gray-600 flex-shrink-0 hidden sm:inline">{formatFollowers(record.followers)}</span>
            )}
          </div>
        </div>

        {/* Badges + interactive actions — stopProp wrapper */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className={`hidden md:inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}>
            {record.profileType}
          </span>
          <span className={`hidden lg:inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${priority.classes}`}>
            {priority.symbol} {priority.label}
          </span>
          {artistSlug && isSignedIn && (
            <StatusDropdown status={status} onChange={handleStatusChange} />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); openExternalUrl(`https://ig.me/m/${username}`); }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/70 transition-all whitespace-nowrap min-h-[32px]"
          >
            Send DM →
          </button>
        </div>

        {/* Chevron — participates in card toggle */}
        <svg
          className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── EXPANDED PANEL — animated with grid-template-rows trick ── */}
      <div style={{ display: "grid", gridTemplateRows: isExpanded ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div className="px-4 pb-5 pt-3 flex flex-col gap-4 border-t border-white/[0.06]">

            {/* Follower tier + reply probability row */}
            <div className="flex items-center gap-3 flex-wrap">
              {record.followers > 0 && (
                <span className="text-xs text-gray-600">
                  {formatFollowers(record.followers)} followers
                </span>
              )}
              {ct && (
                <span className="text-[11px] text-gray-600">{ct.emoji} {ct.label} · {ct.points} pts if they reply</span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${reply.classes}`}>
                {reply.symbol} {reply.label}
              </span>

            </div>

            {/* Description */}
            {record.description && (
              <DescriptionWithEmailGate description={record.description} isSignedIn={!!isSignedIn} />
            )}

            {/* STEP 1 — Ice Breaker */}
            {(record.template || customTemplate) && (
              <div className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-[0.08em]">Step 1 — Ice Breaker</span>
                    {customTemplate !== null && isSignedIn && (
                      <span className="ml-2 text-orange-400/50 text-xs">(edited)</span>
                    )}
                  </div>
                  {!isEditing && isSignedIn && (
                    <button onClick={handleEditClick} className="text-xs text-gray-500 hover:text-orange-400 transition-colors px-1.5 py-0.5 rounded hover:bg-orange-400/10">Edit</button>
                  )}
                </div>
                <p className="text-[#505050] text-[11px] mb-2">Send this first — no link</p>

                {isSignedIn && isEditing ? (
                  <div className="flex flex-col gap-2">
                    <textarea value={draftTemplate} onChange={(e) => setDraftTemplate(e.target.value)} rows={5}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[#d0d0d0] text-xs leading-relaxed focus:outline-none focus:border-orange-500/50 resize-y" />
                    <div className="flex gap-2">
                      <button onClick={handleSave} className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 transition-opacity">Save</button>
                      <button onClick={handleReset} className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg border border-white/[0.08] text-[#a0a0a0] hover:border-white/[0.2] hover:text-white transition-colors">Reset</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative mb-3">
                    <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap"
                      style={!isSignedIn ? { filter: "blur(4px)", pointerEvents: "none", userSelect: "none" } : undefined}
                      dangerouslySetInnerHTML={{ __html: highlightedTemplate }} />
                    {!isSignedIn && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Link href="/sign-in" className="text-xs font-bold bg-orange-500 text-black px-3 py-1.5 rounded-full hover:bg-orange-400 transition-colors">Sign in to view</Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleCopyDM} disabled={!activeTemplate}
                    className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 hover:scale-[1.02] active:scale-95">
                    {copied ? "✓ Copied!" : "Copy DM"}
                  </button>
                  <button
                    onClick={() => openExternalUrl(`https://ig.me/m/${username}`)}
                    className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 hover:scale-[1.02] transition-all duration-200 active:scale-95">
                    Send DM →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Follow-up */}
            {status.toLowerCase() === "replied" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-green-500/[0.06] rounded-xl p-3.5 border border-green-500/20">
                <p className="text-sm font-semibold text-green-400 mb-1">🎉 They replied! Now send your link:</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-green-400/70 uppercase tracking-[0.08em]">Step 2 — Follow-up</span>
                  {!isEditingFollowUp && isSignedIn && (
                    <button onClick={() => { setDraftFollowUp(activeFollowUp ?? ""); setIsEditingFollowUp(true); }}
                      className="text-xs text-gray-500 hover:text-green-400 transition-colors px-1.5 py-0.5 rounded hover:bg-green-400/10">Edit</button>
                  )}
                </div>
                {isSignedIn && isEditingFollowUp ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <textarea value={draftFollowUp} onChange={(e) => setDraftFollowUp(e.target.value)} rows={3}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[#d0d0d0] text-xs leading-relaxed focus:outline-none focus:border-green-500/50 resize-y" />
                    <div className="flex gap-2">
                      <button onClick={() => { setCustomFollowUp(draftFollowUp); setIsEditingFollowUp(false); }}
                        className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-green-600 text-white hover:opacity-90 transition-opacity">Save</button>
                      <button onClick={() => { setCustomFollowUp(null); setDraftFollowUp(""); setIsEditingFollowUp(false); }}
                        className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg border border-white/[0.08] text-[#a0a0a0] hover:border-white/[0.2] hover:text-white transition-colors">Reset</button>
                    </div>
                  </div>
                ) : (
                  <div className="relative mt-2 mb-3">
                    {activeFollowUp ? (
                      <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightedFollowUp }} />
                    ) : (
                      <p className="text-[#505050] text-xs italic">No follow-up template — click Edit to write yours.</p>
                    )}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      if (!isSignedIn) { toast("Sign in to copy DM templates", { icon: "🔒" }); return; }
                      if (!resolvedFollowUp) return;
                      navigator.clipboard.writeText(resolvedFollowUp).then(() => { setCopiedFollowUp(true); setTimeout(() => setCopiedFollowUp(false), 2000); toast.success("Follow-up copied ✓"); });
                    }}
                    className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg bg-green-600/80 text-white hover:bg-green-600 hover:scale-[1.02] transition-all duration-200 active:scale-95">
                    {copiedFollowUp ? "✓ Copied!" : "Copy Follow-up"}
                  </button>
                  <button
                    onClick={() => openExternalUrl(`https://ig.me/m/${username}`)}
                    className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/60 hover:scale-[1.02] transition-all duration-200 active:scale-95">
                    Send DM →
                  </button>
                </div>
              </div>
            )}

            {/* AI DM Generation */}
            {isSignedIn && (() => {
              const canGenerate = userPlan === "premium" || userPlan === "lifetime" || (userPlan === "pro" && originalIndex < 50);
              if (!canGenerate) {
                return (
                  <Link href="/pricing"
                    className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-orange-500/20 text-orange-400/60 hover:border-orange-500/40 hover:text-orange-400/80 transition-all duration-200 flex items-center justify-center gap-2">
                    {userPlan === "pro" ? "✨ Upgrade to Premium for all contacts" : "✨ Upgrade to Pro for AI generation"}
                  </Link>
                );
              }
              return (
                <button onClick={handleGenerateDM} disabled={isGenerating}
                  className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-orange-500/20 text-orange-400/80 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {isGenerating ? (<><span className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />Generating...</>) : "✨ Generate my DM"}
                </button>
              );
            })()}

            {/* No template fallback */}
            {record.profileUrl && !record.template && !customTemplate && (
              <button onClick={() => openExternalUrl(record.profileUrl)}
                className="w-full text-sm font-semibold py-2.5 px-3 rounded-lg border border-white/[0.08] text-[#a0a0a0] hover:border-orange-500/40 hover:text-orange-400 hover:scale-[1.02] transition-all duration-200 active:scale-95 text-center">
                Open Instagram
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
