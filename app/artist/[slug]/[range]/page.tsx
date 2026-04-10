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
import PremiumGateClient from "@/components/PremiumGateClient";
import { getArtist, getArtistRange } from "@/lib/artists.config";

export const revalidate = 0;

const PAGE_SIZE = 50;

export default async function ArtistRangePage({
  params,
  searchParams,
}: {
  params: { slug: string; range: string };
  searchParams: { page?: string };
}) {
  const { slug, range: rangeSlug } = params;

  const artist = getArtist(slug);
  if (!artist || artist.ranges.length === 0) notFound();

  const rangeConfig = getArtistRange(artist, rangeSlug);
  if (!rangeConfig) notFound();

  const isPremiumLocked = rangeConfig.premium === true;
  const currentPage = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  let allRecords: AirtableRecord[] = [];
  let error: string | null = null;

  try {
    const raw = await fetchAirtableRecords(artist.airtableFilter, {
      min: rangeConfig.min,
      max: rangeConfig.max,
    });
    allRecords = raw.map((r) => ({
      ...r,
      template: r.template || artist.defaultTemplate,
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
    p === 1
      ? `/artist/${slug}/${rangeSlug}`
      : `/artist/${slug}/${rangeSlug}?page=${p}`;

  const previewContacts = allRecords.slice(0, 3).map((r) => ({
    username: r.username,
    fullName: r.fullName,
    followers: r.followers,
    profileType: r.profileType,
  }));

  const isNanoRange = rangeSlug === "0-500";

  const paginationBar = totalPages > 1 ? (
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
  ) : null;

  return (
    <AuthGateClient redirectUrl={`/artist/${slug}/${rangeSlug}`}>
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-10 flex-wrap">
          <Link href="/artists" className="text-gray-500 hover:text-orange-500 transition-colors">
            All Artists
          </Link>
          <span className="text-gray-600">›</span>
          <Link href={`/artist/${slug}`} className="text-gray-500 hover:text-orange-500 transition-colors">
            {artist.name}
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-[#a0a0a0]">{rangeConfig.label} followers</span>
          {isPremiumLocked && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 uppercase tracking-wider ml-1">
              Premium
            </span>
          )}
        </div>

        {/* Artist header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {artist.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.photo} alt={artist.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-1">
              {artist.name} · Full Network
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-1">
              {rangeConfig.label}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
                followers
              </span>
            </h1>
            <p className="text-[#a0a0a0] text-sm">
              Contacts following {artist.name} with {rangeConfig.label} followers
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">{allRecords.length}</p>
            <p className="text-gray-500 text-xs mt-1">Total in range</p>
          </div>
        </div>

        {/* Tip banner */}
        {isNanoRange ? (
          <div className="bg-orange-500/[0.10] border border-orange-500/30 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
            <span className="text-base leading-none mt-0.5">⚡</span>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              <span className="text-orange-400 font-semibold">
                Under 500 followers — these are the most reachable people in {artist.name}&apos;s network.
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
          {artist.ranges.map(({ slug: rs, label, premium }) => (
            <Link
              key={rs}
              href={`/artist/${slug}/${rs}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150 tracking-[0.05em] uppercase min-h-[36px] flex items-center gap-1.5 ${
                rs === rangeSlug
                  ? premium
                    ? "bg-purple-500/80 text-white border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "bg-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                  : premium
                  ? "border-purple-500/20 text-purple-400/70 hover:border-purple-500/40 hover:text-purple-400"
                  : "border-white/[0.08] text-[#a0a0a0] hover:border-orange-500/30 hover:text-orange-400"
              }`}
            >
              {label}
              {premium && <span className="text-[9px] leading-none">🔒</span>}
            </Link>
          ))}
        </div>

        {isPremiumLocked ? (
          <PremiumGateClient
            previewContacts={previewContacts}
            csvCount={allRecords.length}
            artistSlug={slug}
          >
            <>
              <DailyWarningBanner />
              <InstagramSafetyGuide />
              <ScoringDisclaimer />
              <ArtistNetworkClient
                records={records}
                loading={false}
                error={error}
                dmPriorityOrder={dmPriorityOrder}
                artistSlug={slug}
              />
            </>
          </PremiumGateClient>
        ) : (
          <>
            <DailyWarningBanner />
            <InstagramSafetyGuide />
            <ScoringDisclaimer />

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
              artistSlug={slug}
            />

            {paginationBar}
          </>
        )}

        {/* Prev / Next range navigation */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#1f1f1f] pt-8">
          {rangeConfig.prev ? (
            <Link href={`/artist/${slug}/${rangeConfig.prev}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
              ← {getArtistRange(artist, rangeConfig.prev)?.label}
            </Link>
          ) : <div />}
          {rangeConfig.next ? (
            <Link href={`/artist/${slug}/${rangeConfig.next}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors">
              {getArtistRange(artist, rangeConfig.next)?.label} →
            </Link>
          ) : <div />}
        </div>

        <div className="mt-8 flex justify-center">
          <Link href={`/artist/${slug}`} className="text-sm text-gray-500 hover:text-orange-500 transition-colors">
            ← Back to {artist.name}
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
