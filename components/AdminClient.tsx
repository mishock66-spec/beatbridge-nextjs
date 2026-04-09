"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

type ContactResult = {
  id: string;
  username: string;
  fullName: string;
  followers: number;
  profileType: string;
  suiviPar: string;
  statutDeContact: string;
};

type ContactEdit = {
  followers: number;
  profileType: string;
};

type ContactFull = {
  id: string;
  username: string;
  fullName: string;
  followers: number;
  profileType: string;
  suiviPar: string;
  hasTemplate: boolean;
  hasBio: boolean;
};

type DupGroup = {
  username: string;
  records: ContactFull[];
  keepId: string; // record ID to keep
};

type DupScanState = "idle" | "scanning" | "found" | "deleting" | "done";

type RegenState = {
  slug: string;
  done: number;
  total: number;
  running: boolean;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  trialStart: string | null;
  createdAt: string;
  dmsSent: number;
};

const PROFILE_TYPE_OPTIONS = [
  "Beatmaker/Producteur",
  "Ingé son",
  "Manager",
  "Artiste/Rappeur",
  "Photographe/Vidéaste",
  "DJ",
  "Autre",
];

type Stats = {
  totalUsers: number;
  trialUsers: number;
  paidUsers: number;
  dmsSentToday: number;
  dmsSentTotal: number;
};

type Section = "stats" | "users" | "messages" | "banner" | "artists" | "add-artist" | "contacts" | "templates" | "vote" | "texts";

type AddArtistForm = {
  artistName: string;
  artistSlug: string;
  instagram: string;
  twitter: string;
  description: string;
  followerCount: string;
};

type AddArtistStep = {
  step: number;
  message: string;
  status: "idle" | "running" | "done" | "error";
};

type AddArtistSummary = {
  artistName: string;
  artistSlug: string;
  contactsImported: number;
  autreClassified: number;
  templatesGenerated: number;
  photoUrl: string;
  photoFound: boolean;
};

const DEFAULT_ARTISTS: ArtistConfig[] = [
  { slug: "currensy",     name: "Curren$y",     description: "New Orleans legend and founder of Jet Life. Known for his prolific output and tight-knit producer network.", instagram: "https://www.instagram.com/spitta_andretti/",  twitter: "https://x.com/CurrenSy_Spitta",    visible: true },
  { slug: "harry-fraud",  name: "Harry Fraud",  description: "New York's sonic architect — cinematic boom-bap, dark jazz, grimy street rap.",                            instagram: "https://www.instagram.com/harryfraud/",        twitter: "https://x.com/HarryFraud",          visible: true },
  { slug: "wheezy",       name: "Wheezy",       description: "Atlanta's most in-demand producer. Behind Future, Gunna, Young Thug, Lil Baby's biggest records.",          instagram: "https://www.instagram.com/wheezy/",            twitter: "https://x.com/wheezy0uttahere",     visible: true },
  { slug: "juke-wong",    name: "Juke Wong",    description: "Rising producer known for melodic trap beats.",                                                              instagram: "https://www.instagram.com/jukewong/",          twitter: "https://x.com/jukewong",            visible: true },
  { slug: "southside",    name: "Southside",    description: "808 Mafia co-founder. Behind Travis Scott, Gucci Mane, Young Thug, Future, Migos — trap's sonic architect.",instagram: "https://www.instagram.com/808mafiaboss/",      twitter: "https://x.com/808mafiaboss",        visible: true },
  { slug: "metro-boomin", name: "Metro Boomin", description: "Atlanta's hitmaker. The architect behind Future, Drake, Travis Scott, 21 Savage — trap's most decorated producer.", instagram: "https://www.instagram.com/metroboomin/", twitter: "https://x.com/MetroBoomin",         visible: true },
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

// ─── Custom select (replaces native <select> for full dark-theme control) ─────

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "— select —",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between bg-[#1a1a1a] border rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
          open ? "border-orange-500" : "border-[#333] hover:border-[#444]"
        }`}
      >
        <span className={selectedLabel ? "text-white" : "text-[#505050]"}>
          {selectedLabel ?? placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-[#505050] flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[300] top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden shadow-xl shadow-black/60">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? "bg-orange-500 text-white"
                  : "text-[#d0d0d0] hover:bg-orange-500 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors";
const textareaCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors resize-y";

// ─── Plan badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const p = plan?.toLowerCase() ?? "free";
  const s = status?.toLowerCase() ?? "";
  if (p === "premium" || p === "lifetime") {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Premium</span>;
  }
  if (p === "pro" || s === "trialing" || s === "active") {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">Pro</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#707070]">Free</span>;
}

function TrialBadge({ trialStart }: { trialStart: string | null }) {
  if (!trialStart) return <span className="text-xs text-[#505050]">N/A</span>;
  const start = new Date(trialStart);
  const expiry = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  const active = expiry > new Date();
  return active
    ? <span className="text-xs font-medium text-green-400">Active</span>
    : <span className="text-xs text-[#505050]">Expired</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function exportCSV(users: AdminUser[]) {
  const headers = ["#", "Name", "Email", "Plan", "Trial", "Joined", "DMs Sent"];
  const rows = users.map((u, i) => [
    i + 1,
    u.name,
    u.email,
    u.plan ?? "free",
    u.trialStart ? (new Date(u.trialStart).getTime() + 14 * 86400000 > Date.now() ? "Active" : "Expired") : "N/A",
    formatDate(u.createdAt),
    u.dmsSent,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beatbridge-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Users section ────────────────────────────────────────────────────────────

function UsersSection({
  users,
  loading,
  userSearch,
  setUserSearch,
  onRefresh,
  adminUserId: _adminUserId,
  clerkFailed,
}: {
  users: AdminUser[];
  loading: boolean;
  userSearch: string;
  setUserSearch: (v: string) => void;
  onRefresh: () => void;
  adminUserId: string;
  clerkFailed?: boolean;
}) {
  const filtered = userSearch.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-xl font-light tracking-[0.02em]">
          Users
          {users.length > 0 && (
            <span className="ml-2 text-sm text-[#505050] font-normal">({users.length})</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {users.length > 0 && (
            <button
              onClick={() => exportCSV(users)}
              className="text-xs font-medium text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs text-[#505050] hover:text-orange-400 transition-colors"
          >
            {loading ? "Loading…" : "↺ Refresh"}
          </button>
        </div>
      </div>

      {/* Clerk warning */}
      {clerkFailed && (
        <div className="mb-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-300">
          Could not reach Clerk API — emails unavailable. Check that <code className="bg-white/[0.08] px-1 rounded">CLERK_SECRET_KEY</code> is set in Vercel production env.
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          className={inputCls}
          placeholder="Search by name or email…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />
      </div>

      {loading && users.length === 0 ? (
        <p className="text-[#505050] text-sm">Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[#505050] text-sm">{userSearch ? "No users match your search." : "No users yet."}</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white/[0.025] border border-white/[0.08] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["#", "Name", "Email", "Plan", "Trial", "Joined", "DMs"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#606060] uppercase tracking-[0.08em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[#505050] text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-white">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-[#a0a0a0] max-w-[180px] truncate">{u.email}</td>
                    <td className="px-4 py-3"><PlanBadge plan={u.plan} status={u.subscriptionStatus} /></td>
                    <td className="px-4 py-3"><TrialBadge trialStart={u.trialStart} /></td>
                    <td className="px-4 py-3 text-[#707070] whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-[#a0a0a0] font-mono">{u.dmsSent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {filtered.map((u, i) => (
              <div key={u.id} className="bg-white/[0.025] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{u.name || "—"}</p>
                    <p className="text-xs text-[#606060] mt-0.5 break-all">{u.email}</p>
                  </div>
                  <PlanBadge plan={u.plan} status={u.subscriptionStatus} />
                </div>
                <div className="flex items-center gap-4 text-xs text-[#606060]">
                  <span>#{i + 1}</span>
                  <span>Trial: <TrialBadge trialStart={u.trialStart} /></span>
                  <span>{formatDate(u.createdAt)}</span>
                  <span>{u.dmsSent} DMs</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ADMIN_EMAIL = "mishock66@gmail.com";

export default function AdminClient({
  initialBanner,
  initialVoteCandidates,
  initialSiteTexts,
  initialArtistOverrides = {},
}: {
  initialBanner: BannerConfig | null;
  initialVoteCandidates: VoteCandidate[];
  initialSiteTexts: Partial<SiteTexts>;
  initialArtistOverrides?: Record<string, Partial<ArtistConfig>>;
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
  const [artists, setArtists] = useState<ArtistConfig[]>(() =>
    DEFAULT_ARTISTS.map((a) => ({ ...a, ...(initialArtistOverrides[a.slug] ?? {}) }))
  );
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

  // ── Users ─────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [clerkFailed, setClerkFailed] = useState(false);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [msgForm, setMsgForm] = useState({ title: "", body: "", type: "update", recipientUserId: "" });
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgHistory, setMsgHistory] = useState<Array<{
    batchId: string; title: string; type: string;
    isBroadcast: boolean; createdAt: string; count: number;
  }>>([]);
  const [loadingMsgHistory, setLoadingMsgHistory] = useState(false);

  // ── Contact search ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContactResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [contactEdits, setContactEdits] = useState<Record<string, ContactEdit>>({});
  const [savingContact, setSavingContact] = useState<string | null>(null);
  const [deletingContact, setDeletingContact] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactResult | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Duplicate detection ───────────────────────────────────────────────────
  const [dupScanState, setDupScanState] = useState<DupScanState>("idle");
  const [dupGroups, setDupGroups] = useState<DupGroup[]>([]);
  const [dupDeleteProgress, setDupDeleteProgress] = useState({ done: 0, total: 0 });
  const [dupDeletedCount, setDupDeletedCount] = useState(0);

  // ── Template regen ────────────────────────────────────────────────────────
  const [regenStates, setRegenStates] = useState<Record<string, RegenState>>({});
  const [regenMode, setRegenMode] = useState<Record<string, "all" | "empty">>({});

  // ── Add Artist ────────────────────────────────────────────────────────────
  const [addArtistForm, setAddArtistForm] = useState<AddArtistForm>({
    artistName: "", artistSlug: "", instagram: "", twitter: "", description: "", followerCount: "",
  });
  const [addArtistFile, setAddArtistFile] = useState<File | null>(null);
  const addArtistFileRef = useRef<HTMLInputElement>(null);
  const [addArtistRunning, setAddArtistRunning] = useState(false);
  const [addArtistSteps, setAddArtistSteps] = useState<AddArtistStep[]>([]);
  const [addArtistSummary, setAddArtistSummary] = useState<AddArtistSummary | null>(null);
  const [addArtistError, setAddArtistError] = useState<string | null>(null);

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

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: adminUserId }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setClerkFailed(data.clerkFailed ?? false);
    }
    setLoadingUsers(false);
  }, [adminUserId]);

  useEffect(() => {
    if (section === "users") fetchUsers();
  }, [section, fetchUsers]);

  const fetchMsgHistory = useCallback(async () => {
    setLoadingMsgHistory(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: adminUserId }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setMsgHistory(data.history ?? []);
    }
    setLoadingMsgHistory(false);
  }, [adminUserId]);

  useEffect(() => {
    if (section === "messages") fetchMsgHistory();
  }, [section, fetchMsgHistory]);

  async function handleSendMessage() {
    if (!msgForm.title || !msgForm.body) return;
    setSendingMsg(true);
    try {
      const res = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUserId,
          title: msgForm.title,
          body: msgForm.body,
          type: msgForm.type,
          recipientUserId: msgForm.recipientUserId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      const target = msgForm.recipientUserId
        ? `1 user`
        : `${data.recipientCount} users`;
      toast.success(`Message sent to ${target} ✓ (${data.emailsSent} emails)`);
      setMsgForm({ title: "", body: "", type: "update", recipientUserId: "" });
      fetchMsgHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSendingMsg(false);
    }
  }

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

  // ── Contact search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(
        `/api/admin/contact-search?userId=${encodeURIComponent(adminUserId)}&q=${encodeURIComponent(searchQuery)}`
      ).catch(() => null);
      if (res?.ok) {
        const data = await res.json().catch(() => null);
        if (data?.results) setSearchResults(data.results);
      }
      setSearching(false);
    }, 400);
  }, [searchQuery, adminUserId]);

  useEffect(() => {
    if (!deleteTarget) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setDeleteTarget(null); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleteTarget]);

  async function handleSaveContact(contact: ContactResult) {
    const edit = contactEdits[contact.id];
    if (!edit) return;
    setSavingContact(contact.id);
    try {
      const res = await fetch("/api/admin/contact-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUserId,
          recordId: contact.id,
          followers: edit.followers,
          profileType: edit.profileType,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      // Update in-place in results
      setSearchResults((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? { ...c, followers: edit.followers, profileType: edit.profileType }
            : c
        )
      );
      toast.success(`@${contact.username} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingContact(null);
    }
  }

  function getContactEdit(contact: ContactResult): ContactEdit {
    return contactEdits[contact.id] ?? { followers: contact.followers, profileType: contact.profileType };
  }

  async function executeDelete(contact: ContactResult) {
    setDeleteTarget(null);
    setDeletingContact(contact.id);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Delete failed");
      }
      setSearchResults((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success(`@${contact.username} deleted ✓`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingContact(null);
    }
  }

  // ── Scoring: higher = better candidate to keep ────────────────────────────
  function scoreRecord(r: ContactFull): number {
    let s = 0;
    if (r.hasTemplate) s += 3;
    if (r.hasBio) s += 2;
    if (r.followers > 0) s += 1;
    return s;
  }

  async function handleFindDuplicates() {
    setDupScanState("scanning");
    setDupGroups([]);
    try {
      const res = await fetch(`/api/admin/contacts?userId=${encodeURIComponent(adminUserId)}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      const records: ContactFull[] = data.records ?? [];

      // Group by normalised username
      const byUsername = new Map<string, ContactFull[]>();
      for (const r of records) {
        if (!r.username) continue;
        if (!byUsername.has(r.username)) byUsername.set(r.username, []);
        byUsername.get(r.username)!.push(r);
      }

      const groups: DupGroup[] = [];
      for (const [username, recs] of byUsername) {
        if (recs.length < 2) continue;
        // Sort descending by score, keep the first
        const sorted = [...recs].sort((a, b) => scoreRecord(b) - scoreRecord(a));
        groups.push({ username, records: sorted, keepId: sorted[0].id });
      }

      // Sort groups by username alphabetically
      groups.sort((a, b) => a.username.localeCompare(b.username));
      setDupGroups(groups);
      setDupScanState("found");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
      setDupScanState("idle");
    }
  }

  async function handleDeleteDuplicates() {
    const toDelete = dupGroups.flatMap((g) =>
      g.records.filter((r) => r.id !== g.keepId).map((r) => r.id)
    );
    if (!toDelete.length) return;

    setDupScanState("deleting");
    setDupDeleteProgress({ done: 0, total: toDelete.length });

    const CHUNK = 50; // send 50 IDs per request (each request batches into 10s server-side)
    let done = 0;

    for (let i = 0; i < toDelete.length; i += CHUNK) {
      const chunk = toDelete.slice(i, i + CHUNK);
      try {
        const res = await fetch("/api/admin/contacts/bulk-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: adminUserId, recordIds: chunk }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Bulk delete failed");
        }
        const result = await res.json();
        done += result.deleted ?? chunk.length;
        setDupDeleteProgress({ done, total: toDelete.length });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete batch failed");
        setDupScanState("found");
        return;
      }
    }

    setDupDeletedCount(done);
    setDupGroups([]);
    setDupScanState("done");
    toast.success(`Deleted ${done} duplicate records ✓`);
  }

  function setContactEdit(id: string, patch: Partial<ContactEdit>, baseContact?: ContactResult) {
    setContactEdits((prev) => {
      const base = prev[id] ?? (baseContact
        ? { followers: baseContact.followers, profileType: baseContact.profileType }
        : { followers: 0, profileType: "" });
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }

  // ── Template regeneration ─────────────────────────────────────────────────
  async function handleRegenerate(artistSlug: string, artistName: string, emptyOnly: boolean) {
    setRegenStates((prev) => ({
      ...prev,
      [artistSlug]: { slug: artistSlug, done: 0, total: 0, running: true },
    }));
    try {
      const res = await fetch("/api/admin/regenerate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId, artistSlug, emptyOnly }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "progress") {
              setRegenStates((prev) => ({
                ...prev,
                [artistSlug]: { slug: artistSlug, done: data.done, total: data.total, running: true },
              }));
            }
            if (data.type === "done") {
              setRegenStates((prev) => ({
                ...prev,
                [artistSlug]: { slug: artistSlug, done: data.updated, total: data.total, running: false },
              }));
              toast.success(`${artistName}: ${data.updated} templates regenerated`);
            }
            if (data.type === "error") {
              toast.error(`${artistName}: ${data.message}`);
              setRegenStates((prev) => ({ ...prev, [artistSlug]: { ...prev[artistSlug], running: false } }));
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regeneration failed");
      setRegenStates((prev) => ({ ...prev, [artistSlug]: { ...(prev[artistSlug] ?? { slug: artistSlug, done: 0, total: 0 }), running: false } }));
    }
  }

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

  // ── Add Artist pipeline ────────────────────────────────────────────────────
  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function updateAddArtistStep(step: number, status: AddArtistStep["status"], message: string) {
    setAddArtistSteps((prev) => {
      const existing = prev.find((s) => s.step === step);
      if (existing) {
        return prev.map((s) => s.step === step ? { ...s, status, message } : s);
      }
      return [...prev, { step, status, message }];
    });
  }

  async function handleAddArtist() {
    if (!addArtistForm.artistName || !addArtistForm.artistSlug || !addArtistForm.instagram || !addArtistFile) {
      toast.error("Please fill all required fields and upload a CSV.");
      return;
    }

    setAddArtistRunning(true);
    setAddArtistSteps([]);
    setAddArtistSummary(null);
    setAddArtistError(null);

    try {
      const fd = new FormData();
      fd.append("userId", adminUserId);
      fd.append("artistName", addArtistForm.artistName);
      fd.append("artistSlug", addArtistForm.artistSlug);
      fd.append("instagram", addArtistForm.instagram);
      fd.append("twitter", addArtistForm.twitter);
      fd.append("description", addArtistForm.description);
      fd.append("followerCount", addArtistForm.followerCount || "0");
      fd.append("file", addArtistFile);

      const res = await fetch("/api/admin/add-artist", { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error("Request failed — check server logs");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "step") {
              updateAddArtistStep(data.step, data.status, data.message);
            }
            if (data.type === "done") {
              setAddArtistSummary({
                artistName: data.artistName,
                artistSlug: data.artistSlug,
                contactsImported: data.contactsImported,
                autreClassified: data.autreClassified,
                templatesGenerated: data.templatesGenerated,
                photoUrl: data.photoUrl,
                photoFound: data.photoFound,
              });
              toast.success(`${data.artistName} added successfully!`);
            }
            if (data.type === "error") {
              setAddArtistError(data.message);
              toast.error(data.message);
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pipeline failed";
      setAddArtistError(msg);
      toast.error(msg);
    } finally {
      setAddArtistRunning(false);
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
    { id: "stats",     label: "Stats",     icon: "📊" },
    { id: "users",     label: "Users",     icon: "👥" },
    { id: "messages",  label: "Messages",  icon: "💬" },
    { id: "banner",    label: "Banner",    icon: "📢" },
    { id: "artists",    label: "Artists",    icon: "🎤" },
    { id: "add-artist", label: "Add Artist +", icon: "➕" },
    { id: "contacts",  label: "Contacts",  icon: "🔍" },
    { id: "templates", label: "Templates", icon: "⚙️"  },
    { id: "vote",      label: "Vote",      icon: "🗳️"  },
    { id: "texts",     label: "Texts",     icon: "✏️"  },
  ];

  // Show nothing while Clerk initialises or if not admin
  if (!isLoaded || user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[rgba(8,8,8,0.95)] sticky top-14 z-40">
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

              {/* Quick Links */}
              <div className="mt-6 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <p className="text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-3">Quick Links</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { icon: "💳", label: "Anthropic credits",  href: "https://console.anthropic.com/settings/billing" },
                    { icon: "🗃️", label: "Airtable tokens",    href: "https://airtable.com/create/tokens" },
                    { icon: "💳", label: "Stripe dashboard",   href: "https://dashboard.stripe.com" },
                    { icon: "📊", label: "Vercel dashboard",   href: "https://vercel.com/mishock66-2702s-projects/beatbridge-nextjs" },
                  ].map(({ icon, label, href }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-150 group"
                    >
                      <span className="text-base leading-none">{icon}</span>
                      <span className="text-sm text-[#a0a0a0] group-hover:text-white transition-colors">{label}</span>
                      <span className="ml-auto text-[#404040] group-hover:text-[#707070] text-xs transition-colors">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ─────────────────────────────────────────────────────── */}
          {section === "users" && (
            <UsersSection
              users={users}
              loading={loadingUsers}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              onRefresh={fetchUsers}
              adminUserId={adminUserId}
              clerkFailed={clerkFailed}
            />
          )}

          {/* ── MESSAGES ──────────────────────────────────────────────────── */}
          {section === "messages" && (
            <div>
              <h2 className="text-xl font-light tracking-[0.02em] mb-6">Send Message</h2>

              {/* Compose form */}
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 mb-6">
                <div className="flex flex-col gap-4">
                  <Field label="Title">
                    <input
                      className={inputCls}
                      placeholder="e.g. New artist network just dropped 🔓"
                      value={msgForm.title}
                      onChange={(e) => setMsgForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </Field>
                  <Field label="Body (supports **bold** and *italic*)">
                    <textarea
                      className={textareaCls}
                      rows={5}
                      placeholder="Write your message here..."
                      value={msgForm.body}
                      onChange={(e) => setMsgForm((f) => ({ ...f, body: e.target.value }))}
                    />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Type">
                      <CustomSelect
                        value={msgForm.type}
                        onChange={(v) => setMsgForm((f) => ({ ...f, type: v }))}
                        options={[
                          { value: "announcement", label: "Announcement" },
                          { value: "update",       label: "Update" },
                          { value: "tip",          label: "Tip" },
                          { value: "personal",     label: "Personal" },
                        ]}
                      />
                    </Field>
                    <Field label="Recipient">
                      <CustomSelect
                        value={msgForm.recipientUserId}
                        onChange={(v) => setMsgForm((f) => ({ ...f, recipientUserId: v }))}
                        placeholder="All users (broadcast)"
                        options={[
                          { value: "", label: "All users (broadcast)" },
                          ...users.map((u) => ({
                            value: u.id,
                            label: `${u.name || u.id}${u.email !== "—" ? ` (${u.email})` : ""}`,
                          })),
                        ]}
                      />
                    </Field>
                  </div>

                  {/* Preview */}
                  {(msgForm.title || msgForm.body) && (
                    <div className="border border-white/[0.06] rounded-xl p-4 bg-[#0d0d0d]">
                      <p className="text-xs text-[#505050] uppercase tracking-[0.08em] mb-3">Preview</p>
                      {msgForm.title && (
                        <p className="text-sm font-semibold text-white mb-2">{msgForm.title}</p>
                      )}
                      {msgForm.body && (
                        <p className="text-xs text-[#a0a0a0] leading-relaxed whitespace-pre-wrap">{msgForm.body}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <span className="text-xs text-orange-400">View in inbox →</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-xs text-[#505050]">
                      {msgForm.recipientUserId
                        ? "Sends to 1 user + email notification"
                        : `Sends to all ${users.length} users + email notifications`}
                    </p>
                    <SaveButton
                      onClick={handleSendMessage}
                      saving={sendingMsg}
                      label={sendingMsg ? "Sending…" : "Send Message"}
                    />
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Sent history</h3>
                <button
                  onClick={fetchMsgHistory}
                  disabled={loadingMsgHistory}
                  className="text-xs text-[#505050] hover:text-orange-400 transition-colors"
                >
                  {loadingMsgHistory ? "Loading…" : "↺ Refresh"}
                </button>
              </div>

              {msgHistory.length === 0 ? (
                <p className="text-[#505050] text-sm">No messages sent yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {msgHistory.map((h) => {
                    const typeColors: Record<string, string> = {
                      announcement: "text-orange-400 bg-orange-500/10",
                      update:       "text-blue-400 bg-blue-500/10",
                      tip:          "text-green-400 bg-green-500/10",
                      personal:     "text-purple-400 bg-purple-500/10",
                    };
                    return (
                      <div key={h.batchId} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${typeColors[h.type] ?? "text-[#707070] bg-white/[0.06]"}`}>
                          {h.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{h.title}</p>
                          <p className="text-xs text-[#505050]">
                            {h.isBroadcast ? `Sent to all (${h.count})` : "Personal"} ·{" "}
                            {new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

          {/* ── ADD ARTIST ────────────────────────────────────────────────── */}
          {section === "add-artist" && (
            <div>
              <h2 className="text-xl font-light tracking-[0.02em] mb-1">Add Artist</h2>
              <p className="text-sm text-[#505050] mb-6">Upload an Apify CSV export and fill in the artist details. The pipeline handles everything automatically.</p>

              {/* Form */}
              {!addArtistSummary && (
                <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-5 mb-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Artist Name *">
                      <input
                        className={inputCls}
                        placeholder="Metro Boomin"
                        value={addArtistForm.artistName}
                        disabled={addArtistRunning}
                        onChange={(e) => {
                          const name = e.target.value;
                          setAddArtistForm((f) => ({
                            ...f,
                            artistName: name,
                            artistSlug: f.artistSlug || generateSlug(name),
                          }));
                        }}
                      />
                    </Field>
                    <Field label="Slug *">
                      <input
                        className={inputCls}
                        placeholder="metro-boomin"
                        value={addArtistForm.artistSlug}
                        disabled={addArtistRunning}
                        onChange={(e) => setAddArtistForm((f) => ({ ...f, artistSlug: e.target.value }))}
                      />
                    </Field>
                    <Field label="Instagram Handle *">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505050] text-sm">@</span>
                        <input
                          className={`${inputCls} pl-7`}
                          placeholder="metroboomin"
                          value={addArtistForm.instagram}
                          disabled={addArtistRunning}
                          onChange={(e) => setAddArtistForm((f) => ({ ...f, instagram: e.target.value.replace(/^@/, "") }))}
                        />
                      </div>
                    </Field>
                    <Field label="Twitter/X Handle (optional)">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505050] text-sm">@</span>
                        <input
                          className={`${inputCls} pl-7`}
                          placeholder="MetroBoomin"
                          value={addArtistForm.twitter}
                          disabled={addArtistRunning}
                          onChange={(e) => setAddArtistForm((f) => ({ ...f, twitter: e.target.value.replace(/^@/, "") }))}
                        />
                      </div>
                    </Field>
                  </div>

                  <Field label="Description">
                    <textarea
                      className={textareaCls}
                      rows={2}
                      placeholder="Brief bio for the artist page…"
                      value={addArtistForm.description}
                      disabled={addArtistRunning}
                      onChange={(e) => setAddArtistForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Follower Count (used for premium gating)">
                      <input
                        className={inputCls}
                        type="number"
                        placeholder="12000000"
                        value={addArtistForm.followerCount}
                        disabled={addArtistRunning}
                        onChange={(e) => setAddArtistForm((f) => ({ ...f, followerCount: e.target.value }))}
                      />
                    </Field>

                    <Field label="CSV File * (.csv, Apify export)">
                      <div
                        onClick={() => !addArtistRunning && addArtistFileRef.current?.click()}
                        className={`w-full flex items-center gap-3 bg-white/[0.03] border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                          addArtistRunning ? "opacity-50 cursor-not-allowed border-white/[0.08]" : "border-white/[0.08] hover:border-orange-500/40"
                        }`}
                      >
                        <span className="text-lg">📎</span>
                        <span className={addArtistFile ? "text-white" : "text-[#505050]"}>
                          {addArtistFile ? addArtistFile.name : "Click to choose CSV…"}
                        </span>
                        {addArtistFile && (
                          <span className="ml-auto text-xs text-[#505050]">
                            {(addArtistFile.size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                      <input
                        ref={addArtistFileRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setAddArtistFile(e.target.files?.[0] ?? null)}
                      />
                    </Field>
                  </div>

                  {addArtistError && !addArtistRunning && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
                      ⚠ {addArtistError}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleAddArtist}
                      disabled={addArtistRunning || !addArtistForm.artistName || !addArtistForm.instagram || !addArtistFile}
                      className="bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addArtistRunning ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing…
                        </span>
                      ) : "Start Processing"}
                    </button>
                  </div>
                </div>
              )}

              {/* Progress UI */}
              {addArtistSteps.length > 0 && !addArtistSummary && (
                <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 mb-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Pipeline Progress</h3>
                  <div className="flex flex-col gap-3">
                    {addArtistSteps.map((s) => (
                      <div key={s.step} className="flex items-center gap-3">
                        {s.status === "running" && (
                          <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        )}
                        {s.status === "done" && (
                          <span className="text-green-400 flex-shrink-0 text-sm">✓</span>
                        )}
                        {s.status === "error" && (
                          <span className="text-red-400 flex-shrink-0 text-sm">✗</span>
                        )}
                        <span className={`text-sm ${
                          s.status === "running" ? "text-orange-300" :
                          s.status === "done" ? "text-[#a0a0a0]" :
                          s.status === "error" ? "text-red-300" : "text-[#606060]"
                        }`}>
                          {s.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion summary */}
              {addArtistSummary && (
                <div className="flex flex-col gap-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-1">
                      ✓ {addArtistSummary.artistName} added successfully!
                    </h3>
                    <p className="text-sm text-[#707070] mb-4">The pipeline completed. Here&apos;s the summary:</p>
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                        <p className="text-xs text-[#505050] uppercase tracking-[0.08em] mb-1">Contacts imported</p>
                        <p className="text-2xl font-black text-orange-500">{addArtistSummary.contactsImported.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                        <p className="text-xs text-[#505050] uppercase tracking-[0.08em] mb-1">Profiles classified</p>
                        <p className="text-2xl font-black text-orange-500">{addArtistSummary.autreClassified.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                        <p className="text-xs text-[#505050] uppercase tracking-[0.08em] mb-1">DM templates generated</p>
                        <p className="text-2xl font-black text-orange-500">{addArtistSummary.templatesGenerated.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                        <p className="text-xs text-[#505050] uppercase tracking-[0.08em] mb-1">Photo</p>
                        <p className="text-sm font-semibold">
                          {addArtistSummary.photoFound
                            ? <span className="text-green-400">✓ Found</span>
                            : <span className="text-yellow-400">⚠ Using fallback</span>
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={`/artist/${addArtistSummary.artistSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        View artist page →
                      </a>
                      <span className="text-[#303030]">·</span>
                      <a
                        href={`/dashboard`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#505050] hover:text-white transition-colors"
                      >
                        View on dashboard →
                      </a>
                    </div>
                  </div>

                  {/* Next steps: code snippets */}
                  <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-white mb-1">Next steps — manual code updates required</h3>
                    <p className="text-xs text-[#505050] mb-4">These code changes can&apos;t be done automatically on Vercel. Copy-paste into the files listed below, then push to main.</p>

                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-xs text-[#707070] mb-1.5">1. <code className="text-orange-300">lib/airtable.ts</code> — Add to ARTIST_ORDER:</p>
                        <pre className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg px-4 py-3 text-xs text-[#a0a0a0] overflow-x-auto whitespace-pre-wrap">
{`const ARTIST_ORDER = [..., "${addArtistSummary.artistName}"];`}
                        </pre>
                      </div>

                      <div>
                        <p className="text-xs text-[#707070] mb-1.5">2. <code className="text-orange-300">app/dashboard/page.tsx</code> — Add to ARTIST_METADATA:</p>
                        <pre className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg px-4 py-3 text-xs text-[#a0a0a0] overflow-x-auto whitespace-pre-wrap">
{`"${addArtistSummary.artistName}": { slug: "${addArtistSummary.artistSlug}", photo: "/images/${addArtistSummary.artistSlug}.jpg" },`}
                        </pre>
                      </div>

                      <div>
                        <p className="text-xs text-[#707070] mb-1.5">3. <code className="text-orange-300">lib/announcements.ts</code> — Set as latest drop:</p>
                        <pre className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg px-4 py-3 text-xs text-[#a0a0a0] overflow-x-auto whitespace-pre-wrap">
{`export const LATEST_DROP = {
  artistName: "${addArtistSummary.artistName}",
  slug: "${addArtistSummary.artistSlug}",
  connectionCount: ${addArtistSummary.contactsImported},
  droppedAt: "${new Date().toISOString()}",
  active: true,
};`}
                        </pre>
                      </div>

                      <div>
                        <p className="text-xs text-[#707070] mb-1.5">4. Upload artist photo to <code className="text-orange-300">public/images/{addArtistSummary.artistSlug}.jpg</code></p>
                        {addArtistSummary.photoFound && (
                          <p className="text-xs text-[#505050]">
                            Photo URL found: <a href={addArtistSummary.photoUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline break-all">{addArtistSummary.photoUrl}</a>
                          </p>
                        )}
                        <p className="text-xs text-[#505050] mt-1">
                          Download: <code className="bg-[#0d0d0d] px-1.5 py-0.5 rounded text-[#a0a0a0]">{`curl -L "${addArtistSummary.photoUrl}" -o public/images/${addArtistSummary.artistSlug}.jpg`}</code>
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#707070] mb-1.5">5. Create artist page at <code className="text-orange-300">app/artist/{addArtistSummary.artistSlug}/page.tsx</code> using an existing artist as template.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setAddArtistSummary(null);
                        setAddArtistSteps([]);
                        setAddArtistError(null);
                        setAddArtistForm({ artistName: "", artistSlug: "", instagram: "", twitter: "", description: "", followerCount: "" });
                        setAddArtistFile(null);
                        if (addArtistFileRef.current) addArtistFileRef.current.value = "";
                      }}
                      className="text-sm text-[#505050] hover:text-white transition-colors border border-white/[0.08] hover:border-white/[0.15] px-4 py-2 rounded-lg"
                    >
                      Add another artist
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CONTACTS ──────────────────────────────────────────────────── */}
          {section === "contacts" && (
            <div>
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <h2 className="text-xl font-light tracking-[0.02em]">Contact Editor</h2>
                <button
                  onClick={handleFindDuplicates}
                  disabled={dupScanState === "scanning" || dupScanState === "deleting"}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-[#a0a0a0] hover:text-white hover:border-white/[0.2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {dupScanState === "scanning" ? (
                    <><span className="w-3 h-3 border border-[#a0a0a0] border-t-transparent rounded-full animate-spin" />Scanning…</>
                  ) : "🔍 Find Duplicates"}
                </button>
              </div>

              {/* ── Duplicate scan results ─────────────────────────────────── */}
              {dupScanState === "found" && dupGroups.length === 0 && (
                <div className="bg-green-500/[0.06] border border-green-500/20 rounded-xl px-4 py-3 mb-6">
                  <p className="text-sm text-green-400">✓ No duplicate usernames found across all contacts.</p>
                </div>
              )}

              {dupScanState === "found" && dupGroups.length > 0 && (
                <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5 mb-6">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Found {dupGroups.reduce((s, g) => s + g.records.length - 1, 0)} duplicates across {dupGroups.length} usernames
                      </p>
                      <p className="text-xs text-[#606060] mt-0.5">
                        One record per username will be kept (the one with the most complete data).
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteDuplicates}
                      className="text-xs font-semibold px-3 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors whitespace-nowrap"
                    >
                      🗑️ Remove all duplicates
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                    {dupGroups.map((g) => (
                      <div key={g.username} className="bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.05]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-orange-400">@{g.username}</span>
                          <span className="text-[10px] text-[#505050]">{g.records.length} records</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {g.records.map((r) => (
                            <div key={r.id} className={`flex items-center gap-2 text-[11px] ${r.id === g.keepId ? "text-green-400" : "text-[#606060] line-through"}`}>
                              {r.id === g.keepId ? "✓ keep" : "✗ delete"}
                              <span className="not-italic no-underline text-[#505050]">
                                {r.suiviPar || "unknown artist"}{r.hasTemplate ? " · has template" : ""}{r.hasBio ? " · has bio" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dupScanState === "deleting" && (
                <div className="bg-white/[0.025] border border-white/[0.08] rounded-xl px-4 py-4 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-white">Deleting duplicates… {dupDeleteProgress.done}/{dupDeleteProgress.total}</p>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${dupDeleteProgress.total > 0 ? (dupDeleteProgress.done / dupDeleteProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {dupScanState === "done" && (
                <div className="bg-green-500/[0.06] border border-green-500/20 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3">
                  <p className="text-sm text-green-400">✓ Deleted {dupDeletedCount} duplicate records.</p>
                  <button onClick={() => setDupScanState("idle")} className="text-xs text-[#606060] hover:text-[#a0a0a0]">Dismiss</button>
                </div>
              )}
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 mb-5">
                <div className="relative">
                  <input
                    className={inputCls + " pr-10"}
                    placeholder="Search by @username or name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <p className="text-xs text-[#505050] mt-2">Type at least 2 characters</p>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="flex flex-col gap-3">
                  {searchResults.map((contact) => {
                    const edit = contactEdits[contact.id] ?? { followers: contact.followers, profileType: contact.profileType };
                    return (
                      <div key={contact.id} className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="min-w-0">
                            <a
                              href={`https://www.instagram.com/${contact.username}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-orange-400 transition-colors group"
                            >
                              @{contact.username}
                              <svg className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            {contact.fullName && <p className="text-xs text-[#606060] mt-0.5">{contact.fullName}</p>}
                            <p className="text-xs text-[#505050] mt-0.5">{contact.suiviPar}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md whitespace-nowrap">
                              {contact.profileType || "—"}
                            </span>
                            <button
                              onClick={() => setDeleteTarget(contact)}
                              disabled={deletingContact === contact.id}
                              title={`Delete @${contact.username}`}
                              className="p-1.5 text-[#505050] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/[0.08] disabled:opacity-40"
                            >
                              {deletingContact === contact.id ? (
                                <span className="w-3.5 h-3.5 block border-2 border-[#606060] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 mb-4">
                          <Field label="Followers">
                            <input
                              type="number"
                              className={inputCls}
                              value={edit.followers}
                              onChange={(e) => setContactEdit(contact.id, { followers: parseInt(e.target.value) || 0 }, contact)}
                            />
                          </Field>
                          <Field label="Profile Type">
                            <CustomSelect
                              value={edit.profileType}
                              onChange={(v) => setContactEdit(contact.id, { profileType: v }, contact)}
                              placeholder="— select type —"
                              options={PROFILE_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                            />
                          </Field>
                        </div>
                        <div className="flex justify-end">
                          <SaveButton
                            onClick={() => handleSaveContact(contact)}
                            saving={savingContact === contact.id}
                            label="Save contact"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-[#505050] text-sm text-center py-8">No contacts found for &quot;{searchQuery}&quot;</p>
              )}

              {/* Delete confirmation modal */}
              {deleteTarget && (
                <div
                  className="fixed inset-0 z-[500] flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                  onClick={() => setDeleteTarget(null)}
                >
                  <div
                    className="bg-[#1a1a1a] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-base font-semibold text-white mb-2">Delete this contact?</h3>
                    <p className="text-sm text-[#a0a0a0] mb-6 leading-relaxed">
                      Delete{" "}
                      <span className="text-white font-medium">@{deleteTarget.username}</span>?{" "}
                      This cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="px-4 py-2 text-sm text-[#a0a0a0] bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => executeDelete(deleteTarget)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                      >
                        Yes, delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TEMPLATES ─────────────────────────────────────────────────── */}
          {section === "templates" && (
            <div>
              <h2 className="text-xl font-light tracking-[0.02em] mb-2">Template Regeneration</h2>
              <p className="text-sm text-[#505050] mb-6">Regenerates DM templates using Claude Haiku with parallel batches. ~3–5 min for 900 contacts.</p>
              <div className="flex flex-col gap-4">
                {DEFAULT_ARTISTS.map((a) => {
                  const regen = regenStates[a.slug];
                  const running = regen?.running ?? false;
                  const pct = regen && regen.total > 0 ? Math.round((regen.done / regen.total) * 100) : 0;
                  const mode = regenMode[a.slug] ?? "empty";
                  return (
                    <div key={a.slug} className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{a.name}</p>
                          {regen && !running && regen.done > 0 && (
                            <p className="text-xs text-green-400 mt-0.5">✓ {regen.done}/{regen.total} templates updated</p>
                          )}
                          {running && regen && regen.total > 0 && (
                            <p className="text-xs text-orange-400 mt-0.5">Regenerating… {regen.done}/{regen.total} ({pct}%)</p>
                          )}
                          {running && regen && regen.total === 0 && (
                            <p className="text-xs text-[#606060] mt-0.5">Fetching records…</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Mode toggle */}
                          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 gap-0.5">
                            {(["empty", "all"] as const).map((m) => (
                              <button
                                key={m}
                                onClick={() => setRegenMode((prev) => ({ ...prev, [a.slug]: m }))}
                                disabled={running}
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                                  mode === m
                                    ? "bg-white/[0.1] text-white"
                                    : "text-[#606060] hover:text-[#a0a0a0]"
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                {m === "empty" ? "Empty only" : "All"}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleRegenerate(a.slug, a.name, mode === "empty")}
                            disabled={running}
                            className="flex-shrink-0 text-sm font-medium bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {running ? (
                              <span className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Running…
                              </span>
                            ) : "Regenerate"}
                          </button>
                        </div>
                      </div>
                      {running && regen && regen.total > 0 && (
                        <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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
