"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerConfig = {
  active: boolean;
  artistName: string;
  slug: string;
  connectionCount: number;
  droppedAt: string;
};

type VoteCandidate = {
  slug: string;
  name: string;
  instagram: string;
};

type SiteTexts = {
  landing_headline: string;
  landing_subtitle: string;
  artists_subtitle: string;
  pricing_tagline: string;
};

type ArtistConfig = {
  slug: string;
  name: string;
  description: string;
  instagram: string;
  twitter: string;
  visible: boolean;
  contactCount?: number;
};

type Stats = {
  totalUsers: number;
  trialUsers: number;
  paidUsers: number;
  dmsSentToday: number;
  dmsSentTotal: number;
};

type Section = "banner" | "artists" | "vote" | "texts" | "stats";

const DEFAULT_ARTISTS: ArtistConfig[] = [
  { slug: "currensy",    name: "Curren$y",    description: "New Orleans legend and founder of Jet Life. Known for his prolific output and tight-knit producer network.", instagram: "https://www.instagram.com/spitta_andretti/",  twitter: "https://x.com/CurrenSy_Spitta",    visible: true },
  { slug: "harry-fraud", name: "Harry Fraud", description: "New York's sonic architect — cinematic boom-bap, dark jazz, grimy street rap.",                            instagram: "https://www.instagram.com/harryfraud/",        twitter: "https://x.com/HarryFraud",          visible: true },
  { slug: "wheezy",      name: "Wheezy",      description: "Atlanta's most in-demand producer. Behind Future, Gunna, Young Thug, Lil Baby's biggest records.",          instagram: "https://www.instagram.com/wheezy/",            twitter: "https://x.com/wheezy0uttahere",     visible: true },
  { slug: "juke-wong",   name: "Juke Wong",   description: "Rising producer known for melodic trap beats.",                                                              instagram: "https://www.instagram.com/jukewong/",          twitter: "https://x.com/jukewong",            visible: true },
  { slug: "southside",   name: "Southside",   description: "808 Mafia co-founder. Behind Travis Scott, Gucci Mane, Young Thug, Future, Migos — trap's sonic architect.",instagram: "https://www.instagram.com/808mafiaboss/",      twitter: "https://x.com/808mafiaboss",        visible: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
      <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-1">{label}</p>
      <p className="text-3xl font-black text-orange-500">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-[#505050] mt-1">{sub}</p>}
    </div>
  );
}

function SaveButton({ onClick, saving, label = "Save changes" }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#606060] uppercase tracking-[0.1em]">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors";
const textareaCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors resize-y";

// ─── Main component ───────────────────────────────────────────────────────────

const ADMIN_EMAIL = "mishock66@gmail.com";

export default function AdminClient({
  initialBanner,
  initialVoteCandidates,
  initialSiteTexts,
}: {
  initialBanner: BannerConfig | null;
  initialVoteCandidates: VoteCandidate[];
  initialSiteTexts: Partial<SiteTexts>;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [section, setSection] = useState<Section>("stats");

  // ── Client-side admin guard ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    if (email !== ADMIN_EMAIL) {
      router.replace("/dashboard");
    }
  }, [isLoaded, user, router]);

  const adminUserId = user?.id ?? "";

  // ── Banner ────────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState<BannerConfig>(
    initialBanner ?? {
      active: true,
      artistName: "Southside",
      slug: "southside",
      connectionCount: 1048,
      droppedAt: "2026-04-06T00:00:00Z",
    }
  );
  const [savingBanner, setSavingBanner] = useState(false);

  // ── Artists ───────────────────────────────────────────────────────────────
  const [artists, setArtists] = useState<ArtistConfig[]>(DEFAULT_ARTISTS);
  const [savingArtist, setSavingArtist] = useState<string | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // ── Vote ──────────────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState<VoteCandidate[]>(
    initialVoteCandidates.length > 0 ? initialVoteCandidates : []
  );
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [savingVote, setSavingVote] = useState(false);
  const [resettingVotes, setResettingVotes] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ slug: "", name: "", instagram: "" });

  // ── Texts ─────────────────────────────────────────────────────────────────
  const [texts, setTexts] = useState<SiteTexts>({
    landing_headline: initialSiteTexts.landing_headline ?? "Send DMs to the right people.",
    landing_subtitle: initialSiteTexts.landing_subtitle ?? "BeatBridge maps every producer, engineer, and manager in your favourite artist network.",
    artists_subtitle: initialSiteTexts.artists_subtitle ?? "Pick an artist network to explore.",
    pricing_tagline: initialSiteTexts.pricing_tagline ?? "Get access to every network.",
  });
  const [savingTexts, setSavingTexts] = useState(false);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ── Fetch vote counts ──────────────────────────────────────────────────────
  const fetchVoteCounts = useCallback(async () => {
    const res = await fetch("/api/vote/counts").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => null);
    if (data) setVoteCounts(data);
  }, []);

  useEffect(() => {
    if (section === "vote") fetchVoteCounts();
  }, [section, fetchVoteCounts]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    const res = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: adminUserId }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setStats(data);
    }
    setLoadingStats(false);
  }, [adminUserId]);

  useEffect(() => {
    if (section === "stats") fetchStats();
  }, [section, fetchStats]);

  // ── Fetch Airtable contact counts ──────────────────────────────────────────
  const fetchContactCounts = useCallback(async () => {
    setLoadingCounts(true);
    const slugMap: Record<string, string | string[]> = {
      "currensy":    ["Curren$y", "CurrenSy"],
      "harry-fraud": "Harry Fraud",
      "wheezy":      "Wheezy",
      "juke-wong":   "Juke Wong",
      "southside":   "Southside",
    };
    const results = await Promise.all(
      DEFAULT_ARTISTS.map(async (a) => {
        const params = Array.isArray(slugMap[a.slug])
          ? (slugMap[a.slug] as string[]).map((v) => `suiviPar=${encodeURIComponent(v)}`).join("&")
          : `suiviPar=${encodeURIComponent(slugMap[a.slug] as string)}`;
        const res = await fetch(`/api/airtable-count?${params}`).catch(() => null);
        const data = res?.ok ? await res.json().catch(() => null) : null;
        return { slug: a.slug, count: data?.count ?? null };
      })
    );
    setArtists((prev) =>
      prev.map((a) => {
        const found = results.find((r) => r.slug === a.slug);
        return found ? { ...a, contactCount: found.count ?? undefined } : a;
      })
    );
    setLoadingCounts(false);
  }, []);

  useEffect(() => {
    if (section === "artists") fetchContactCounts();
  }, [section, fetchContactCounts]);

  // ── Save helpers ───────────────────────────────────────────────────────────
  async function saveConfig(key: string, value: unknown) {
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: adminUserId, key, value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Save failed");
    }
  }

  async function handleSaveBanner() {
    setSavingBanner(true);
    try {
      await saveConfig("banner", banner);
      toast.success("Banner saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBanner(false);
    }
  }

  async function handleSaveArtist(a: ArtistConfig) {
    setSavingArtist(a.slug);
    try {
      await saveConfig(`artist_${a.slug}`, a);
      toast.success(`${a.name} saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingArtist(null);
    }
  }

  async function handleSaveCandidates() {
    setSavingVote(true);
    try {
      await saveConfig("vote_candidates", candidates);
      toast.success("Candidates saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingVote(false);
    }
  }

  async function handleResetVotes() {
    if (!confirm("Reset ALL votes to zero? This cannot be undone.")) return;
    setResettingVotes(true);
    try {
      const res = await fetch("/api/admin/votes/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setVoteCounts({});
      toast.success("All votes reset to 0");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResettingVotes(false);
    }
  }

  async function handleSaveTexts() {
    setSavingTexts(true);
    try {
      await saveConfig("site_texts", texts);
      toast.success("Texts saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingTexts(false);
    }
  }

  function addCandidate() {
    if (!newCandidate.slug || !newCandidate.name) return;
    setCandidates((prev) => [...prev, { ...newCandidate }]);
    setNewCandidate({ slug: "", name: "", instagram: "" });
  }

  function removeCandidate(slug: string) {
    setCandidates((prev) => prev.filter((c) => c.slug !== slug));
  }

  // ── Nav items ──────────────────────────────────────────────────────────────
  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "stats",   label: "Stats",   icon: "📊" },
    { id: "banner",  label: "Banner",  icon: "📢" },
    { id: "artists", label: "Artists", icon: "🎤" },
    { id: "vote",    label: "Vote",    icon: "🗳️"  },
    { id: "texts",   label: "Texts",   icon: "✏️"  },
  ];

  // Show nothing while Clerk initialises or if not admin
  if (!isLoaded || user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[rgba(8,8,8,0.95)] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-sm font-bold text-white tracking-wide">
            BeatBridge Admin <span className="text-orange-500">⚡</span>
          </span>
          <span className="text-xs text-[#505050]">mishock66@gmail.com</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <nav className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 text-left w-full ${
                  section === item.id
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                    : "text-[#a0a0a0] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── STATS ─────────────────────────────────────────────────────── */}
          {section === "stats" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-light tracking-[0.02em]">Stats</h2>
                <button
                  onClick={fetchStats}
                  disabled={loadingStats}
                  className="text-xs text-[#505050] hover:text-orange-400 transition-colors"
                >
                  {loadingStats ? "Loading…" : "↺ Refresh"}
                </button>
              </div>
              {loadingStats && !stats ? (
                <p className="text-[#505050] text-sm">Loading stats…</p>
              ) : stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <StatCard label="Total users"          value={stats.totalUsers}    />
                  <StatCard label="In trial"             value={stats.trialUsers}    sub="Active 14-day trial" />
                  <StatCard label="Paid subscribers"     value={stats.paidUsers}     sub="Pro / Premium / Lifetime" />
                  <StatCard label="DMs sent today"       value={stats.dmsSentToday}  />
                  <StatCard label="DMs sent (all time)"  value={stats.dmsSentTotal}  />
                </div>
              ) : (
                <p className="text-[#505050] text-sm">Click Refresh to load.</p>
              )}
            </div>
          )}

          {/* ── BANNER ────────────────────────────────────────────────────── */}
          {section === "banner" && (
            <div>
              <h2 className="text-xl font-light tracking-[0.02em] mb-6">Announcement Banner</h2>
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5">
                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Banner active</p>
                    <p className="text-xs text-[#505050] mt-0.5">Shows the "New network unlocked" bar at the top of the site</p>
                  </div>
                  <button
                    onClick={() => setBanner((b) => ({ ...b, active: !b.active }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${banner.active ? "bg-orange-500" : "bg-white/[0.1]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${banner.active ? "translate-x-5" : ""}`} />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Artist Name">
                    <input className={inputCls} value={banner.artistName} onChange={(e) => setBanner((b) => ({ ...b, artistName: e.target.value }))} placeholder="Southside" />
                  </Field>
                  <Field label="Artist Slug">
                    <input className={inputCls} value={banner.slug} onChange={(e) => setBanner((b) => ({ ...b, slug: e.target.value }))} placeholder="southside" />
                  </Field>
                  <Field label="Connection Count">
                    <input className={inputCls} type="number" value={banner.connectionCount} onChange={(e) => setBanner((b) => ({ ...b, connectionCount: parseInt(e.target.value) || 0 }))} />
                  </Field>
                  <Field label="Drop Date (ISO)">
                    <input className={inputCls} value={banner.droppedAt} onChange={(e) => setBanner((b) => ({ ...b, droppedAt: e.target.value }))} placeholder="2026-04-06T00:00:00Z" />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <SaveButton onClick={handleSaveBanner} saving={savingBanner} />
                </div>

                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-xs text-[#505050]">
                    Changes take effect on next page load. The banner respects a 48-hour window from droppedAt and per-user localStorage dismiss.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── ARTISTS ───────────────────────────────────────────────────── */}
          {section === "artists" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-light tracking-[0.02em]">Artist Management</h2>
                {loadingCounts && <span className="text-xs text-[#505050]">Loading counts…</span>}
              </div>
              <div className="flex flex-col gap-5">
                {artists.map((a) => (
                  <div key={a.slug} className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{a.name}</p>
                          {a.contactCount !== undefined && (
                            <p className="text-xs text-orange-400 mt-0.5">{a.contactCount.toLocaleString()} contacts in Airtable</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#606060]">Visible</span>
                          <button
                            onClick={() => setArtists((prev) => prev.map((x) => x.slug === a.slug ? { ...x, visible: !x.visible } : x))}
                            className={`relative w-9 h-5 rounded-full transition-colors ${a.visible ? "bg-orange-500" : "bg-white/[0.1]"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${a.visible ? "translate-x-4" : ""}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Field label="Description">
                        <textarea
                          className={textareaCls}
                          rows={2}
                          value={a.description}
                          onChange={(e) => setArtists((prev) => prev.map((x) => x.slug === a.slug ? { ...x, description: e.target.value } : x))}
                        />
                      </Field>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Instagram URL">
                          <input className={inputCls} value={a.instagram} onChange={(e) => setArtists((prev) => prev.map((x) => x.slug === a.slug ? { ...x, instagram: e.target.value } : x))} />
                        </Field>
                        <Field label="Twitter/X URL">
                          <input className={inputCls} value={a.twitter} onChange={(e) => setArtists((prev) => prev.map((x) => x.slug === a.slug ? { ...x, twitter: e.target.value } : x))} />
                        </Field>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <SaveButton onClick={() => handleSaveArtist(a)} saving={savingArtist === a.slug} label={`Save ${a.name}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VOTE ──────────────────────────────────────────────────────── */}
          {section === "vote" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-light tracking-[0.02em]">Vote Page Candidates</h2>
                <button
                  onClick={handleResetVotes}
                  disabled={resettingVotes}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {resettingVotes ? "Resetting…" : "Reset all votes"}
                </button>
              </div>

              {/* Current candidates */}
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 mb-5">
                <h3 className="text-sm font-semibold text-white mb-4">Candidates</h3>
                <div className="flex flex-col gap-3">
                  {candidates.map((c) => (
                    <div key={c.slug} className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        <p className="text-xs text-[#505050]">/{c.slug} · @{c.instagram} · <span className="text-orange-400">{voteCounts[c.slug] ?? 0} votes</span></p>
                      </div>
                      <button
                        onClick={() => removeCandidate(c.slug)}
                        className="text-[#505050] hover:text-red-400 transition-colors text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {candidates.length === 0 && (
                    <p className="text-[#505050] text-sm text-center py-4">No candidates yet.</p>
                  )}
                </div>
              </div>

              {/* Add new candidate */}
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 mb-5">
                <h3 className="text-sm font-semibold text-white mb-4">Add Candidate</h3>
                <div className="grid sm:grid-cols-3 gap-3 mb-3">
                  <Field label="Slug">
                    <input className={inputCls} placeholder="metro-boomin" value={newCandidate.slug} onChange={(e) => setNewCandidate((n) => ({ ...n, slug: e.target.value }))} />
                  </Field>
                  <Field label="Name">
                    <input className={inputCls} placeholder="Metro Boomin" value={newCandidate.name} onChange={(e) => setNewCandidate((n) => ({ ...n, name: e.target.value }))} />
                  </Field>
                  <Field label="Instagram handle">
                    <input className={inputCls} placeholder="metroboomin" value={newCandidate.instagram} onChange={(e) => setNewCandidate((n) => ({ ...n, instagram: e.target.value }))} />
                  </Field>
                </div>
                <button
                  onClick={addCandidate}
                  disabled={!newCandidate.slug || !newCandidate.name}
                  className="text-sm font-medium text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                >
                  + Add
                </button>
              </div>

              <div className="flex justify-end">
                <SaveButton onClick={handleSaveCandidates} saving={savingVote} label="Save candidates" />
              </div>
            </div>
          )}

          {/* ── TEXTS ─────────────────────────────────────────────────────── */}
          {section === "texts" && (
            <div>
              <h2 className="text-xl font-light tracking-[0.02em] mb-6">Site Texts</h2>
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5">
                <Field label="Landing page headline">
                  <input className={inputCls} value={texts.landing_headline} onChange={(e) => setTexts((t) => ({ ...t, landing_headline: e.target.value }))} />
                </Field>
                <Field label="Landing page subtitle">
                  <textarea className={textareaCls} rows={2} value={texts.landing_subtitle} onChange={(e) => setTexts((t) => ({ ...t, landing_subtitle: e.target.value }))} />
                </Field>
                <Field label="/artists page subtitle">
                  <input className={inputCls} value={texts.artists_subtitle} onChange={(e) => setTexts((t) => ({ ...t, artists_subtitle: e.target.value }))} />
                </Field>
                <Field label="Pricing tagline">
                  <input className={inputCls} value={texts.pricing_tagline} onChange={(e) => setTexts((t) => ({ ...t, pricing_tagline: e.target.value }))} />
                </Field>
                <div className="flex justify-end">
                  <SaveButton onClick={handleSaveTexts} saving={savingTexts} />
                </div>
                <p className="text-xs text-[#505050] border-t border-white/[0.06] pt-3">
                  Text changes are saved to Supabase. To reflect them live, the page components need to read from admin_config.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
