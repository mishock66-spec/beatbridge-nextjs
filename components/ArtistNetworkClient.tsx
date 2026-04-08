"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { AirtableRecord } from "@/lib/airtable";
import ConnectionCard, { type ContactStatus } from "@/components/ConnectionCard";
import StickyDMBar from "@/components/StickyDMBar";
import DMSessionModal from "@/components/DMSessionModal";
import { supabase } from "@/lib/supabase";
import type { AccountAge } from "@/lib/dmLimits";
import { getDmLimit } from "@/lib/dmLimits";

const CURRENSY_DM_PRIORITY_ORDER = [
  "themixed_hippie",
  "markirecords_",
  "yo_the_artist",
  "610soundshop",
  "prodmyles",
  "doggystylerecordssouth",
  "reuben_turner",
  "mixbyrich",
  "epidemicmusic_papo",
  "drupey_beats",
  "grooovymurphy",
  "demiciavalon",
  "ohso_flashy_photography",
  "chehadetheking",
  "dungaud_",
  "inkedupchampion",
  "v12thehitman",
  "geestacks216",
  "smittybeatz_",
  "meansstreetstudio",
  "djspin88",
  "ikr3wcial",
  "djkimblee",
  "ndm_neodamatrix",
  "dopeboyshake",
  "surfclubinc",
  "recordroommiami",
  "power1047",
];

function normHandle(raw: string) {
  return raw.replace(/^@/, "").toLowerCase().trim();
}

function Skeleton() {
  return (
    <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-xl bg-white/[0.04]" />
        <div className="flex-1">
          <div className="h-4 bg-white/[0.04] rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2 mb-2" />
          <div className="h-3 bg-white/[0.04] rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-white/[0.04] rounded w-full mb-2" />
      <div className="h-3 bg-white/[0.04] rounded w-5/6 mb-2" />
      <div className="h-3 bg-white/[0.04] rounded w-4/6" />
    </div>
  );
}

export default function ArtistNetworkClient({
  records,
  loading,
  error,
  dmPriorityOrder,
  artistSlug,
  artistName,
}: {
  records: AirtableRecord[];
  loading: boolean;
  error: string | null;
  dmPriorityOrder?: string[];
  artistSlug?: string;
  artistName?: string;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [listeningLink, setListeningLink] = useState("");
  const [producerName, setProducerName] = useState("");

  // Debounce refs for Supabase write-back
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk fetch: dm_status + DM count + account age + profile fields — one round-trip
  type StatusEntry = { status: ContactStatus; ice_breaker?: string };
  const [statusMap, setStatusMap] = useState<Record<string, StatusEntry> | null>(null);
  const [dmSentCount, setDmSentCount] = useState(0);
  const [accountAge, setAccountAge] = useState<AccountAge | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showSession, setShowSession] = useState(false);

  useEffect(() => {
    if (!artistSlug || !supabase) { setStatusMap({}); setDataLoaded(true); return; }
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      // Not signed in — fall back to localStorage only
      const storedName = localStorage.getItem("beatbridge_producer_name") || "";
      const storedLink = localStorage.getItem("beatbridge_listening_link") || "";
      if (storedName) setProducerName(storedName);
      if (storedLink) setListeningLink(storedLink);
      setStatusMap({});
      setDataLoaded(true);
      return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    Promise.all([
      supabase
        .from("dm_status")
        .select("contact_id, status, ice_breaker")
        .eq("user_id", user.id)
        .eq("artist_slug", artistSlug),
      supabase
        .from("dm_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "sent")
        .gte("dm_sent_at", todayStart.toISOString()),
      supabase
        .from("user_profiles")
        .select("instagram_account_age, plan, producer_name, beatstars_url, soundcloud_url, youtube_url")
        .eq("user_id", user.id)
        .single(),
    ])
      .then(([statusRes, countRes, profileRes]) => {
        console.log("dm_status fetch result:", statusRes.data, "error:", statusRes.error);
        console.log("DM activity fetch result:", { count: countRes.count, error: countRes.error });
        const map: Record<string, StatusEntry> = {};
        if (statusRes.data) {
          statusRes.data.forEach((row) => {
            if (row.contact_id) {
              map[row.contact_id] = {
                status: row.status as ContactStatus,
                ice_breaker: row.ice_breaker ?? undefined,
              };
            }
          });
        }
        setStatusMap(map);
        if (countRes.count !== null) setDmSentCount(countRes.count);

        const p = profileRes.data;
        if (p?.instagram_account_age) setAccountAge(p.instagram_account_age as AccountAge);
        if (p?.plan) setUserPlan(p.plan as string);

        // Auto-fill producer name: localStorage wins, then Supabase producer_name
        const storedName = localStorage.getItem("beatbridge_producer_name");
        if (storedName) {
          setProducerName(storedName);
        } else if (p?.producer_name) {
          setProducerName(p.producer_name);
        }

        // Auto-fill listening link: localStorage wins, then beatstars > soundcloud > youtube
        const storedLink = localStorage.getItem("beatbridge_listening_link");
        if (storedLink) {
          setListeningLink(storedLink);
        } else {
          const profileLink = p?.beatstars_url || p?.soundcloud_url || p?.youtube_url || "";
          if (profileLink) setListeningLink(profileLink);
        }
      })
      .catch(() => { setStatusMap({}); })
      .finally(() => setDataLoaded(true));
  }, [isLoaded, isSignedIn, user, artistSlug]);

  function handleProducerNameChange(val: string) {
    setProducerName(val);
    if (val) {
      localStorage.setItem("beatbridge_producer_name", val);
    } else {
      localStorage.removeItem("beatbridge_producer_name");
    }
    // Debounce write-back to Supabase
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    const sbName = supabase;
    if (!isSignedIn || !user || !sbName) return;
    nameDebounceRef.current = setTimeout(() => {
      sbName
        .from("user_profiles")
        .update({ producer_name: val })
        .eq("user_id", user.id)
        .then(({ error }) => { if (error) console.error("Failed to save producer name:", error); });
    }, 1000);
  }

  function handleListeningLinkChange(val: string) {
    setListeningLink(val);
    if (val) {
      localStorage.setItem("beatbridge_listening_link", val);
    } else {
      localStorage.removeItem("beatbridge_listening_link");
    }
    // Debounce write-back to Supabase
    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    const sbLink = supabase;
    if (!isSignedIn || !user || !sbLink) return;
    linkDebounceRef.current = setTimeout(() => {
      sbLink
        .from("user_profiles")
        .update({ beatstars_url: val })
        .eq("user_id", user.id)
        .then(({ error }) => { if (error) console.error("Failed to save listening link:", error); });
    }, 1000);
  }

  // Prop-based callback — no window events needed
  const handleCardStatusChange = useCallback(
    (contactId: string, next: ContactStatus, prev: ContactStatus) => {
      console.log("Status change:", contactId, prev, "->", next);
      if (next === "DM sent" && prev !== "DM sent") {
        setDmSentCount((c) => c + 1);
      } else if (prev === "DM sent" && next !== "DM sent") {
        setDmSentCount((c) => Math.max(0, c - 1));
      }
    },
    []
  );

  // Session callback — updates statusMap and counter when a contact is marked sent
  const handleSessionMarkSent = useCallback((contactId: string) => {
    setStatusMap((prev) => {
      if (!prev) return { [contactId]: { status: "DM sent" as ContactStatus } };
      const existing = prev[contactId] ?? {};
      return { ...prev, [contactId]: { ...existing, status: "DM sent" as ContactStatus } };
    });
    setDmSentCount((c) => c + 1);
  }, []);

  const priorityList = dmPriorityOrder ?? CURRENSY_DM_PRIORITY_ORDER;

  const priorityMap = useMemo(() => {
    const map = new Map<string, number>();
    priorityList.forEach((handle, i) => map.set(normHandle(handle), i + 1));
    return map;
  }, [priorityList]);

  // Derive filter types from actual data
  const filterTypes = useMemo(() => {
    const types = new Set<string>();
    records.forEach((r) => { if (r.profileType) types.add(r.profileType); });
    return ["All", ...Array.from(types).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    const result = records.filter((r) => {
      const matchType =
        activeFilter === "All" || r.profileType === activeFilter;
      const matchSearch =
        !search ||
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.username.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
    result.sort((a, b) => {
      const pa = priorityMap.get(normHandle(a.username)) ?? Infinity;
      const pb = priorityMap.get(normHandle(b.username)) ?? Infinity;
      return pa - pb;
    });
    return result;
  }, [records, activeFilter, search, priorityMap]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: records.length };
    records.forEach((r) => {
      map[r.profileType] = (map[r.profileType] || 0) + 1;
    });
    return map;
  }, [records]);

  // Map record id → original index in Airtable order (used for Pro AI generation limit)
  const originalIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r, i) => map.set(r.id, i));
    return map;
  }, [records]);

  const hasPriorityBadges = !loading && filtered.some((r) => priorityMap.has(normHandle(r.username)));

  return (
    <>
      {/* Producer Name + Listening Link inputs */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={producerName}
            onChange={(e) => handleProducerNameChange(e.target.value)}
            placeholder="Your producer name (e.g. Metro Boomin)"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-colors min-h-[44px]"
          />
          {producerName && (
            <p className="text-xs text-orange-400/70 mt-1.5">
              ✓ [BEATMAKER_NAME] replaced with &quot;{producerName}&quot;
            </p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-2">
            Your Listening Link
          </label>
          <input
            type="url"
            value={listeningLink}
            onChange={(e) => handleListeningLinkChange(e.target.value)}
            placeholder="Paste your SoundCloud, YouTube or BeatStars link..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-colors min-h-[44px]"
          />
          {listeningLink && (
            <p className="text-xs text-orange-400/70 mt-1.5">
              ✓ [YOUR LINK] replaced in all DM templates
            </p>
          )}
        </div>
      </div>
      {/* Profile link */}
      <div className="mb-6 -mt-3 text-right">
        <Link href="/onboarding" className="text-xs text-[#505050] hover:text-orange-400 transition-colors">
          Edit your profile →
        </Link>
      </div>

      {/* DM Session button — signed-in users only, after data loads */}
      {isSignedIn && dataLoaded && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => setShowSession(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200 min-h-[44px]"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Start DM Session
          </button>
          <p className="text-xs text-[#505050]">Auto-copy templates · 5 min cooldowns · safety timers</p>
        </div>
      )}

      {/* Filters + Search */}
      <div className="sticky top-14 z-40 bg-[rgba(8,8,8,0.92)] backdrop-blur-[20px] py-4 mb-8 border-b border-white/[0.05]">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, or keyword..."
            className="w-full sm:max-w-sm bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2.5 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors"
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
                    <span
                      className={`ml-1.5 text-xs ${
                        activeFilter === type ? "text-white/60" : "text-[#505050]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 text-red-400 text-sm">
          Failed to load connections: {error}
        </div>
      )}

      {/* DM Priority Banner */}
      {hasPriorityBadges && (
        <div className="bg-white/[0.02] border border-orange-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">📊</span>
          <p className="text-xs text-[#a0a0a0] leading-relaxed">
            Contacts ranked by{" "}
            <span className="text-orange-400 font-semibold">follower count, lowest first</span>
            {" "}— smaller accounts reply faster. Start with{" "}
            <span className="text-orange-400 font-semibold">DM #1</span> for the highest chance of a response.
          </p>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-[#505050] text-sm mb-6">
          Showing{" "}
          <span className="text-[#a0a0a0] font-medium">{filtered.length}</span>{" "}
          connection{filtered.length !== 1 ? "s" : ""}
          {activeFilter !== "All" && ` · ${activeFilter}`}
          {search && ` · "${search}"`}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading || (isSignedIn && !dataLoaded)
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} />)
          : filtered.map((record, index) => {
              const contactId = artistSlug
                ? `${artistSlug}_${record.username.replace("@", "").toLowerCase()}`
                : undefined;
              const statusEntry = contactId ? statusMap?.[contactId] : undefined;
              return (
                <div
                  key={record.id}
                  style={{
                    animation: "fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
                    animationDelay: `${Math.min(index * 50, 400)}ms`,
                  }}
                >
                  <ConnectionCard
                    record={record}
                    listeningLink={listeningLink}
                    producerName={producerName}
                    dmPriority={priorityMap.get(normHandle(record.username))}
                    artistSlug={artistSlug}
                    artistName={artistName}
                    initialStatus={statusEntry?.status}
                    initialIceBreaker={statusEntry?.ice_breaker}
                    onStatusChange={handleCardStatusChange}
                    userPlan={userPlan}
                    originalIndex={originalIndexMap.get(record.id) ?? 0}
                  />
                </div>
              );
            })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-24 text-[#505050]">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-medium text-lg text-[#a0a0a0]">
            No connections found
          </p>
          <p className="text-sm mt-2">Try a different filter or search term</p>
        </div>
      )}

      {/* Sticky DM safety bar — only for signed-in users */}
      {isSignedIn && (
        <StickyDMBar
          dmSentCount={dmSentCount}
          accountAge={accountAge}
          loaded={dataLoaded}
        />
      )}

      {/* DM Session modal */}
      {showSession && artistSlug && (
        <DMSessionModal
          records={records}
          statusMap={statusMap}
          producerName={producerName}
          listeningLink={listeningLink}
          dmSentCount={dmSentCount}
          dailyLimit={getDmLimit(accountAge)}
          artistSlug={artistSlug}
          onClose={() => setShowSession(false)}
          onMarkSent={handleSessionMarkSent}
        />
      )}
    </>
  );
}
