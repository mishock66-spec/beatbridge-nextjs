import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";
import ScoringDisclaimer from "@/components/ScoringDisclaimer";
import DailyWarningBanner from "@/components/DailyWarningBanner";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import type { AirtableRecord } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";
import AuthGateClient from "@/components/AuthGateClient";

export const revalidate = 0;

const PAGE_SIZE = 50;

const DEFAULT_TEMPLATE =
  "Hey, caught you in Metro Boomin's circle — got some hard trap beats I've been sitting on, think it could work?";

const RANGE_CONFIG: Record<
  string,
  { min: number; max: number; label: string; prev?: string; next?: string }
> = {
  "0-500":   { min: 0,     max: 499,   label: "0 – 500",    next: "500-5k" },
  "500-5k":  { min: 500,   max: 4999,  label: "500 – 5K",   prev: "0-500",   next: "5k-10k" },
  "5k-10k":  { min: 5000,  max: 9999,  label: "5K – 10K",   prev: "500-5k",  next: "10k-20k" },
  "10k-20k": { min: 10000, max: 19999, label: "10K – 20K",  prev: "5k-10k",  next: "20k-30k" },
  "20k-30k": { min: 20000, max: 29999, label: "20K – 30K",  prev: "10k-20k", next: "30k-40k" },
  "30k-40k": { min: 30000, max: 39999, label: "30K – 40K",  prev: "20k-30k", next: "40k-50k" },
  "40k-50k": { min: 40000, max: 50000, label: "40K – 50K",  prev: "30k-40k" },
};

const ALL_RANGES = Object.entries(RANGE_CONFIG).map(([slug, cfg]) => ({
  slug,
  label: cfg.label,
}));

const IS_NANO_RANGE = new Set(["0-500"]);

export default async function MetroBoominRangePage({
  params,
  searchParams,
}: {
  params: { range: string };
  searchParams: { page?: string };
}) {
  const { range } = params;
  const config = RANGE_CONFIG[range];

  if (!config) notFound();

  const currentPage = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  let allRecords: AirtableRecord[] = [];
  let error: string | null = null;

  try {
    const raw = await fetchAirtableRecords("Metro Boomin", {
      min: config.min,
      max: config.max,
    });
    allRecords = raw.map((r) => ({
      ...r,
      template: r.template || DEFAULT_TEMPLATE,
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const totalPages = Math.max(1, Math.ceil(allRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const records = allRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const dmPriorityOrder = [...records]
    .sort((a, b) => a.followers - b.followers)
    .map((r) => r.username);

  const pageUrl = (p: number) =>
    p === 1 ? `/artist/metro-boomin/${range}` : `/artist/metro-boomin/${range}?page=${p}`;

  return (
    <AuthGateClient redirectUrl={`/artist/metro-boomin/${range}`}>
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-10 flex-wrap">
          <Link href="/artists" className="text-gray-500 hover:text-orange-500 transition-colors">
            All Artists
          </Link>
          <span className="text-gray-600">›</span>
          <Link href="/artist/metro-boomin" className="text-gray-500 hover:text-orange-500 transition-colors">
            Metro Boomin
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-[#a0a0a0]">{config.label} followers</span>
        </div>

        {/* Artist header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/metro-boomin.jpg" alt="Metro Boomin" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-1">
              Metro Boomin · Full Network
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-1">
              {config.label}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
                followers
              </span>
            </h1>
            <p className="text-[#a0a0a0] text-sm">
              Contacts following Metro Boomin with {config.label} followers
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">{allRecords.length}</p>
            <p className="text-gray-500 text-xs mt-1">Total in range</p>
          </div>
        </div>

        {/* Tip banner */}
        {IS_NANO_RANGE.has(range) ? (
          <div className="bg-orange-500/[0.10] border border-orange-500/30 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
            <span className="text-base leading-none mt-0.5">⚡</span>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              <span className="text-orange-400 font-semibold">
                Under 500 followers — these are the most reachable people in Metro Boomin&apos;s network.
              </span>{" "}
              Expect the highest reply rates here.
            </p>
          </div>
        ) : (
          <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
            <span className="text-base leading-none mt-0.5">💡</span>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              <span className="text-orange-400 font-semibold">
                Smaller accounts = higher response rate.
              </span>{" "}
              Start with the 500–5K range for best results.
            </p>
          </div>
        )}

        {/* Range navigation pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {ALL_RANGES.map(({ slug, label }) => (
            <Link
              key={slug}
              href={`/artist/metro-boomin/${slug}`}
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

        {/* Page indicator */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#606060]">
              Showing{" "}
              <span className="text-[#a0a0a0] font-medium">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, allRecords.length)}
              </span>{" "}
              of{" "}
              <span className="text-[#a0a0a0] font-medium">{allRecords.length}</span> contacts
            </p>
            <p className="text-sm text-[#606060]">
              Page <span className="text-[#a0a0a0] font-medium">{safePage}</span> of{" "}
              <span className="text-[#a0a0a0] font-medium">{totalPages}</span>
            </p>
          </div>
        )}

        <ArtistNetworkClient
          records={records}
          loading={false}
          error={error}
          dmPriorityOrder={dmPriorityOrder}
          artistSlug="metro-boomin"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-[#1f1f1f] pt-8">
            {safePage > 1 ? (
              <Link href={pageUrl(safePage - 1)} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-orange-500 transition-colors px-4 py-2 rounded-lg border border-white/[0.08] hover:border-orange-500/30">
                ← Previous
              </Link>
            ) : <div />}
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="text-[#404040] px-1 text-sm">…</span>
                  ) : (
                    <Link key={p} href={pageUrl(p as number)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${p === safePage ? "bg-orange-500 text-white" : "text-[#606060] hover:text-orange-400 border border-white/[0.06] hover:border-orange-500/30"}`}>
                      {p}
                    </Link>
                  )
                )}
            </div>
            {safePage < totalPages ? (
              <Link href={pageUrl(safePage + 1)} className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-orange-500 transition-colors px-4 py-2 rounded-lg border border-white/[0.08] hover:border-orange-500/30">
                Next →
              </Link>
            ) : <div />}
          </div>
        )}

        {/* Prev / Next range navigation */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#1f1f1f] pt-8">
          {config.prev ? (
            <Link href={`/artist/metro-boomin/${config.prev}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
              ← {RANGE_CONFIG[config.prev].label}
            </Link>
          ) : <div />}
          {config.next ? (
            <Link href={`/artist/metro-boomin/${config.next}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
              {RANGE_CONFIG[config.next].label} →
            </Link>
          ) : <div />}
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/artist/metro-boomin" className="text-sm text-gray-500 hover:text-orange-500 transition-colors">
            ← Back to Metro Boomin
          </Link>
        </div>

        <div className="mt-10 border-t border-[#1f1f1f] pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">Got a reply? Share it with the community</p>
          <TelegramButton label="Join Telegram →" />
        </div>
      </div>
    </div>
    </AuthGateClient>
  );
}
