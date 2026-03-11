"use client";

import { useState, useMemo } from "react";
import type { AirtableRecord } from "@/lib/airtable";
import ConnectionCard from "@/components/ConnectionCard";

const FILTER_TYPES = [
  "All",
  "Beatmaker",
  "Label",
  "Engineer",
  "DJ",
  "Manager",
  "Studio",
  "Journalist",
  "Other",
];

function Skeleton() {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-white/5" />
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
}: {
  records: AirtableRecord[];
  loading: boolean;
  error: string | null;
}) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [listeningLink, setListeningLink] = useState("");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchType =
        activeFilter === "All" || r.profileType === activeFilter;
      const matchSearch =
        !search ||
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.username.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [records, activeFilter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: records.length };
    records.forEach((r) => {
      map[r.profileType] = (map[r.profileType] || 0) + 1;
    });
    return map;
  }, [records]);

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
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/50 focus:bg-[#1f1f1f] transition-colors"
        />
        {listeningLink && (
          <p className="text-xs text-amber-400/70 mt-1.5">
            ✓ [YOUR LINK] replaced in all DM templates
          </p>
        )}
      </div>

      {/* Filters + Search */}
      <div className="sticky top-16 z-40 bg-[#0f0f0f]/95 backdrop-blur-sm py-4 mb-8 border-b border-white/5">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, or keyword..."
            className="w-full sm:max-w-sm bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/50"
          />
          <div className="flex gap-2 flex-wrap">
            {FILTER_TYPES.map((type) => {
              const count = counts[type] || 0;
              if (type !== "All" && !count) return null;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 ${
                    activeFilter === type
                      ? "bg-amber-400 text-black border-amber-400"
                      : "border-white/10 text-gray-400 hover:border-amber-400/40 hover:text-amber-400"
                  }`}
                >
                  {type}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 text-xs ${
                        activeFilter === type ? "text-black/60" : "text-gray-600"
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
