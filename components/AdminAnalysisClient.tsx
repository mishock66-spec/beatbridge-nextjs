"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AnalysisContact } from "@/app/api/admin/analysis-contacts/route";

const ADMIN_EMAIL = "mishock66@gmail.com";

const RAILWAY_BASE =
  process.env.NEXT_PUBLIC_ANALYZER_WEBHOOK_URL ||
  "https://beatbridge-analyzer-production.up.railway.app";

const ARTISTS = [
  "Wheezy",
  "Curren$y",
  "Harry Fraud",
  "Juke Wong",
  "Southside",
  "Metro Boomin",
];

const PROFILE_TYPES = [
  "Autre",
  "Beatmaker/Producteur",
  "Ingé son",
  "Manager",
  "Artiste/Rappeur",
  "Photographe/Vidéaste",
  "DJ",
];

const LAST_RUN_KEY = "beatbridge_analysis_last_run";

type SessionState = "idle" | "starting" | "running" | "done" | "error";

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAnalysisClient() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [contacts, setContacts] = useState<AnalysisContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [analyzedFieldExists, setAnalyzedFieldExists] = useState(true);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Filters — queue builder
  const [filterArtist, setFilterArtist] = useState("");
  const [filterType, setFilterType] = useState("Autre");

  // Filters — analyzed contacts section
  const [analyzedFilterArtist, setAnalyzedFilterArtist] = useState("");
  const [copyToast, setCopyToast] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const [filterBio, setFilterBio] = useState<"all" | "has-bio" | "no-bio">("all");
  const [filterAnalyzed, setFilterAnalyzed] = useState<"all" | "analyzed" | "not-analyzed">("not-analyzed");
  const [maxContacts, setMaxContacts] = useState(50);

  // Session / job state
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobCompleted, setJobCompleted] = useState(0);
  const [jobSkipped, setJobSkipped] = useState(0);
  const [jobErrors, setJobErrors] = useState(0);
  const [jobCurrent, setJobCurrent] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Admin guard
  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    if (email !== ADMIN_EMAIL) router.replace("/dashboard");
  }, [isLoaded, user, router]);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_RUN_KEY);
    if (stored) setLastRun(stored);
  }, []);

  const adminUserId = user?.id ?? "";

  // Fetch contacts
  useEffect(() => {
    if (!adminUserId) return;
    setLoading(true);
    fetch(`/api/admin/analysis-contacts?userId=${encodeURIComponent(adminUserId)}`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts ?? []);
        setTotalAnalyzed(data.totalAnalyzed ?? 0);
        setTotalPending(data.totalPending ?? 0);
        setAnalyzedFieldExists(data.analyzedFieldExists !== false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adminUserId]);

  // Poll job status every 3s while running
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (sessionState !== "running" || !jobId) return;

    async function poll() {
      try {
        const res = await fetch(`${RAILWAY_BASE}/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        console.log("[Analysis] poll response:", data);

        setJobProgress(data.progress ?? 0);
        setJobTotal(data.total ?? 0);
        setJobCompleted(data.completed ?? 0);
        setJobSkipped(data.skipped ?? 0);
        setJobErrors(data.errors ?? 0);
        setJobCurrent(data.current ?? null);

        if (data.status === "completed" || data.status === "rate_limited") {
          setSessionState("done");
          stopPolling();
          // Refresh totals
          const now = new Date().toISOString();
          localStorage.setItem(LAST_RUN_KEY, now);
          setLastRun(now);
        } else if (data.status === "failed") {
          setSessionError(data.error || "Analysis job failed");
          setSessionState("error");
          stopPolling();
        }
      } catch {
        // transient network error — keep polling
      }
    }

    poll();
    pollRef.current = setInterval(poll, 3000);
    return stopPolling;
  }, [sessionState, jobId, stopPolling]);

  // Filtered + limited contacts for queue
  const selectedContacts = useMemo(() => {
    let result = contacts;

    if (filterArtist) {
      if (filterArtist === "Curren$y") {
        result = result.filter((c) => c.suiviPar === "Curren$y" || c.suiviPar === "CurrenSy");
      } else {
        result = result.filter((c) => c.suiviPar === filterArtist);
      }
    }
    if (filterType) {
      result = result.filter((c) => c.profileType === filterType);
    }
    if (filterBio === "has-bio") {
      result = result.filter((c) => c.bio.trim().length > 0);
    } else if (filterBio === "no-bio") {
      result = result.filter((c) => c.bio.trim().length === 0);
    }
    if (filterAnalyzed === "analyzed") {
      result = result.filter((c) => c.analyzed);
    } else if (filterAnalyzed === "not-analyzed") {
      result = result.filter((c) => !c.analyzed);
    }

    return result.slice(0, maxContacts);
  }, [contacts, filterArtist, filterType, filterBio, filterAnalyzed, maxContacts]);

  // Analyzed contacts list (sorted alphabetically, filtered by artist)
  const analyzedContacts = useMemo(() => {
    let result = contacts.filter((c) => c.analyzed);
    if (analyzedFilterArtist) {
      if (analyzedFilterArtist === "Curren$y") {
        result = result.filter((c) => c.suiviPar === "Curren$y" || c.suiviPar === "CurrenSy");
      } else {
        result = result.filter((c) => c.suiviPar === analyzedFilterArtist);
      }
    }
    return result.slice().sort((a, b) => a.username.localeCompare(b.username));
  }, [contacts, analyzedFilterArtist]);

  function buildContactPayload() {
    return selectedContacts.map((c) => ({
      username: c.username.replace(/^@/, ""),
      record_id: c.id,
      artist: c.suiviPar === "CurrenSy" ? "Curren$y" : c.suiviPar,
      current_type: c.profileType,
      current_template: c.template,
      bio: c.bio,
    }));
  }

  async function handleStartSession() {
    if (selectedContacts.length === 0 || !adminUserId) return;
    setSessionState("starting");
    setSessionError(null);
    setJobProgress(0);
    setJobCompleted(0);
    setJobSkipped(0);
    setJobErrors(0);
    setJobCurrent(null);

    try {
      const res = await fetch("/api/admin/start-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUserId,
          contacts: buildContactPayload(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setJobId(data.jobId);
      setJobTotal(data.total ?? selectedContacts.length);
      setSessionState("running");
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to start");
      setSessionState("error");
    }
  }

  function triggerDownload() {
    const queue = buildContactPayload();
    const blob = new Blob([JSON.stringify(queue, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis-queue.json";
    a.click();
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_RUN_KEY, now);
    setLastRun(now);
  }

  function handleCopyPrompt() {
    const contactList = selectedContacts
      .map((c) => {
        const handle = c.username.replace(/^@/, "");
        const bio = c.bio?.trim() ? `\n   Bio: ${c.bio.trim().slice(0, 200)}` : "";
        return `- @${handle} (record_id: ${c.id})${bio}`;
      })
      .join("\n");

    const prompt = `I need you to analyze Instagram profiles for BeatBridge.

For each username in this list, visit their Instagram profile, take a screenshot, and analyze:
1. What type of profile is this? (Beatmaker/Producteur, Artiste/Rappeur, Manager, Ingé son, Label, DJ, Photographe/Vidéaste, or Autre)
2. Write a personalized 1-2 sentence DM template that references something specific from their profile.
   Start with "Hey [name], I'm [BEATMAKER_NAME],"
   End with one of: "think we could build something?" / "would love to connect." / "open to hear your thoughts."
   Never include a link or URL.
3. Write a 1-line analysis note explaining your classification.

After analyzing ALL profiles, call this API to save results:
POST https://beatbridge.live/api/admin/save-analysis
Headers: Content-Type: application/json
Body:
{
  "adminSecret": "beatbridge-analyzer-2026",
  "results": [
    {
      "record_id": "recXXX (use the record_id from the list below)",
      "username": "@handle",
      "profile_type": "...",
      "template": "Hey [name], I'm [BEATMAKER_NAME]...",
      "analysis_note": "..."
    }
  ]
}

Contacts to analyze (${selectedContacts.length} total):
${contactList}`;

    navigator.clipboard.writeText(prompt).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 3000);
    });
  }

  function closeOverlay() {
    stopPolling();
    setSessionState("idle");
    setJobId(null);
  }

  if (!isLoaded || user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  const selectCls =
    "bg-[#111] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors";

  const pct =
    jobTotal > 0 ? Math.round((jobProgress / jobTotal) * 100) : 0;

  const isOverlayVisible = sessionState !== "idle";

  return (
    <div className="min-h-screen bg-[#080808]">

      {/* ── Progress overlay ──────────────────────────────────────────────── */}
      {isOverlayVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}>
          <div
            className="bg-[#111] border border-white/[0.12] rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                {sessionState === "done" ? (
                  <span className="text-xl">✅</span>
                ) : sessionState === "error" ? (
                  <span className="text-xl">❌</span>
                ) : (
                  <span className="text-xl animate-pulse">🔍</span>
                )}
                <h2 className="text-base font-semibold text-white">
                  {sessionState === "starting" && "Starting session…"}
                  {sessionState === "running" && "Analysis Session Running"}
                  {sessionState === "done" && "Session Complete"}
                  {sessionState === "error" && "Session Error"}
                </h2>
              </div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Error state */}
              {sessionState === "error" && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {sessionError}
                </p>
              )}

              {/* Starting spinner */}
              {sessionState === "starting" && (
                <p className="text-sm text-[#a0a0a0]">Connecting to analyzer service…</p>
              )}

              {/* Running / done */}
              {(sessionState === "running" || sessionState === "done") && (
                <>
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#a0a0a0]">
                        {sessionState === "done" ? "Finished" : "Analyzing…"}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {jobProgress} / {jobTotal}
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#f97316] to-[#f85c00] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Currently analyzing */}
                  {sessionState === "running" && jobCurrent && (
                    <p className="text-xs text-[#606060] font-mono truncate">
                      Currently: {jobCurrent}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">
                      ✅ {jobCompleted} updated
                    </span>
                    {jobSkipped > 0 && (
                      <span className="text-amber-400">
                        ⏭ {jobSkipped} skipped
                      </span>
                    )}
                    {jobErrors > 0 && (
                      <span className="text-red-400">
                        ⚠️ {jobErrors} errors
                      </span>
                    )}
                  </div>

                  {/* Done summary */}
                  {sessionState === "done" && (
                    <p className="text-sm text-[#606060]">
                      {jobCompleted} profile{jobCompleted !== 1 ? "s" : ""} analyzed
                      {jobCompleted > 0 ? " and saved to Airtable." : "."}
                      {jobSkipped > 0 ? ` ${jobSkipped} skipped.` : ""}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={closeOverlay}
                className={`w-full text-sm font-semibold py-2.5 rounded-lg transition-all min-h-[44px] ${
                  sessionState === "done"
                    ? "bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90"
                    : "border border-white/[0.12] text-[#a0a0a0] hover:text-white hover:border-white/[0.2]"
                }`}
              >
                {sessionState === "done" ? "Done" : "Close"}
              </button>
              {sessionState === "running" && (
                <p className="text-center text-xs text-[#404040] mt-2">
                  Closing doesn't stop the server — analysis continues in background
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[rgba(8,8,8,0.95)] sticky top-14 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-[#606060] hover:text-white text-sm transition-colors">
              ← Admin
            </Link>
            <span className="text-[#303030]">/</span>
            <span className="text-sm font-bold text-white tracking-wide">
              Analysis Session <span className="text-orange-500">🔍</span>
            </span>
          </div>
          <span className="text-xs text-[#505050]">mishock66@gmail.com</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* analyzed field missing notice */}
        {!loading && !analyzedFieldExists && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>
              The <code className="bg-white/[0.08] px-1 rounded text-xs">analyzed</code> field
              doesn&apos;t exist in Airtable yet. All contacts are treated as not-yet-analyzed.
              It will be created automatically after the first run.
            </span>
          </div>
        )}

        {/* ── SECTION 1 — Build your queue ───────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">Build your queue</h2>
          <p className="text-sm text-[#606060] mb-6">
            Select which contacts to include in the next analysis session.
          </p>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">Artist</label>
                <select value={filterArtist} onChange={(e) => setFilterArtist(e.target.value)} className={selectCls}>
                  <option value="">All artists</option>
                  {ARTISTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">Profile type</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectCls}>
                  <option value="">All types</option>
                  {PROFILE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">Bio</label>
                <select value={filterBio} onChange={(e) => setFilterBio(e.target.value as typeof filterBio)} className={selectCls}>
                  <option value="all">All</option>
                  <option value="has-bio">Has bio</option>
                  <option value="no-bio">No bio</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">Analysis status</label>
                <select value={filterAnalyzed} onChange={(e) => setFilterAnalyzed(e.target.value as typeof filterAnalyzed)} className={selectCls}>
                  <option value="not-analyzed">Not yet analyzed</option>
                  <option value="analyzed">Already analyzed</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {/* Max contacts */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em] whitespace-nowrap">
                Max contacts
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxContacts}
                onChange={(e) => setMaxContacts(Math.min(50, Math.max(1, Number(e.target.value))))}
                className="w-24 bg-[#111] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              <span className="text-xs text-[#505050]">max 50 per session</span>
            </div>

            {/* Count + Start button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1 border-t border-white/[0.06]">
              {loading ? (
                <p className="text-sm text-[#505050]">Loading contacts…</p>
              ) : (
                <p className="text-sm">
                  <span className="text-white font-semibold text-lg">{selectedContacts.length}</span>
                  <span className="text-[#a0a0a0] ml-2">contacts selected for analysis</span>
                  {contacts.length > 0 && (
                    <span className="text-[#505050] ml-2 text-xs">(from {contacts.length} total)</span>
                  )}
                </p>
              )}

              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleStartSession}
                  disabled={selectedContacts.length === 0 || loading || sessionState !== "idle"}
                  className="flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 min-h-[44px] whitespace-nowrap"
                >
                  <span>▶</span>
                  Start Analysis Session
                  {selectedContacts.length > 0 && (
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {selectedContacts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 1b — Claude in Chrome Mode ─────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">Claude in Chrome Mode</h2>
          <p className="text-sm text-[#606060] mb-6">
            Paste a generated prompt into Claude in your Chrome browser — Claude visits each profile visually and saves results back to Airtable automatically.
          </p>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5">
            {/* How it works */}
            <ol className="flex flex-col gap-3">
              {[
                "Use the queue builder above to select contacts",
                "Click \"📋 Copy prompt for Claude in Chrome\" below",
                "Open Claude in Chrome and paste the prompt",
                "Claude visits each Instagram profile, analyzes with vision, and calls the save API",
                "Results are saved to Airtable automatically — refresh this page to see them",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#a0a0a0]">{step}</span>
                </li>
              ))}
            </ol>

            {/* API endpoint info */}
            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl px-4 py-3 text-xs font-mono text-[#606060]">
              <p className="text-[#404040] mb-1">Save endpoint (Claude calls this automatically):</p>
              <p className="text-blue-400">POST https://beatbridge.live/api/admin/save-analysis</p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-white/[0.06]">
              <div className="relative">
                <button
                  onClick={handleCopyPrompt}
                  disabled={selectedContacts.length === 0 || loading}
                  className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] whitespace-nowrap"
                >
                  <span>📋</span>
                  Copy prompt for Claude in Chrome
                  {selectedContacts.length > 0 && (
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {selectedContacts.length}
                    </span>
                  )}
                </button>
                {copyToast && (
                  <div className="absolute left-0 -bottom-9 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    ✅ Copied! Paste it into Claude in Chrome
                  </div>
                )}
              </div>
              {selectedContacts.length > 0 && (
                <button
                  onClick={triggerDownload}
                  className="text-xs text-[#505050] hover:text-orange-400 transition-colors"
                >
                  ⬇️ Download queue JSON
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION 2 — Instructions ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">How it works</h2>
          <p className="text-sm text-[#606060] mb-6">
            The analyzer runs on a remote server — no local setup needed.
          </p>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
            <ol className="flex flex-col gap-4">
              {[
                { n: 1, text: "Select your filters and click \"▶ Start Analysis Session\"", note: null },
                { n: 2, text: "The server visits each Instagram profile automatically", note: "Headless Chrome runs on the Railway backend — nothing to install locally" },
                { n: 3, text: "Each profile is analyzed by Claude Haiku", note: "Generates: profile type classification + personalized DM template" },
                { n: 4, text: "Results are saved to Airtable automatically", note: "Fields updated: Type de profil, template, Notes (bio appended), analyzed ✓" },
                { n: 5, text: "Track progress in real time — results appear in the overlay", note: "Refresh this page after the session to see updated stats" },
              ].map(({ n, text, note }) => (
                <li key={n} className="flex gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm text-white">{text}</p>
                    {note && (
                      <p className="text-xs font-mono text-[#606060] mt-1 bg-white/[0.04] px-2 py-1 rounded-md inline-block">
                        {note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                <span>⚠️</span>
                Max 50 profiles per session
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                <span>ℹ️</span>
                Closing the overlay doesn&apos;t stop analysis — it continues on the server
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3 — Results tracker ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">Results tracker</h2>
          <p className="text-sm text-[#606060] mb-6">Live stats from Airtable.</p>

          {loading ? (
            <p className="text-sm text-[#505050]">Loading stats…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-[#606060] uppercase tracking-[0.1em] mb-1">Total analyzed</p>
                <p className="text-3xl font-black text-orange-500">{totalAnalyzed.toLocaleString()}</p>
                <p className="text-xs text-[#505050] mt-1">Contacts with analyzed = ✓</p>
              </div>

              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-[#606060] uppercase tracking-[0.1em] mb-1">Awaiting analysis</p>
                <p className="text-3xl font-black text-white">{totalPending.toLocaleString()}</p>
                <p className="text-xs text-[#505050] mt-1">Not yet analyzed</p>
              </div>

              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-[#606060] uppercase tracking-[0.1em] mb-1">Last session started</p>
                <p className="text-lg font-semibold text-white leading-tight mt-1">{formatDate(lastRun)}</p>
                <p className="text-xs text-[#505050] mt-1">From this browser</p>
              </div>
            </div>
          )}

          {/* Breakdown by artist */}
          {!loading && contacts.length > 0 && (
            <div className="mt-4 bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
              <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em] mb-4">
                Breakdown by artist
              </p>
              <div className="flex flex-col gap-3">
                {ARTISTS.map((artist) => {
                  const artistContacts = contacts.filter(
                    (c) => c.suiviPar === artist || (artist === "Curren$y" && c.suiviPar === "CurrenSy")
                  );
                  const analyzed = artistContacts.filter((c) => c.analyzed).length;
                  const total = artistContacts.length;
                  const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0;
                  return (
                    <div key={artist} className="flex items-center gap-3">
                      <span className="text-sm text-[#a0a0a0] w-28 truncate">{artist}</span>
                      <div className="flex-1 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#606060] w-24 text-right">
                        {analyzed}/{total} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION 4 — Analyzed Contacts ───────────────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
            <div>
              <h2 className="text-xl font-light tracking-[0.02em]">✅ Analyzed Contacts</h2>
              <p className="text-sm text-[#606060] mt-1">
                {loading ? "Loading…" : `${totalAnalyzed.toLocaleString()} contacts analyzed`}
              </p>
            </div>
            <select
              value={analyzedFilterArtist}
              onChange={(e) => setAnalyzedFilterArtist(e.target.value)}
              className={selectCls + " sm:w-44"}
            >
              <option value="">All artists</option>
              {ARTISTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-[#505050] mt-4">Loading contacts…</p>
          ) : analyzedContacts.length === 0 ? (
            <div className="mt-4 bg-white/[0.025] border border-white/[0.08] rounded-2xl px-6 py-10 text-center">
              <p className="text-[#505050] text-sm">No contacts analyzed yet. Run a session to get started.</p>
            </div>
          ) : (
            <div className="mt-4 bg-white/[0.025] border border-white/[0.08] rounded-2xl overflow-hidden">
              {analyzedContacts.map((c, idx) => {
                const isExpanded = expandedIds.has(c.id);
                const handle = c.username.replace(/^@/, "");
                const artist = c.suiviPar === "CurrenSy" ? "Curren$y" : c.suiviPar || "—";

                // Parse analysis note from the Notes field (appended as "— Analysis: ...")
                const analysisMatch = c.bio.match(/—\s*Analysis:\s*(.+)$/m);
                const analysisNote = analysisMatch ? analysisMatch[1].trim() : null;

                return (
                  <div
                    key={c.id}
                    className={idx < analyzedContacts.length - 1 ? "border-b border-white/[0.05]" : ""}
                  >
                    {/* ── Summary row (clickable) ── */}
                    <button
                      onClick={() => toggleExpanded(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                    >
                      {/* Chevron */}
                      <span className={`flex-shrink-0 text-[#404040] text-xs transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                        ▶
                      </span>

                      {/* Username */}
                      <span className="text-sm font-mono text-orange-400 w-36 truncate flex-shrink-0">
                        @{handle}
                      </span>

                      {/* Artist */}
                      <span className="text-xs text-[#606060] w-24 truncate flex-shrink-0">
                        {artist}
                      </span>

                      {/* Profile type */}
                      <span className="text-xs text-[#a0a0a0] flex-1 truncate text-left">
                        {c.profileType || "—"}
                      </span>

                      {/* Template badge */}
                      {c.template ? (
                        <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                          has template
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-xs text-[#404040]">no template</span>
                      )}
                    </button>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <div className="px-4 pb-5 pt-1 bg-black/20 flex flex-col gap-4 border-t border-white/[0.04]">

                        {/* DM Template */}
                        <div>
                          <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em] mb-2">
                            DM Template
                          </p>
                          {c.template ? (
                            <div className="bg-[#0d0d0d] border border-white/[0.08] rounded-xl px-4 py-3">
                              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{c.template}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-[#404040] italic">No template generated.</p>
                          )}
                        </div>

                        {/* Analysis note */}
                        {analysisNote && (
                          <div>
                            <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em] mb-2">
                              Analysis Note
                            </p>
                            <p className="text-sm text-[#a0a0a0] leading-relaxed">{analysisNote}</p>
                          </div>
                        )}

                        {/* Meta row — profile type + followers + Instagram link */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <p className="text-xs text-[#505050] mb-0.5">Profile type</p>
                            <p className="text-sm text-white">{c.profileType || "—"}</p>
                          </div>
                          {c.followers > 0 && (
                            <div>
                              <p className="text-xs text-[#505050] mb-0.5">Followers</p>
                              <p className="text-sm text-white">{c.followers.toLocaleString()}</p>
                            </div>
                          )}
                          <a
                            href={`https://www.instagram.com/${handle}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto text-xs text-[#505050] hover:text-orange-400 transition-colors"
                          >
                            View on Instagram ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
