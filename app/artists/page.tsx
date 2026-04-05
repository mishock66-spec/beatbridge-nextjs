import Link from "next/link";
import { fetchAirtableCount, fetchTotalConnectionsCount } from "@/lib/airtable";
import { ComingSoonCard } from "@/components/ComingSoonCard";
import ArtistProgressBar from "@/components/ArtistProgressBar";
import { SocialLinks } from "@/components/SocialLinks";
import ExploreNetworkButton from "@/components/ExploreNetworkButton";
import { LATEST_DROP } from "@/lib/announcements";

export const revalidate = 0;

const ARTISTS = [
  {
    name: "Curren$y",
    subtitle: "Jet Life Recordings",
    slug: "currensy",
    suiviPar: ["Curren$y", "CurrenSy"] as string | string[],
    free: true,
    genres: ["Hip-Hop", "New Orleans"],
    igHandle: "currencyspitta",
    photo: "/images/currensy.png",
    description:
      "New Orleans legend and founder of Jet Life. Known for his prolific output and tight-knit producer network.",
    socials: {
      instagram: "https://www.instagram.com/spitta_andretti/",
      twitter:   "https://x.com/CurrenSy_Spitta",
    },
  },
  {
    name: "Harry Fraud",
    subtitle: "NYC · Cinematic Boom-Bap",
    slug: "harry-fraud",
    suiviPar: "Harry Fraud" as string | string[],
    free: true,
    genres: ["Hip-Hop", "NYC"],
    igHandle: "harryfraud",
    photo: "/images/harryfraud.jpg",
    description:
      "New York's sonic architect — cinematic boom-bap, dark jazz, grimy street rap. The mind behind Smoke DZA, Rome Streetz, Crimeapple, Benny the Butcher.",
    socials: {
      instagram: "https://www.instagram.com/harryfraud/",
      twitter:   "https://x.com/HarryFraud",
    },
  },
  {
    name: "Wheezy",
    subtitle: "Atlanta · Certified Trapper",
    slug: "wheezy",
    suiviPar: "Wheezy" as string | string[],
    free: true,
    genres: ["Hip-Hop", "Atlanta", "Trap"],
    igHandle: "wheezyouttahere",
    photo: "/images/wheezy.jpg",
    description:
      "Atlanta's most in-demand producer. The architect behind Future, Gunna, Young Thug, and Lil Baby's biggest records. Co-founder of Certified Trapper.",
    socials: {
      instagram: "https://www.instagram.com/wheezy/",
      twitter:   "https://x.com/wheezy0uttahere",
    },
  },
  {
    name: "Juke Wong",
    subtitle: "Melodic Trap · Wheezy's Circle",
    slug: "juke-wong",
    suiviPar: "Juke Wong" as string | string[],
    free: true,
    genres: ["Hip-Hop", "Trap", "Melodic"],
    igHandle: "jukewong",
    photo: "/images/juke-wong.jpg",
    description:
      "Producer known for his work with Wheezy and his signature melodic trap sound.",
    socials: {
      instagram: "https://www.instagram.com/jukewong/",
    },
  },
];

type Artist = (typeof ARTISTS)[0];

function LiveDot() {
  return (
    <span className="relative inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.08em]">Live</span>
    </span>
  );
}

function ArtistCard({
  artist,
  connections,
}: {
  artist: Artist;
  connections: number;
}) {
  const isLatestDrop = artist.slug === LATEST_DROP.slug && LATEST_DROP.active;

  return (
    <div
      className={`bg-white/[0.025] backdrop-blur-md border rounded-2xl p-7 relative flex flex-col transition-all duration-200 scroll-animate ${
        artist.free
          ? "border-orange-500/20 hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
          : "border-white/[0.06] opacity-60"
      }`}
      style={{ willChange: "transform" }}
    >
      {/* LIVE badge for latest drop */}
      {isLatestDrop && (
        <div className="absolute top-5 right-5">
          <LiveDot />
        </div>
      )}

      {!artist.free && (
        <div className="absolute top-5 right-5 bg-orange-500/15 text-orange-500 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/30">
          PRO
        </div>
      )}

      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-white/[0.05] overflow-hidden flex-shrink-0 border border-white/[0.06]">
          {artist.photo || (artist as { igHandle?: string | null }).igHandle ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                artist.photo ??
                `https://unavatar.io/instagram/${(artist as { igHandle?: string | null }).igHandle}`
              }
              alt={artist.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-medium text-[#404040]">
              {artist.name[0]}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-medium text-lg tracking-[0.01em]">{artist.name}</h3>
          <p className="text-[#606060] text-sm">{artist.subtitle}</p>
          {"socials" in artist && artist.socials && (
            <SocialLinks socials={artist.socials} />
          )}
        </div>
      </div>

      <p className="text-[#a0a0a0] text-sm leading-relaxed mb-5 flex-1">
        {artist.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {artist.genres.map((g) => (
          <span
            key={g}
            className="text-xs text-[#606060] bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]"
          >
            {g}
          </span>
        ))}
        <span className="text-xs text-orange-500 font-medium tracking-[0.05em] uppercase ml-auto">
          {connections} connections
        </span>
      </div>

      {artist.free && artist.slug && (
        <ArtistProgressBar artistSlug={artist.slug} totalContacts={connections} />
      )}

      {artist.free && artist.slug ? (
        <ExploreNetworkButton slug={artist.slug} />
      ) : (
        <div className="text-center text-sm font-medium text-[#505050] bg-white/[0.02] px-4 py-3 rounded-lg border border-white/[0.06]">
          Available with Pro
        </div>
      )}
    </div>
  );
}

export default async function Artists() {
  // Fetch total connections count + per-artist counts in parallel
  const activeArtists = ARTISTS.filter((a) => a.suiviPar !== null);
  const [totalConnections, ...counts] = await Promise.all([
    fetchTotalConnectionsCount().catch(() => 0),
    ...activeArtists.map((a) =>
      fetchAirtableCount(a.suiviPar as string | string[]).catch(() => 0)
    ),
  ]);
  const countMap = new Map<string, number>();
  activeArtists.forEach((a, i) => countMap.set(a.name, counts[i]));

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="mb-20 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-500 text-xs font-medium mb-8 tracking-[0.1em] uppercase">
            Artist Roster
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-5">
            Networks, mapped.
          </h1>
          <p className="text-[#a0a0a0] text-lg leading-relaxed">
            Each artist&apos;s Instagram network is hand-researched and filtered
            to the people who actually move the needle — producers, labels,
            engineers, managers.
          </p>
        </div>

        {/* Stats banner */}
        <div className="mb-10 border-l-4 border-orange-500 bg-white/[0.025] backdrop-blur-md rounded-r-xl px-5 py-4">
          <p className="text-sm text-[#a0a0a0]">
            📡{" "}
            <span className="text-orange-500 font-medium">
              {totalConnections.toLocaleString()}
            </span>{" "}
            Instagram connections mapped across{" "}
            <span className="text-orange-500 font-medium">4</span> artist
            networks unlocked — and growing.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARTISTS.map((artist) => (
            <ArtistCard
              key={artist.name}
              artist={artist}
              connections={countMap.get(artist.name) ?? 0}
            />
          ))}
        </div>

        {/* NEXT DROP — community vote teaser */}
        <div className="mt-10 mb-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold text-[#505050] uppercase tracking-[0.12em] mb-4">
            <span className="w-4 h-px bg-white/10" />
            Next drop — you decide
            <span className="w-4 h-px bg-white/10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Metro Boomin", genre: "Atlanta · Trap" },
              { name: "Pi'erre Bourne", genre: "Atlanta · SoundCloud Rap" },
              { name: "Tay Keith", genre: "Memphis · Trap" },
            ].map((c) => (
              <div
                key={c.name}
                className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden"
              >
                {/* Blurred avatar placeholder */}
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xl select-none blur-[2px]">
                  🔒
                </div>
                <div>
                  <p className="font-medium text-sm text-[#505050]">{c.name}</p>
                  <p className="text-xs text-[#404040]">{c.genre}</p>
                </div>
                <Link
                  href="/vote"
                  className="text-xs font-semibold text-orange-500/80 hover:text-orange-400 transition-colors border border-orange-500/20 hover:border-orange-500/40 px-3 py-1.5 rounded-lg"
                >
                  Vote to unlock →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="mt-24 scroll-animate">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-light tracking-[0.02em] mb-3">
              More networks{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
                dropping soon
              </span>
            </h2>
            <p className="text-[#a0a0a0] max-w-xl">
              We&apos;re mapping the inner circles of hip-hop&apos;s most
              influential producers. Stay tuned.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { name: "Metro Boomin", role: "Producer", igHandle: "metrothicc" },
              { name: "The Alchemist", role: "Producer", igHandle: "alchemist" },
              { name: "WondaGurl", role: "Producer", igHandle: "wondagurl" },
              { name: "Hit-Boy", role: "Producer", igHandle: "hitboy" },
              { name: "Pi'erre Bourne", role: "Producer / Artist", igHandle: "pierrebourne" },
              { name: "Kenny Beats", role: "Producer", igHandle: "kennybeats" },
              { name: "Madlib", role: "Producer", igHandle: "madlib" },
              { name: "Murda Beatz", role: "Producer", igHandle: "murdabeatz_" },
              { name: "Southside", role: "Producer", igHandle: "southside" },
              { name: "TM88", role: "Producer", igHandle: "tm88" },
              { name: "Zaytoven", role: "Producer", igHandle: "zaytoven" },
              { name: "DJ Mustard", role: "Producer / DJ", igHandle: "djmustard" },
              { name: "Boi-1da", role: "Producer", igHandle: "boi1da" },
              { name: "Jake One", role: "Producer", igHandle: "jakeone206" },
              { name: "Cardo", role: "Producer", igHandle: "cardogotwinggs" },
              { name: "Roper Jones", role: "Producer", igHandle: "roperjones" },
              { name: "Conductor Williams", role: "Producer", igHandle: "conductorwilliams" },
              { name: "AzaeL", role: "Producer", igHandle: "azael" },
              { name: "ATL Jacob", role: "Producer", igHandle: "atljacob" },
              { name: "Cash Cobain", role: "Producer / Artist", igHandle: "cashcobain" },
              { name: "Ojivolta", role: "Producer", igHandle: "ojivolta" },
              { name: "Oz", role: "Producer", igHandle: "ozthewizard" },
              { name: "Trauma Tone", role: "Producer", igHandle: "traumatone" },
              { name: "Ski Beatz", role: "Producer", igHandle: "skibeatz" },
            ].map((artist) => (
              <ComingSoonCard key={artist.igHandle} {...artist} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/coming-soon"
              className="inline-block text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
            >
              See full list →
            </Link>
          </div>
        </div>

        {/* Pro CTA */}
        <div className="mt-16 bg-white/[0.025] backdrop-blur-md border border-orange-500/15 rounded-2xl p-10 text-center scroll-animate">
          <h2 className="text-2xl font-light tracking-[0.02em] mb-3">
            Want the full roster?{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              Go Pro.
            </span>
          </h2>
          <p className="text-[#a0a0a0] mb-8 max-w-lg mx-auto">
            Unlock every artist network, unlimited DM templates, and early
            access to new additions.
          </p>
          <Link
            href="/#waitlist"
            className="inline-block bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-8 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            Join the Waitlist
          </Link>
        </div>
      </div>
    </div>
  );
}
