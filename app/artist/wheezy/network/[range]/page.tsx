import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";
import ScoringDisclaimer from "@/components/ScoringDisclaimer";
import DailyWarningBanner from "@/components/DailyWarningBanner";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import type { AirtableRecord } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";

export const revalidate = 0;

const RANGE_CONFIG: Record<
  string,
  { min: number; max: number; label: string; prev?: string; next?: string }
> = {
  "500-5k":  { min: 500,   max: 4999,  label: "500 – 5K",   next: "5k-10k" },
  "5k-10k":  { min: 5000,  max: 9999,  label: "5K – 10K",   prev: "500-5k",  next: "10k-15k" },
  "10k-15k": { min: 10000, max: 14999, label: "10K – 15K",  prev: "5k-10k",  next: "15k-20k" },
  "15k-20k": { min: 15000, max: 19999, label: "15K – 20K",  prev: "10k-15k", next: "20k-25k" },
  "20k-25k": { min: 20000, max: 24999, label: "20K – 25K",  prev: "15k-20k", next: "25k-30k" },
  "25k-30k": { min: 25000, max: 29999, label: "25K – 30K",  prev: "20k-25k", next: "30k-35k" },
  "30k-35k": { min: 30000, max: 34999, label: "30K – 35K",  prev: "25k-30k", next: "35k-40k" },
  "35k-40k": { min: 35000, max: 39999, label: "35K – 40K",  prev: "30k-35k", next: "40k-50k" },
  "40k-50k": { min: 40000, max: 50000, label: "40K – 50K",  prev: "35k-40k" },
};

const ALL_RANGES = Object.entries(RANGE_CONFIG).map(([slug, cfg]) => ({
  slug,
  label: cfg.label,
}));

export default async function WheezyNetworkRange({
  params,
}: {
  params: { range: string };
}) {
  const { range } = params;
  const config = RANGE_CONFIG[range];

  if (!config) notFound();

  let records: AirtableRecord[] = [];
  let error: string | null = null;

  try {
    records = await fetchAirtableRecords("Wheezy", {
      min: config.min,
      max: config.max,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const dmPriorityOrder = [...records]
    .sort((a, b) => a.followers - b.followers)
    .map((r) => r.username);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-10 flex-wrap">
          <Link
            href="/artists"
            className="text-gray-500 hover:text-orange-500 transition-colors"
          >
            All Artists
          </Link>
          <span className="text-gray-600">›</span>
          <Link
            href="/artist/wheezy"
            className="text-gray-500 hover:text-orange-500 transition-colors"
          >
            Wheezy
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-[#a0a0a0]">{config.label} followers</span>
        </div>

        {/* Artist header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/wheezy.jpg"
              alt="Wheezy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-1">
              Wheezy · Full Network
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-1">
              {config.label}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
                followers
              </span>
            </h1>
            <p className="text-[#a0a0a0] text-sm">
              Contacts following Wheezy with {config.label} followers
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">
              {records.length}
            </p>
            <p className="text-gray-500 text-xs mt-1">Contacts in range</p>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">💡</span>
          <p className="text-sm text-[#a0a0a0] leading-relaxed">
            <span className="text-orange-400 font-semibold">
              Smaller accounts = higher response rate.
            </span>{" "}
            Start with the 500–5K range for best results.
          </p>
        </div>

        {/* Range navigation pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {ALL_RANGES.map(({ slug, label }) => (
            <Link
              key={slug}
              href={`/artist/wheezy/network/${slug}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150 tracking-[0.05em] uppercase min-h-[36px] flex items-center ${
                slug === range
                  ? "bg-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                  : "border-white/[0.08] text-[#a0a0a0] hover:border-orange-500/30 hover:text-orange-400"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <DailyWarningBanner />
        <InstagramSafetyGuide />
        <ScoringDisclaimer />

        {/* Connection grid */}
        <ArtistNetworkClient
          records={records}
          loading={false}
          error={error}
          dmPriorityOrder={dmPriorityOrder}
          artistSlug="wheezy"
        />

        {/* Prev / Next */}
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-[#1f1f1f] pt-8">
          {config.prev ? (
            <Link
              href={`/artist/wheezy/network/${config.prev}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors"
            >
              ← {RANGE_CONFIG[config.prev].label}
            </Link>
          ) : (
            <div />
          )}
          {config.next ? (
            <Link
              href={`/artist/wheezy/network/${config.next}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors"
            >
              {RANGE_CONFIG[config.next].label} →
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Telegram */}
        <div className="mt-10 border-t border-[#1f1f1f] pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            Got a reply? Share it with the community
          </p>
          <TelegramButton label="Join Telegram →" />
        </div>
      </div>
    </div>
  );
}
