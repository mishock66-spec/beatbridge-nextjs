"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MutualContact } from "@/app/api/mutual-contacts/route";

function formatFollowers(n: number) {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function MutualContactsWidget() {
  const [contacts, setContacts] = useState<MutualContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mutual-contacts")
      .then((r) => r.json())
      .then((d) => setContacts((d.contacts ?? []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">Mutual Contacts</h2>
          <p className="text-xs text-[#505050] mt-0.5">People trusted by multiple artists — highest reply priority</p>
        </div>
        <Link
          href="/mutual-contacts"
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0"
        >
          See all →
        </Link>
      </div>

      <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-[#505050] text-sm p-6">No mutual contacts found.</p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {contacts.map((c) => (
              <div key={c.username} className="flex items-center gap-3 px-5 py-3.5">
                {/* Username + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://instagram.com/${c.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      @{c.username}
                    </a>
                    {c.artistCount >= 3 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                        Highest Priority
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {c.artists.map((artist) => (
                      <span
                        key={artist}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400/80 border border-orange-500/20"
                      >
                        {artist}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: type + followers */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[#606060]">{c.profileType}</p>
                  {c.followers > 0 && (
                    <p className="text-xs text-[#404040] mt-0.5">{formatFollowers(c.followers)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
