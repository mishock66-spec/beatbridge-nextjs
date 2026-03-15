"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { AirtableRecord } from "@/lib/airtable";

interface ArtistData {
  slug: string;
  name: string;
  photo: string;
  records: AirtableRecord[];
}

function storageKey(artistSlug: string, username: string) {
  return `beatbridge_contacted_${artistSlug}_${username.replace("@", "")}`;
}

function useContactedState(artists: ArtistData[]) {
  const [contacted, setContacted] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const all: Record<string, boolean> = {};
    artists.forEach((artist) => {
      artist.records.forEach((record) => {
        const key = storageKey(artist.slug, record.username);
        all[key] = localStorage.getItem(key) === "true";
      });
    });
    setContacted(all);
    setMounted(true);
  }, [artists]);

  function toggle(artistSlug: string, username: string) {
    const key = storageKey(artistSlug, username);
    const newVal = !contacted[key];
    localStorage.setItem(key, String(newVal));
    setContacted((prev) => ({ ...prev, [key]: newVal }));
  }

  return { contacted, toggle, mounted };
}

export default function DashboardClient({ artists }: { artists: ArtistData[] }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { contacted, toggle, mounted } = useContactedState(artists);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-6">🔒</p>
          <h1 className="text-2xl font-black mb-3">Sign in to view your dashboard</h1>
          <p className="text-gray-400 mb-8 text-sm max-w-xs mx-auto">
            Track your outreach progress across all artists and never lose your place.
          </p>
          <Link
            href="/sign-in"
            className="bg-orange-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-400 transition-colors text-sm"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    user.firstName ??
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "Producer";

  const totalAll = artists.reduce((s, a) => s + a.records.length, 0);
  const doneAll = artists.reduce(
    (s, a) =>
      s + a.records.filter((r) => contacted[storageKey(a.slug, r.username)]).length,
    0
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
          <h1 className="text-3xl font-black">{displayName}</h1>
          <p className="text-gray-500 text-sm mt-2">
            {mounted ? (
              <>
                <span className="text-orange-500 font-semibold">{doneAll}</span>
                <span> of {totalAll} contacts reached</span>
              </>
            ) : (
              "Your outreach progress"
            )}
          </p>
        </div>

        {/* Artist sections */}
        {artists.map((artist) => {
          const total = artist.records.length;
          const done = mounted
            ? artist.records.filter((r) =>
                contacted[storageKey(artist.slug, r.username)]
              ).length
            : 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div key={artist.slug} className="mb-10">
              {/* Artist summary card */}
              <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 mb-3">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1f1f1f] flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artist.photo}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-black truncate">{artist.name}</h2>
                      <span className="text-sm flex-shrink-0">
                        <span className="text-orange-500 font-bold">{done}</span>
                        <span className="text-gray-600"> / {total}</span>
                        <span className="text-gray-500 ml-1 text-xs">DMs sent</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-600">{pct}% complete</span>
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    View network →
                  </Link>
                </div>
              </div>

              {/* Contact checklist */}
              <div className="space-y-1.5">
                {artist.records.map((record) => {
                  const key = storageKey(artist.slug, record.username);
                  const isDone = mounted ? (contacted[key] ?? false) : false;
                  return (
                    <label
                      key={record.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isDone
                          ? "bg-orange-500/5 border-orange-500/20"
                          : "bg-[#111111] border-[#1f1f1f] hover:border-orange-500/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggle(artist.slug, record.username)}
                        className="accent-orange-500 w-4 h-4 flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate transition-colors ${
                            isDone ? "text-gray-600 line-through" : "text-white"
                          }`}
                        >
                          {record.fullName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          @{record.username.replace("@", "")}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 flex-shrink-0">
                        {record.profileType}
                      </span>
                    </label>
                  );
                })}

                {artist.records.length === 0 && (
                  <p className="text-sm text-gray-600 px-4 py-3">
                    No contacts loaded.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
