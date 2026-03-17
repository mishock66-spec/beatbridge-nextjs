"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { AirtableRecord } from "@/lib/airtable";
import {
  type ContactStatus,
  CONTACT_STATUSES,
  STATUS_STYLE,
  statusStorageKey,
} from "@/components/ConnectionCard";

interface ArtistData {
  slug: string;
  name: string;
  photo: string;
  records: AirtableRecord[];
}

interface ContactWithMeta {
  record: AirtableRecord;
  artistSlug: string;
  artistName: string;
  status: ContactStatus;
}

function useStatusState(artists: ArtistData[]) {
  const [statuses, setStatuses] = useState<Record<string, ContactStatus>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const all: Record<string, ContactStatus> = {};
    artists.forEach((artist) => {
      artist.records.forEach((record) => {
        const key = statusStorageKey(artist.slug, record.username);
        const stored = localStorage.getItem(key) as ContactStatus | null;
        all[key] = stored && CONTACT_STATUSES.includes(stored) ? stored : "To contact";
      });
    });
    setStatuses(all);
    setMounted(true);
  }, [artists]);

  return { statuses, mounted };
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-3xl font-black" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

export default function DashboardClient({ artists }: { artists: ArtistData[] }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { statuses, mounted } = useStatusState(artists);

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

  // Aggregate all contacts with their status
  const allContacts: ContactWithMeta[] = artists.flatMap((artist) =>
    artist.records.map((record) => {
      const key = statusStorageKey(artist.slug, record.username);
      return {
        record,
        artistSlug: artist.slug,
        artistName: artist.name,
        status: mounted ? (statuses[key] ?? "To contact") : "To contact",
      };
    })
  );

  const totalAll = allContacts.length;
  const totalDMsSent = allContacts.filter(
    (c) => c.status === "DM sent" || c.status === "Replied"
  ).length;
  const totalReplied = allContacts.filter((c) => c.status === "Replied").length;
  const responseRate =
    totalDMsSent > 0 ? Math.round((totalReplied / totalDMsSent) * 100) : 0;

  // Group contacts by status (excluding "To contact" which is the default noise)
  const grouped = CONTACT_STATUSES.reduce<Record<ContactStatus, ContactWithMeta[]>>(
    (acc, s) => {
      acc[s] = allContacts.filter((c) => c.status === s);
      return acc;
    },
    {} as Record<ContactStatus, ContactWithMeta[]>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gray-500 text-sm mb-1">Welcome back,</p>
          <h1 className="text-3xl font-black">{displayName}</h1>
          <p className="text-gray-500 text-sm mt-2">Your outreach dashboard</p>
        </div>

        {/* Stats row */}
        {mounted && (
          <div className="grid grid-cols-3 gap-3 mb-10">
            <StatCard
              label="DMs Sent"
              value={totalDMsSent}
              sub={`out of ${totalAll} contacts`}
              accent="#f97316"
            />
            <StatCard
              label="Replies"
              value={totalReplied}
              sub={totalDMsSent > 0 ? `from ${totalDMsSent} DMs sent` : "no DMs sent yet"}
              accent="#22c55e"
            />
            <StatCard
              label="Response Rate"
              value={totalDMsSent > 0 ? `${responseRate}%` : "—"}
              sub={totalDMsSent > 0 ? "replies ÷ DMs sent" : "send some DMs first"}
              accent={responseRate >= 20 ? "#22c55e" : responseRate > 0 ? "#f97316" : undefined}
            />
          </div>
        )}

        {/* Artist sections */}
        {artists.map((artist) => {
          const total = artist.records.length;
          const dmSentOrReplied = mounted
            ? artist.records.filter((r) => {
                const key = statusStorageKey(artist.slug, r.username);
                const s = statuses[key] ?? "To contact";
                return s === "DM sent" || s === "Replied";
              }).length
            : 0;
          const pct = total > 0 ? Math.round((dmSentOrReplied / total) * 100) : 0;

          return (
            <div key={artist.slug} className="mb-10">
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
                        <span className="text-orange-500 font-bold">{dmSentOrReplied}</span>
                        <span className="text-gray-600"> / {total}</span>
                        <span className="text-gray-500 ml-1 text-xs">contacted</span>
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
                  <span className="text-xs text-gray-600">{pct}% contacted (DM sent or replied)</span>
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    View network →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {/* All contacts grouped by status */}
        <div className="mt-4">
          <h2 className="text-lg font-black mb-4">All Contacts by Status</h2>
          {CONTACT_STATUSES.filter((s) => grouped[s].length > 0).map((s) => {
            const style = STATUS_STYLE[s];
            return (
              <div key={s} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: style.dot }}
                  />
                  <span className="text-sm font-semibold" style={{ color: style.pill.color as string }}>
                    {s}
                  </span>
                  <span className="text-xs text-gray-600">({grouped[s].length})</span>
                </div>
                <div className="space-y-1.5">
                  {grouped[s].map((c) => (
                    <div
                      key={`${c.artistSlug}-${c.record.id}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#111111] border-[#1f1f1f]"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: style.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-white">
                          {c.record.fullName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          @{c.record.username.replace("@", "")} · {c.artistName}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 flex-shrink-0">
                        {c.record.profileType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {mounted && allContacts.every((c) => c.status === "To contact") && (
            <p className="text-sm text-gray-600 px-4 py-6 text-center">
              No contacts tracked yet — start sending DMs and update statuses on each card.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
