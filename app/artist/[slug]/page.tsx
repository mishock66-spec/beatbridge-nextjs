import Link from "next/link";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";
import type { AirtableRecord } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";

export const revalidate = 0;

const ARTIST_META: Record<
  string,
  {
    name: string;
    subtitle: string;
    igHandle: string | null;
    bio: string;
    photo?: string;
    suiviPar: string | string[];
  }
> = {
  currensy: {
    name: "Curren$y",
    subtitle: "Jet Life Recordings · New Orleans, LA",
    igHandle: "spitta_andretti",
    photo: "/images/currensy.png",
    suiviPar: ["Curren$y", "CurrenSy"],
    bio: "Prolific New Orleans rapper and founder of Jet Life Recordings. Spitta has cultivated one of the most loyal and talented networks in independent hip-hop — from beatmakers to A&R reps to engineers who all share his laid-back, smoke-filled aesthetic.",
  },
  "harry-fraud": {
    name: "Harry Fraud",
    subtitle: "New York City · Cinematic Boom-Bap",
    igHandle: "harryfraud",
    photo: "/images/harryfraud.jpg",
    suiviPar: "Harry Fraud",
    bio: "New York's sonic architect — cinematic boom-bap, dark jazz, grimy street rap. The mind behind Smoke DZA, Rome Streetz, Crimeapple, Benny the Butcher.",
  },
  wheezy: {
    name: "Wheezy",
    subtitle: "Atlanta · Trap · Certified Trapper",
    igHandle: "wheezyouttahere",
    photo: "/images/wheezy.jpg",
    suiviPar: "Wheezy",
    bio: "Atlanta's most in-demand producer. The architect behind Future, Gunna, Young Thug, and Lil Baby's biggest records. Co-founder of Certified Trapper, Wheezy's sound defines modern Atlanta trap.",
  },
};

export default async function ArtistNetwork({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  if (!ARTIST_META[slug]) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-6">🔒</p>
          <h1 className="text-3xl font-black mb-3">Pro Artist</h1>
          <p className="text-gray-400 mb-8">
            This artist&apos;s network is available with a Pro subscription.
          </p>
          <Link
            href="/artists"
            className="text-orange-500 font-semibold hover:text-orange-400"
          >
            ← Back to artists
          </Link>
        </div>
      </div>
    );
  }

  const meta = ARTIST_META[slug];

  let records: AirtableRecord[] = [];
  let error: string | null = null;
  let dmPriorityOrder: string[] | undefined;

  try {
    records = await fetchAirtableRecords(meta.suiviPar);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  // Derive dmPriorityOrder from fetched records (followers asc) for badge ordering
  if (records.length > 0) {
    dmPriorityOrder = [...records]
      .sort((a, b) => a.followers - b.followers)
      .map((r) => r.username);
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Back */}
        <Link
          href="/artists"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm mb-10 transition-colors"
        >
          ← All Artists
        </Link>

        {/* Artist Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-12">
          <div className="w-32 h-32 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {meta.photo || meta.igHandle ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.photo ?? `https://unavatar.io/instagram/${meta.igHandle}`}
                alt={meta.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-500">
                {meta.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 text-green-400 text-xs font-semibold mb-3">
              FREE
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-1">
              {meta.name}
            </h1>
            <p className="text-gray-500 text-sm mb-3">{meta.subtitle}</p>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              {meta.bio}
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">
              {records.length}
            </p>
            <p className="text-gray-500 text-xs mt-1">Connections mapped</p>
          </div>
        </div>

        {/* Client component handles listening link, filter, search, and grid */}
        <ArtistNetworkClient
          records={records}
          loading={false}
          error={error}
          dmPriorityOrder={dmPriorityOrder}
          artistSlug={slug}
        />

        {/* Explore Full Network — Wheezy only */}
        {slug === "wheezy" && (
          <div className="mt-16 border-t border-[#1f1f1f] pt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-light tracking-[0.02em] mb-2">
                Explore Full Network
              </h2>
              <p className="text-[#a0a0a0] text-sm">
                Browse all contacts by follower range.{" "}
                <span className="text-orange-400">Smaller accounts reply faster</span> — start low.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { slug: "500-5k",  label: "500 – 5K",   desc: "Best response rate" },
                { slug: "5k-10k",  label: "5K – 10K",   desc: "High engagement" },
                { slug: "10k-15k", label: "10K – 15K",  desc: "Mid-tier reach" },
                { slug: "15k-20k", label: "15K – 20K",  desc: "Mid-tier reach" },
                { slug: "20k-25k", label: "20K – 25K",  desc: "Growing accounts" },
                { slug: "25k-30k", label: "25K – 30K",  desc: "Growing accounts" },
                { slug: "30k-35k", label: "30K – 35K",  desc: "Established" },
                { slug: "35k-40k", label: "35K – 40K",  desc: "Established" },
                { slug: "40k-50k", label: "40K – 50K",  desc: "Large following" },
              ].map(({ slug: rangeSlug, label, desc }) => (
                <Link
                  key={rangeSlug}
                  href={`/artist/wheezy/network/${rangeSlug}`}
                  className="bg-white/[0.025] border border-white/[0.08] rounded-xl p-4 hover:border-orange-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 transition-all duration-200 group text-center"
                >
                  <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-[#505050] mt-1">{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Telegram community banner */}
        <div className="mt-16 border-t border-[#1f1f1f] pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            🎹 Got a reply? Share it with the community
          </p>
          <TelegramButton label="Join Telegram →" />
        </div>
      </div>
    </div>
  );
}
