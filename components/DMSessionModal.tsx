"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import type { AirtableRecord } from "@/lib/airtable";

type ContactStatus = "To contact" | "DM sent" | "Replied" | "Not interested";
type Phase = "notify_prompt" | "setup" | "in_progress" | "break" | "summary";

function fireNotification(title: string, body: string) {
  console.log("[DMSession] fireNotification called — permission:", typeof Notification !== "undefined" ? Notification.permission : "unavailable");
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/icons/icon-512.png",
    badge: "/icons/icon-512.png",
  });
  n.onclick = () => window.focus();
}

const TIMER_NORMAL_SEC = 5 * 60;   // 5-minute cooldown between DMs
const TIMER_SAFETY_SEC = 15 * 60;  // 15-minute break every 10 DMs
const HOURLY_DM_LIMIT = 10;        // force safety break after this many DMs in session

const TYPE_EMOJI: Record<string, string> = {
  Producer: "🎹", Label: "💿", DJ: "🎧", Studio: "🎙️",
  Manager: "📋", "Sound Engineer": "🔊", "Artist/Rapper": "🎤",
  "Photographer/Videographer": "📸", Other: "💼",
};

function resolveTemplate(template: string, producerName: string, listeningLink: string): string {
  let t = template;
  if (producerName) t = t.replace(/\[BEATMAKER_NAME\]/g, producerName);
  if (listeningLink) t = t.replace(/\[(?:YOUR (?:LISTENING )?)?LINK\]/gi, listeningLink);
  return t;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFollowers(n: number): string {
  if (!n) return "N/A";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function openInstagramDM(username: string) {
  const handle = username.replace("@", "");
  const url = `https://ig.me/m/${handle}`;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) window.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
}

export default function DMSessionModal({
  records,
  statusMap,
  producerName,
  listeningLink,
  dmSentCount: initialDmSentCount,
  dailyLimit,
  artistSlug,
  onClose,
  onMarkSent,
}: {
  records: AirtableRecord[];
  statusMap: Record<string, { status: ContactStatus; ice_breaker?: string }> | null;
  producerName: string;
  listeningLink: string;
  dmSentCount: number;
  dailyLimit: number;
  artistSlug: string;
  onClose: () => void;
  onMarkSent: (contactId: string) => void;
}) {
  const { user, isSignedIn } = useUser();

  // ── Default selection: all "To contact" contacts ──────────────────────────
  const defaultSelected = useMemo(() => new Set(
    records
      .filter((r) => {
        const cid = `${artistSlug}_${r.username.replace("@", "").toLowerCase()}`;
        const entry = statusMap?.[cid];
        return !entry || entry.status === "To contact";
      })
      .map((r) => r.id)
  ), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");

  // Show notification opt-in prompt if permission hasn't been decided yet
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      setPhase("notify_prompt");
    }
  }, []);
  const [selected, setSelected] = useState<Set<string>>(defaultSelected);
  const [queue, setQueue] = useState<AirtableRecord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sentInSession, setSentInSession] = useState(0);
  const [dmSentCount, setDmSentCount] = useState(initialDmSentCount);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSafetyBreak, setIsSafetyBreak] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  const currentContact = (phase === "in_progress" || phase === "break")
    ? queue[currentIdx] ?? null
    : null;

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "break") return;
    const id = setInterval(() => {
      setCountdown((c) => (c !== null && c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Fire notification when timer hits 0 — do NOT auto-advance, wait for user click
  useEffect(() => {
    if (phase !== "break" || countdown !== 0 || timerExpired) return;
    console.log("[DMSession] Timer hit 0 — firing notification, isSafetyBreak:", isSafetyBreak);
    if (isSafetyBreak) {
      fireNotification(
        "✅ BeatBridge — Safety break complete!",
        "You can now continue your DM session."
      );
    } else {
      fireNotification(
        "⏱ BeatBridge — Time to send your next DM!",
        "Your 5-minute break is over. Next contact is ready."
      );
    }
    setTimerExpired(true);
  }, [phase, countdown, isSafetyBreak, timerExpired]);

  // ── Auto-copy template when entering a contact ────────────────────────────
  useEffect(() => {
    if (phase !== "in_progress" || !currentContact?.template) return;
    setCopied(false);
    const tpl = currentContact.template;
    const resolved = resolveTemplate(tpl, producerName, listeningLink);
    navigator.clipboard.writeText(resolved)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [phase, currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  function startSession() {
    const q = records.filter((r) => selected.has(r.id));
    if (!q.length) return;
    setQueue(q);
    setCurrentIdx(0);
    setSentInSession(0);
    setDmSentCount(initialDmSentCount);
    setPhase("in_progress");
  }

  async function markSentAndNext() {
    if (!currentContact) return;
    const contactId = `${artistSlug}_${currentContact.username.replace("@", "").toLowerCase()}`;
    const newSent = sentInSession + 1;
    const newTotal = dmSentCount + 1;

    // Persist to Supabase (fire-and-forget)
    if (supabase && isSignedIn && user) {
      supabase.from("dm_status").upsert(
        { user_id: user.id, artist_slug: artistSlug, username: currentContact.username.replace("@", ""), contact_id: contactId, status: "DM sent", updated_at: new Date().toISOString() },
        { onConflict: "user_id,contact_id" }
      ).then(() => {});
      supabase.from("dm_activity").insert(
        { user_id: user.id, contact_id: contactId, action: "sent", dm_sent_at: new Date().toISOString() }
      ).then(() => {});
    }

    onMarkSent(contactId);
    setSentInSession(newSent);
    setDmSentCount(newTotal);

    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) { setPhase("summary"); return; }

    setCurrentIdx(nextIdx);
    setTimerExpired(false);

    // Safety break every HOURLY_DM_LIMIT DMs
    if (newSent % HOURLY_DM_LIMIT === 0) {
      setIsSafetyBreak(true);
      setCountdown(TIMER_SAFETY_SEC);
      setPhase("break");
    } else {
      setIsSafetyBreak(false);
      setCountdown(TIMER_NORMAL_SEC);
      setPhase("break");
    }
  }

  function skip() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) { setPhase("summary"); return; }
    setCurrentIdx(nextIdx);
    // phase stays in_progress → auto-copy fires for next contact
  }

  function endSession() { setPhase("summary"); }

  function skipBreak() {
    setCountdown(null);
    setTimerExpired(false);
    setPhase("in_progress");
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedList = records.filter((r) => selected.has(r.id));
  const estimatedMin = selectedList.length * 5;
  const atDailyLimit = dmSentCount >= dailyLimit;
  const progress = queue.length > 0 ? Math.round((currentIdx / queue.length) * 100) : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFY PROMPT PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "notify_prompt") {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-[#0e0e0e] border border-white/[0.1] rounded-2xl w-full max-w-sm shadow-2xl px-8 py-10 text-center">
          <div className="text-5xl mb-5">🔔</div>
          <h2 className="text-lg font-semibold text-white mb-2">Stay on track</h2>
          <p className="text-sm text-[#a0a0a0] leading-relaxed mb-8">
            Get a browser notification when your cooldown timer ends — so you can step away and come back at the right moment.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                Notification.requestPermission().finally(() => setPhase("setup"));
              }}
              className="w-full bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity min-h-[44px]"
            >
              Enable notifications
            </button>
            <button
              onClick={() => setPhase("setup")}
              className="w-full border border-white/[0.1] text-[#a0a0a0] font-medium py-3 rounded-xl hover:border-white/[0.2] hover:text-white transition-all min-h-[44px] text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "setup") {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-[#0e0e0e] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-semibold text-white">Start DM Session</h2>
              <p className="text-xs text-[#606060] mt-0.5">Auto-copy, guided flow, safety timers</p>
            </div>
            <button onClick={onClose} className="text-[#505050] hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Daily limit block */}
            {atDailyLimit && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-red-400 font-semibold">Daily limit reached</p>
                <p className="text-xs text-red-400/70 mt-1">
                  You&apos;ve sent {dmSentCount}/{dailyLimit} DMs today. Come back tomorrow to continue.
                </p>
              </div>
            )}

            {/* Pre-session warning */}
            <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-orange-400 font-semibold uppercase tracking-[0.08em] mb-1">
                Before you start
              </p>
              <p className="text-sm text-[#a0a0a0] leading-relaxed">
                Make sure you&apos;re logged into Instagram. BeatBridge copies each DM automatically — you paste and send, then come back here.
              </p>
            </div>

            {/* Select all / none row */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">
                <span className="text-orange-500">{selectedList.length}</span> contacts selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(new Set(records.map((r) => r.id)))}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={() => setSelected(defaultSelected)}
                  className="text-xs text-[#606060] hover:text-[#a0a0a0] transition-colors"
                >
                  To contact
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-[#505050] hover:text-[#a0a0a0] transition-colors"
                >
                  None
                </button>
              </div>
            </div>

            {/* Contact list */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
              {records.map((r) => {
                const checked = selected.has(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(r.id) : next.delete(r.id);
                          return next;
                        });
                      }}
                      className="w-4 h-4 accent-orange-500 flex-shrink-0"
                    />
                    <span className="text-base leading-none flex-shrink-0">{TYPE_EMOJI[r.profileType] ?? "💼"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">@{r.username.replace("@", "")}</p>
                      <p className="text-xs text-[#606060]">{r.profileType} · {formatFollowers(r.followers)}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Estimated time + daily counter */}
            {selectedList.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-white font-medium">{selectedList.length} DMs</p>
                  <p className="text-xs text-[#606060] mt-0.5">~{estimatedMin} min (5 min cooldown each)</p>
                </div>
                <p className="text-xs text-[#505050]">{dmSentCount}/{dailyLimit} sent today</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06]">
            <button
              onClick={startSession}
              disabled={selectedList.length === 0 || atDailyLimit}
              className="w-full bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold py-3.5 rounded-xl hover:opacity-90 hover:scale-[1.01] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 min-h-[44px] text-base"
            >
              Start Session →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "summary") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#0e0e0e] border border-white/[0.1] rounded-2xl w-full max-w-sm text-center px-8 py-10 shadow-2xl">
          <div className="text-5xl mb-5">{sentInSession > 0 ? "🎉" : "✌️"}</div>
          <h2 className="text-2xl font-semibold mb-2">Session complete</h2>
          <p className="text-[#a0a0a0] text-sm mb-1">
            <span className="text-orange-500 font-bold text-2xl">{sentInSession}</span>
            <span className="ml-1">DM{sentInSession !== 1 ? "s" : ""} sent this session</span>
          </p>
          <p className="text-[#606060] text-xs mb-8 leading-relaxed">
            {dmSentCount}/{dailyLimit} DMs sent today.
            {dmSentCount >= dailyLimit
              ? " Come back tomorrow to continue."
              : ` ${dailyLimit - dmSentCount} remaining for today.`}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IN-PROGRESS / BREAK PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-[rgba(8,8,8,0.97)] backdrop-blur-md">
      <div className="w-full max-w-md">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-[#505050] uppercase tracking-[0.1em] font-medium">DM Session</p>
          <button
            onClick={endSession}
            className="text-xs text-[#505050] hover:text-[#a0a0a0] transition-colors"
          >
            End session
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-white">
              Contact {currentIdx + 1} <span className="text-[#505050]">of</span> {queue.length}
            </p>
            <p className="text-xs text-[#505050]">{dmSentCount}/{dailyLimit} sent today</p>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f97316] to-[#f85c00] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#404040] mt-1">{progress}% complete · {sentInSession} sent this session</p>
        </div>

        {/* Contact card */}
        {currentContact && (
          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5 mb-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-white/[0.05] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {TYPE_EMOJI[currentContact.profileType] ?? "💼"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{currentContact.fullName || `@${currentContact.username.replace("@", "")}`}</p>
                <p className="text-orange-400 text-sm">@{currentContact.username.replace("@", "")}</p>
                <p className="text-xs text-[#606060] mt-0.5">
                  {currentContact.profileType} · {formatFollowers(currentContact.followers)} followers
                </p>
              </div>
            </div>

            {/* Copy status */}
            <div className={`flex items-center gap-2 text-sm transition-colors ${copied ? "text-green-400" : "text-[#505050]"}`}>
              <span>{copied ? "✅" : "⏳"}</span>
              <span>{copied ? "DM copied to clipboard" : "Copying template..."}</span>
            </div>
          </div>
        )}

        {/* Break state */}
        {phase === "break" && !timerExpired ? (
          <div className="text-center py-4">
            {isSafetyBreak ? (
              <>
                <p className="text-xs text-orange-400/70 uppercase tracking-[0.1em] font-semibold mb-2">Safety break</p>
                <p className="text-xs text-[#a0a0a0] mb-4 leading-relaxed max-w-xs mx-auto">
                  Instagram recommends max 10–15 DMs per hour. Taking a 15-minute break to keep your account safe.
                </p>
              </>
            ) : (
              <p className="text-xs text-[#606060] uppercase tracking-[0.1em] font-medium mb-4">Next DM available in</p>
            )}
            <p className="text-6xl font-mono font-light text-white mb-6 tabular-nums">
              {countdown !== null ? formatTime(countdown) : "0:00"}
            </p>
            <button
              onClick={skipBreak}
              className="text-xs text-[#404040] hover:text-[#606060] transition-colors underline"
            >
              Skip break (not recommended)
            </button>
          </div>
        ) : (
          /* In-progress actions (also shown when timer expires in break phase) */
          <div className="space-y-3">
            {timerExpired && (
              <p className="text-xs text-green-400 text-center font-medium pb-1">
                ✅ Break over — ready to send your next DM
              </p>
            )}
            {/* Open Instagram */}
            <button
              onClick={() => currentContact && openInstagramDM(currentContact.username)}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white font-semibold py-3.5 rounded-xl hover:bg-white/[0.07] hover:border-orange-500/30 transition-all duration-200 flex items-center justify-center gap-2.5 min-h-[44px]"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Open Instagram DM →
            </button>

            {/* Mark sent + Skip */}
            <div className="flex gap-2.5">
              <button
                onClick={markSentAndNext}
                className="flex-1 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold py-3 rounded-xl hover:opacity-90 hover:scale-[1.01] transition-all duration-200 active:scale-95 min-h-[44px] text-sm"
              >
                Mark as Sent &amp; Next
              </button>
              <button
                onClick={skip}
                className="px-4 border border-white/[0.1] text-[#a0a0a0] font-medium py-3 rounded-xl hover:border-white/[0.2] hover:text-white transition-all min-h-[44px] text-sm"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
