"use client";

import { useState, useMemo } from "react";
import type { AirtableRecord } from "@/lib/airtable";
import ConnectionCard from "@/components/ConnectionCard";

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
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-16 h-16 rounded-xl bg-white/5" />
        <div className="flex-1">
          <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/5 rounded w-1/2 mb-2" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-white/5 rounded w-full mb-2" />
      <div className="h-3 bg-white/5 rounded w-5/6 mb-2" />
      <div className="h-3 bg-white/5 rounded w-4/6" />
    </div>
  );
}

export default function ArtistNetworkClient({
  records,
  loading,
  error,
  dmPriorityOrder,
}: {
  records: AirtableRecord[];
  loading: boolean;
  error: string | null;
  dmPriorityOrder?: string[];
}) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [listeningLink, setListeningLink] = useState("");

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
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Your Listening Link
        </label>
        <input
          type="url"
          value={listeningLink}
          onChange={(e) => setListeningLink(e.target.value)}
          placeholder="Paste your SoundCloud, YouTube or BeatStars link..."
          className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-[#161616] transition-colors"
        />
        {listeningLink && (
          <p className="text-xs text-orange-400/70 mt-1.5">
            ✓ [YOUR LINK] replaced in all DM templates
          </p>
        )}
      </div>

      {/* Filters + Search */}
      <div className="sticky top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm py-4 mb-8 border-b border-[#1f1f1f]">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, or keyword..."
            className="w-full sm:max-w-sm bg-[#111111] border border-[#1f1f1f] rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
          />
          <div className="flex gap-2 flex-wrap">
            {filterTypes.map((type) => {
              const count = counts[type] || 0;
              if (type !== "All" && !count) return null;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 ${
                    activeFilter === type
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-[#1f1f1f] text-gray-400 hover:border-orange-500/40 hover:text-orange-400"
                  }`}
                >
                  {type}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 text-xs ${
                        activeFilter === type ? "text-white/60" : "text-gray-600"
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 text-red-400 text-sm">
          Failed to load connections: {error}
        </div>
      )}

      {/* DM Priority Banner */}
      {hasPriorityBadges && (
        <div className="bg-gray-900 border border-orange-500/30 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">📊</span>
          <p className="text-xs text-gray-400 leading-relaxed">
            Contacts ranked by{" "}
            <span className="text-orange-400 font-semibold">follower count, lowest first</span>
            {" "}— smaller accounts reply faster. Start with{" "}
            <span className="text-orange-400 font-semibold">DM #1</span> for the highest chance of a response.
          </p>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-gray-600 text-sm mb-6">
          Showing{" "}
          <span className="text-gray-400 font-semibold">{filtered.length}</span>{" "}
          connection{filtered.length !== 1 ? "s" : ""}
          {activeFilter !== "All" && ` · ${activeFilter}`}
          {search && ` · "${search}"`}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} />)
          : filtered.map((record) => (
              <ConnectionCard
                key={record.id}
                record={record}
                listeningLink={listeningLink}
                dmPriority={priorityMap.get(normHandle(record.username))}
              />
            ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-24 text-gray-600">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-lg text-gray-400">
            No connections found
          </p>
          <p className="text-sm mt-2">Try a different filter or search term</p>
        </div>
      )}
    </>
  );
}
