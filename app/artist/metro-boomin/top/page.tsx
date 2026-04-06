import Link from "next/link";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";
import ScoringDisclaimer from "@/components/ScoringDisclaimer";
import DailyWarningBanner from "@/components/DailyWarningBanner";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import type { AirtableRecord } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";
import AuthGateClient from "@/components/AuthGateClient";

export const revalidate = 0;

const TOP_CAP = 50;
const FOLLOWER_CAP = 50_000; // Metro Boomin ~11M — cap at 50K

function selectTopContacts(all: AirtableRecord[]): AirtableRecord[] {
  const capped = all.filter((r) => r.followers < FOLLOWER_CAP);

  // Tier 1: Producer / Sound Engineer / Manager — with bio + template, followers DESC
  const primary = capped
    .filter(
      (r) =>
        (r.profileType === "Producer" ||
          r.profileType === "Sound Engineer" ||
          r.profileType === "Manager") &&
        r.description.trim() !== "" &&
        r.template.trim() !== ""
    )
    .sort((a, b) => b.followers - a.followers);

  if (primary.length >= TOP_CAP) return primary.slice(0, TOP_CAP);

  // Tier 2: Artist/Rapper — with bio + template
  const needed = TOP_CAP - primary.length;
  const primaryIds = new Set(primary.map((r) => r.id));
  const secondary = capped
    .filter(
      (r) =>
        r.profileType === "Artist/Rapper" &&
        r.description.trim() !== "" &&
        r.template.trim() !== "" &&
        !primaryIds.has(r.id)
    )
    .sort((a, b) => b.followers - a.followers)
    .slice(0, needed);

  const combined = [...primary, ...secondary];

  // Tier 3 fallback: process script not yet run — show all capped contacts by followers DESC
  if (combined.length === 0) {
    return [...capped].sort((a, b) => b.followers - a.followers).slice(0, TOP_CAP);
  }

  return combined;
}

export default async function MetroBoominTopContactsPage() {
  let records: AirtableRecord[] = [];
  let error: string | null = null;

  try {
    const all = await fetchAirtableRecords("Metro Boomin");
    records = selectTopContacts(all);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const dmPriorityOrder = [...records]
    .sort((a, b) => a.followers - b.followers)
    .map((r) => r.username);

  return (
    <AuthGateClient redirectUrl="/artist/metro-boomin/top">
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
          <span className="text-[#a0a0a0]">Top Contacts</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/metro-boomin.jpg" alt="Metro Boomin" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-1">
              Metro Boomin · Curated List
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-1">
              Top{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
                Contacts
              </span>
            </h1>
            <p className="text-[#a0a0a0] text-sm">
              The {records.length} highest-value contacts in Metro Boomin&apos;s network — under 50K followers, producers, engineers, managers first
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">{records.length}</p>
            <p className="text-gray-500 text-xs mt-1">Curated contacts</p>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">★</span>
          <p className="text-sm text-[#a0a0a0] leading-relaxed">
            <span className="text-orange-400 font-semibold">
              Producers, engineers, and managers first.
            </span>{" "}
            All under 50K followers — capped so you&apos;re DMing people who actually reply. Sorted by reach, max {TOP_CAP}.
          </p>
        </div>

        <DailyWarningBanner />
        <InstagramSafetyGuide />
        <ScoringDisclaimer />

        <ArtistNetworkClient
          records={records}
          loading={false}
          error={error}
          dmPriorityOrder={dmPriorityOrder}
          artistSlug="metro-boomin"
        />

        <div className="mt-12 flex justify-center border-t border-[#1f1f1f] pt-8">
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
