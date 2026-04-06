import Link from "next/link";
import { fetchAirtableRecords } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";
import DailyWarningBanner from "@/components/DailyWarningBanner";
import InstagramSafetyGuide from "@/components/InstagramSafetyGuide";
import { SocialLinks } from "@/components/SocialLinks";
import AuthGateClient from "@/components/AuthGateClient";
import { getArtistOverride } from "@/lib/artistOverrides";

export const revalidate = 0;

const RANGES = [
  { slug: "0-500",   label: "0 – 500",    desc: "Highest reply rate" },
  { slug: "500-5k",  label: "500 – 5K",   desc: "Best response rate" },
  { slug: "5k-10k",  label: "5K – 10K",   desc: "High engagement" },
  { slug: "10k-20k", label: "10K – 20K",  desc: "Mid-tier reach" },
  { slug: "20k-30k", label: "20K – 30K",  desc: "Growing accounts" },
  { slug: "30k-40k", label: "30K – 40K",  desc: "Established" },
  { slug: "40k-50k", label: "40K – 50K",  desc: "Large following" },
];

const DEFAULTS = {
  instagram: "https://www.instagram.com/metroboomin/",
  twitter: "https://x.com/MetroBoomin",
  description:
    "Founder of Boominati Worldwide. The architect behind 21 Savage, Future, Drake, Travis Scott and Gunna\u2019s biggest records.",
};

export default async function MetroBoominArtistPage() {
  let totalContacts = 0;
  const override = await getArtistOverride("metro-boomin").catch(() => ({}));
  const socials = {
    instagram: override.instagram ?? DEFAULTS.instagram,
    twitter: override.twitter ?? DEFAULTS.twitter,
  };
  const description = override.description ?? DEFAULTS.description;

  try {
    const records = await fetchAirtableRecords("Metro Boomin");
    totalContacts = records.length;
  } catch {
    // show 0 on error
  }

  return (
    <AuthGateClient redirectUrl="/artist/metro-boomin">
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/metro-boomin.jpg"
              alt="Metro Boomin"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 text-green-400 text-xs font-semibold mb-3">
              FREE
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-1">Metro Boomin</h1>
            <p className="text-gray-500 text-sm">Atlanta · Boominati Worldwide · Trap</p>
            <SocialLinks socials={socials} />
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed mt-3">
              {description}
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">{totalContacts}</p>
            <p className="text-gray-500 text-xs mt-1">Connections mapped</p>
          </div>
        </div>

        <DailyWarningBanner />
        <InstagramSafetyGuide />

        {/* Banner */}
        <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">💡</span>
          <p className="text-sm text-[#a0a0a0] leading-relaxed">
            <span className="text-orange-400 font-semibold">
              Smaller accounts = higher response rate.
            </span>{" "}
            Start with 500–5K for best results.
          </p>
        </div>

        {/* Top Contacts button */}
        <div className="mb-10">
          <Link
            href="/artist/metro-boomin/top"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-sm font-semibold px-5 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            ★ Top Contacts — Curated DM List
          </Link>
          <p className="text-xs text-[#505050] mt-2">
            High-value contacts with ready-to-send DM templates
          </p>
        </div>

        {/* Explore by follower range */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-light tracking-[0.02em] mb-2">
              Explore by follower range
            </h2>
            <p className="text-[#a0a0a0] text-sm">
              Browse all {totalContacts} contacts sorted by follower count.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {RANGES.map(({ slug, label, desc }) => (
              <Link
                key={slug}
                href={`/artist/metro-boomin/${slug}`}
                className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5 hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 transition-all duration-200 group"
              >
                <p className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors">
                  {label}
                </p>
                <p className="text-xs text-[#505050] mt-1">{desc}</p>
                <p className="text-xs text-orange-500/60 mt-3 font-medium group-hover:text-orange-400 transition-colors">
                  Browse →
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Telegram community banner */}
        <div className="mt-16 border-t border-[#1f1f1f] pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">🎹 Got a reply? Share it with the community</p>
          <TelegramButton label="Join Telegram →" />
        </div>
      </div>
    </div>
    </AuthGateClient>
  );
}
