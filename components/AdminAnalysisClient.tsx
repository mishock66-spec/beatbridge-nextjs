"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AnalysisContact } from "@/app/api/admin/analysis-contacts/route";

const ADMIN_EMAIL = "mishock66@gmail.com";

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
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Filters
  const [filterArtist, setFilterArtist] = useState("");
  const [filterType, setFilterType] = useState("Autre");
  const [filterBio, setFilterBio] = useState<"all" | "has-bio" | "no-bio">("all");
  const [filterAnalyzed, setFilterAnalyzed] = useState<"all" | "analyzed" | "not-analyzed">("not-analyzed");
  const [maxContacts, setMaxContacts] = useState(50);

  // Admin guard
  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    if (email !== ADMIN_EMAIL) router.replace("/dashboard");
  }, [isLoaded, user, router]);

  // Load last run timestamp from localStorage
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adminUserId]);

  // Filtered + limited contacts for queue
  const selectedContacts = useMemo(() => {
    let result = contacts;

    if (filterArtist) {
      // Handle CurrenSy/Curren$y variants
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

  function downloadQueue() {
    const queue = selectedContacts.map((c) => ({
      username: c.username.replace(/^@/, ""),
      record_id: c.id,
      artist: c.suiviPar === "CurrenSy" ? "Curren$y" : c.suiviPar,
      current_type: c.profileType,
      current_template: c.template,
      bio: c.bio,
    }));

    const blob = new Blob([JSON.stringify(queue, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis-queue.json";
    a.click();
    URL.revokeObjectURL(url);

    // Record last run timestamp
    const now = new Date().toISOString();
    localStorage.setItem(LAST_RUN_KEY, now);
    setLastRun(now);
  }

  if (!isLoaded || user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  const selectCls =
    "bg-[#111] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors";

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[rgba(8,8,8,0.95)] sticky top-14 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-[#606060] hover:text-white text-sm transition-colors"
            >
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

        {/* ── SECTION 1 — Build your queue ─────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">Build your queue</h2>
          <p className="text-sm text-[#606060] mb-6">
            Select which contacts to include in the next analysis session.
          </p>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filter: Artist */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">
                  Artist
                </label>
                <select
                  value={filterArtist}
                  onChange={(e) => setFilterArtist(e.target.value)}
                  className={selectCls}
                >
                  <option value="">All artists</option>
                  {ARTISTS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Filter: Profile type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">
                  Profile type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={selectCls}
                >
                  <option value="">All types</option>
                  {PROFILE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Filter: Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">
                  Bio
                </label>
                <select
                  value={filterBio}
                  onChange={(e) => setFilterBio(e.target.value as typeof filterBio)}
                  className={selectCls}
                >
                  <option value="all">All</option>
                  <option value="has-bio">Has bio</option>
                  <option value="no-bio">No bio</option>
                </select>
              </div>

              {/* Filter: Analyzed */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">
                  Analysis status
                </label>
                <select
                  value={filterAnalyzed}
                  onChange={(e) => setFilterAnalyzed(e.target.value as typeof filterAnalyzed)}
                  className={selectCls}
                >
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

            {/* Preview count */}
            <div className="flex items-center gap-3 pt-1 border-t border-white/[0.06]">
              {loading ? (
                <p className="text-sm text-[#505050]">Loading contacts…</p>
              ) : (
                <p className="text-sm">
                  <span className="text-white font-semibold text-lg">{selectedContacts.length}</span>
                  <span className="text-[#a0a0a0] ml-2">contacts selected for analysis</span>
                  {contacts.length > 0 && (
                    <span className="text-[#505050] ml-2 text-xs">
                      (from {contacts.length} total)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION 2 — Generate queue file ──────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">Generate queue file</h2>
          <p className="text-sm text-[#606060] mb-6">
            Download the queue file, then run the analyzer script locally.
          </p>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={downloadQueue}
                disabled={selectedContacts.length === 0 || loading}
                className="flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                <span>⬇️</span>
                Download analysis-queue.json
                {selectedContacts.length > 0 && (
                  <span className="ml-1 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {selectedContacts.length}
                  </span>
                )}
              </button>

              {selectedContacts.length === 0 && !loading && (
                <p className="text-xs text-[#606060]">
                  No contacts match your current filters.
                </p>
              )}
            </div>

            {/* Queue preview */}
            {selectedContacts.length > 0 && (
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.08em] mb-3">
                  Preview — first 5 contacts
                </p>
                <div className="flex flex-col gap-2">
                  {selectedContacts.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="font-mono text-orange-400 w-32 truncate">
                        @{c.username.replace(/^@/, "")}
                      </span>
                      <span className="text-[#606060]">{c.suiviPar || "—"}</span>
                      <span className="text-[#505050] text-xs px-2 py-0.5 bg-white/[0.04] rounded-full">
                        {c.profileType}
                      </span>
                      {c.bio && (
                        <span className="text-[#404040] text-xs truncate max-w-[200px]">
                          {c.bio.slice(0, 60)}{c.bio.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </div>
                  ))}
                  {selectedContacts.length > 5 && (
                    <p className="text-xs text-[#505050]">
                      + {selectedContacts.length - 5} more in the downloaded file
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 3 — Instructions ─────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">How to run an Analysis Session</h2>
          <p className="text-sm text-[#606060] mb-6">
            Follow these steps after downloading the queue file.
          </p>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
            <ol className="flex flex-col gap-4">
              {[
                {
                  n: 1,
                  text: "Select your filters above and download the queue file",
                  note: null,
                },
                {
                  n: 2,
                  text: "Move the file to the scripts folder",
                  note: "C:\\Users\\crayx\\beatbridge-nextjs\\scripts\\analysis-queue.json",
                },
                {
                  n: 3,
                  text: "Close Chrome completely",
                  note: "Chrome must be fully closed — it locks its profile directory",
                },
                {
                  n: 4,
                  text: "Open Claude Code terminal and run the script",
                  note: "node scripts/instagram-analyzer.js",
                },
                {
                  n: 5,
                  text: "Chrome will open automatically and start analyzing profiles",
                  note: "Random delays between profiles — do not close Chrome while running",
                },
                {
                  n: 6,
                  text: "Results are saved to Airtable automatically",
                  note: "Fields updated: Type de profil, template, Notes (bio appended), analyzed ✓",
                },
                {
                  n: 7,
                  text: "Check back here to see updated templates and profile types",
                  note: "Refresh this page to see the updated analyzed count",
                },
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
                Max 50 profiles per session — script stops automatically
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                <span>ℹ️</span>
                If interrupted, run again — already-analyzed profiles are skipped
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4 — Results tracker ──────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-light tracking-[0.02em] mb-1">Results tracker</h2>
          <p className="text-sm text-[#606060] mb-6">
            Live stats from Airtable.
          </p>

          {loading ? (
            <p className="text-sm text-[#505050]">Loading stats…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-[#606060] uppercase tracking-[0.1em] mb-1">
                  Total analyzed
                </p>
                <p className="text-3xl font-black text-orange-500">{totalAnalyzed.toLocaleString()}</p>
                <p className="text-xs text-[#505050] mt-1">Contacts with analyzed = ✓</p>
              </div>

              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-[#606060] uppercase tracking-[0.1em] mb-1">
                  Awaiting analysis
                </p>
                <p className="text-3xl font-black text-white">{totalPending.toLocaleString()}</p>
                <p className="text-xs text-[#505050] mt-1">Not yet analyzed</p>
              </div>

              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-[#606060] uppercase tracking-[0.1em] mb-1">
                  Last queue downloaded
                </p>
                <p className="text-lg font-semibold text-white leading-tight mt-1">
                  {formatDate(lastRun)}
                </p>
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
                    (c) =>
                      c.suiviPar === artist ||
                      (artist === "Curren$y" && c.suiviPar === "CurrenSy")
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

      </div>
    </div>
  );
}
