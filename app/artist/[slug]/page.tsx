import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";
import ScoringDisclaimer from "@/components/ScoringDisclaimer";
import type { AirtableRecord } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";
import DailyWarningBanner from "@/components/DailyWarningBanner";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import { SocialLinks } from "@/components/SocialLinks";
import AuthGateClient from "@/components/AuthGateClient";
import { getArtistOverride } from "@/lib/artistOverrides";
import { getArtist, getAllSlugs } from "@/lib/artists.config";

export const revalidate = 0;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function ArtistNetwork({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const meta = getArtist(slug);

  if (!meta) notFound();

  const override = await getArtistOverride(slug).catch(() => ({}));
  const effectiveBio = (override as { description?: string }).description ?? meta.bio;
  const effectiveSocials = {
    ...meta.socials,
    ...((override as { instagram?: string }).instagram ? { instagram: (override as { instagram?: string }).instagram } : {}),
    ...((override as { twitter?: string }).twitter ? { twitter: (override as { twitter?: string }).twitter } : {}),
  };

  let records: AirtableRecord[] = [];
  let error: string | null = null;
  let dmPriorityOrder: string[] | undefined;

  try {
    records = await fetchAirtableRecords(meta.airtableFilter);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  if (records.length > 0) {
    dmPriorityOrder = [...records]
      .sort((a, b) => a.followers - b.followers)
      .map((r) => r.username);
  }

  return (
    <AuthGateClient redirectUrl={`/artist/${slug}`}>
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12 pb-20">
        <Link
          href="/artists"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm mb-10 transition-colors"
        >
          ← All Artists
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-12">
          <div className="w-32 h-32 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {meta.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.photo}
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
            <p className="text-gray-500 text-sm">{meta.subtitle}</p>
            <SocialLinks socials={effectiveSocials} email={meta.email} />
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed mt-3">
              {effectiveBio}
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">
              {records.length}
            </p>
            <p className="text-gray-500 text-xs mt-1">Connections mapped</p>
          </div>
        </div>

        <DailyWarningBanner />
        <InstagramSafetyGuide />
        <ScoringDisclaimer />

        {meta.ranges.length > 0 ? (
          <div className="mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light tracking-[0.02em] mb-2">Browse by Follower Range</h2>
              <p className="text-[#a0a0a0] text-sm">Browse all contacts by follower range. <span className="text-orange-400">Smaller accounts reply faster</span> — start low.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {meta.ranges.map(({ slug: rangeSlug, label, desc, premium }) => (
                <Link
                  key={rangeSlug}
                  href={`/artist/${slug}/${rangeSlug}`}
                  className={`border rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-200 text-center ${premium ? "border-purple-500/20 hover:border-purple-500/40" : "border-white/[0.08] hover:border-orange-500/30"}`}
                >
                  <p className={`text-sm font-semibold mb-1 ${premium ? "text-purple-400" : "text-white"}`}>{label}</p>
                  {desc && <p className="text-xs text-[#606060]">{desc}</p>}
                  {premium && <p className="text-[10px] text-purple-400/70 mt-1">🔒 Premium</p>}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <ArtistNetworkClient
            records={records}
            loading={false}
            error={error}
            dmPriorityOrder={dmPriorityOrder}
            artistSlug={slug}
            artistName={meta.name}
          />
        )}

        {/* Top Contacts — artists with a curated /top page */}
        {meta.hasTop && (
          <div className="mt-16 border-t border-[#1f1f1f] pt-10">
            <div className="mb-4">
              <Link
                href={`/artist/${slug}/top`}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
              >
                ★ Top Contacts — Curated DM List
              </Link>
              <p className="text-xs text-[#505050] mt-2">
                High-value contacts with ready-to-send DM templates
              </p>
            </div>
          </div>
        )}

        <div className="mt-16 border-t border-[#1f1f1f] pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            🎹 Got a reply? Share it with the community
          </p>
          <TelegramButton label="Join Telegram →" />
        </div>
      </div>
    </div>
    </AuthGateClient>
  );
}
