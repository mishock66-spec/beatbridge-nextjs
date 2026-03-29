"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import type { AirtableRecord } from "@/lib/airtable";
import ConnectionCard, { type ContactStatus } from "@/components/ConnectionCard";
import StickyDMBar from "@/components/StickyDMBar";
import { supabase } from "@/lib/supabase";
import type { AccountAge } from "@/lib/dmLimits";

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

  // Bulk fetch: dm_status map + today's DM count + account age — one round-trip
  type StatusEntry = { status: ContactStatus; ice_breaker?: string };
  const [statusMap, setStatusMap] = useState<Record<string, StatusEntry> | null>(null);
  const [dmSentCount, setDmSentCount] = useState(0);
  const [accountAge, setAccountAge] = useState<AccountAge | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!artistSlug || !supabase) { setStatusMap({}); setDataLoaded(true); return; }
    if (!isLoaded) return; // Wait for Clerk to finish loading
    if (!isSignedIn || !user) { setStatusMap({}); setDataLoaded(true); return; }

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
        .select("instagram_account_age")
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
        if (profileRes.data?.instagram_account_age) {
          setAccountAge(profileRes.data.instagram_account_age as AccountAge);
        }
      })
      .catch(() => { setStatusMap({}); })
      .finally(() => setDataLoaded(true));
  }, [isLoaded, isSignedIn, user, artistSlug]);

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

  const hasPriorityBadges = !loading && filtered.some((r) => priorityMap.has(normHandle(r.username)));

  return (
    <>
      {/* Listening Link Input */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-[#606060] uppercase tracking-[0.1em] mb-2">
          Your Listening Link
        </label>
        <input
          type="url"
          value={listeningLink}
          onChange={(e) => setListeningLink(e.target.value)}
          placeholder="Paste your SoundCloud, YouTube or BeatStars link..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-colors"
        />
        {listeningLink && (
          <p className="text-xs text-orange-400/70 mt-1.5">
            ✓ [YOUR LINK] replaced in all DM templates
          </p>
        )}
      </div>

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
                    dmPriority={priorityMap.get(normHandle(record.username))}
                    artistSlug={artistSlug}
                    artistName={artistName}
                    initialStatus={statusEntry?.status}
                    initialIceBreaker={statusEntry?.ice_breaker}
                    onStatusChange={handleCardStatusChange}
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
    </>
  );
}
