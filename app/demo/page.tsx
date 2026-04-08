import Link from "next/link";
import { fetchAirtableRecords } from "@/lib/airtable";
import type { AirtableRecord } from "@/lib/airtable";
import DemoNetworkClient from "@/components/DemoNetworkClient";

export const revalidate = 0;

export const metadata = {
  title: "Live Demo — BeatBridge",
  description: "Browse real hip-hop contacts, DM templates, and follower data — no account needed.",
};

export const DEMO_ARTISTS = [
  { name: "Wheezy", slug: "wheezy", airtableFilter: "Wheezy", photo: "/images/wheezy.jpg", subtitle: "Atlanta · Trap" },
  { name: "Metro Boomin", slug: "metro-boomin", airtableFilter: "Metro Boomin", photo: "/images/metro-boomin.jpg", subtitle: "Boominati · Trap" },
  { name: "Southside", slug: "southside", airtableFilter: "Southside", photo: "/images/southside.jpg", subtitle: "808 Mafia · Trap" },
  { name: "Juke Wong", slug: "juke-wong", airtableFilter: "Juke Wong", photo: "/images/juke-wong.jpg", subtitle: "Melodic Trap" },
  { name: "Curren$y", slug: "currensy", airtableFilter: ["Curren$y", "CurrenSy"], photo: "/images/currensy.png", subtitle: "Jet Life" },
  { name: "Harry Fraud", slug: "harry-fraud", airtableFilter: "Harry Fraud", photo: "/images/harryfraud.jpg", subtitle: "NYC · Boom-Bap" },
];

export const DEMO_RANGES = [
  { slug: "500-5k", label: "500 – 5K", min: 500, max: 4999 },
  { slug: "5k-10k", label: "5K – 10K", min: 5000, max: 9999 },
  { slug: "10k-15k", label: "10K – 15K", min: 10000, max: 14999 },
  { slug: "15k-20k", label: "15K – 20K", min: 15000, max: 19999 },
  { slug: "20k-25k", label: "20K – 25K", min: 20000, max: 24999 },
  { slug: "25k-30k", label: "25K – 30K", min: 25000, max: 29999 },
];

export default async function DemoPage({
  searchParams,
}: {
  searchParams: { artist?: string; range?: string };
}) {
  const artistSlug = searchParams?.artist || "wheezy";
  const rangeSlug = searchParams?.range || "500-5k";

  const artist = DEMO_ARTISTS.find((a) => a.slug === artistSlug) ?? DEMO_ARTISTS[0];
  const range = DEMO_RANGES.find((r) => r.slug === rangeSlug) ?? DEMO_RANGES[0];

  let records: AirtableRecord[] = [];
  try {
    const raw = await fetchAirtableRecords(
      artist.airtableFilter as string | string[],
      { min: range.min, max: range.max }
    );
    // Deduplicate by Instagram username — some contacts appear twice in Airtable
    const seen = new Set<string>();
    records = raw.filter((r) => {
      const handle = r.username.replace("@", "").toLowerCase();
      if (!handle || seen.has(handle)) return false;
      seen.add(handle);
      return true;
    });
  } catch {
    // silently fail — DemoNetworkClient handles empty state
  }

  return (
    <div className="min-h-screen">
      {/* Demo Banner */}
      <div className="bg-orange-500/[0.08] border-b border-orange-500/20 px-4 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[#a0a0a0] text-center sm:text-left">
            <span className="text-orange-300 font-medium">👀 Live demo — full access, no account needed.</span>
            {" "}Sign up to save your progress across sessions.
          </p>
          <Link
            href="/sign-up"
            className="flex-shrink-0 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            Create free account →
          </Link>
        </div>
      </div>

      <DemoNetworkClient
        records={records}
        artists={DEMO_ARTISTS}
        ranges={DEMO_RANGES}
        currentArtistSlug={artist.slug}
        currentRangeSlug={range.slug}
        artistName={artist.name}
        artistPhoto={artist.photo}
        artistSubtitle={artist.subtitle}
        rangeLabel={range.label}
      />
    </div>
  );
}
