import Link from "next/link";

const ARTISTS = [
  {
    name: "Curren$y",
    subtitle: "Jet Life Recordings",
    slug: "currensy",
    free: true,
    connections: 29,
    genres: ["Hip-Hop", "New Orleans"],
    igHandle: "currencyspitta",
    photo: "/images/currensy.png",
    description:
      "New Orleans legend and founder of Jet Life. Known for his prolific output and tight-knit producer network.",
  },
  {
    name: "Harry Fraud",
    subtitle: "NYC · Cinematic Boom-Bap",
    slug: "harry-fraud",
    free: true,
    connections: 39,
    genres: ["Hip-Hop", "NYC"],
    igHandle: "harryfraud",
    photo: "/images/harryfraud.jpg",
    description:
      "New York's sonic architect — cinematic boom-bap, dark jazz, grimy street rap. The mind behind Smoke DZA, Rome Streetz, Crimeapple, Benny the Butcher.",
  },
  {
    name: "Wheezy",
    subtitle: "Atlanta · Certified Trapper",
    slug: "wheezy",
    free: true,
    connections: 53,
    genres: ["Hip-Hop", "Atlanta", "Trap"],
    igHandle: "wheezyouttahere",
    photo: "/images/wheezy.jpg",
    description:
      "Atlanta's most in-demand producer. The architect behind Future, Gunna, Young Thug, and Lil Baby's biggest records. Co-founder of Certified Trapper.",
  },
  {
    name: "Wiz Khalifa",
    subtitle: "Taylor Gang",
    slug: null,
    free: false,
    connections: 40,
    genres: ["Hip-Hop", "Pittsburgh"],
    photo: null,
    description:
      "Pittsburgh rapper and Taylor Gang founder. Deep ties to major labels and independent creatives.",
  },
  {
    name: "Freddie Gibbs",
    subtitle: "ESGN",
    slug: null,
    free: false,
    connections: 35,
    genres: ["Hip-Hop", "Gary"],
    photo: null,
    description:
      "Gary, Indiana's finest. Connections spanning independent producers to legendary labels.",
  },
  {
    name: "Evidence",
    subtitle: "Rhymesayers",
    slug: null,
    free: false,
    connections: 28,
    genres: ["Hip-Hop", "LA"],
    photo: null,
    description: "LA beatmaker and MC with deep underground hip-hop connections.",
  },
  {
    name: "Boldy James",
    subtitle: "Detroit",
    slug: null,
    free: false,
    connections: 22,
    genres: ["Hip-Hop", "Detroit"],
    photo: null,
    description:
      "Detroit rapper with a rich network of beatmakers and independent labels.",
  },
  {
    name: "Benny The Butcher",
    subtitle: "Griselda",
    slug: null,
    free: false,
    connections: 30,
    genres: ["Hip-Hop", "Buffalo"],
    photo: null,
    description:
      "Griselda's cornerstone. Heavy connections across the East Coast indie scene.",
  },
];

type Artist = (typeof ARTISTS)[0];

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <div
      className={`bg-white/[0.025] backdrop-blur-md border rounded-2xl p-7 relative flex flex-col transition-all duration-200 scroll-animate ${
        artist.free
          ? "border-orange-500/20 hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
          : "border-white/[0.06] opacity-60"
      }`}
      style={{ willChange: "transform" }}
    >
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
              src={artist.photo ?? `https://unavatar.io/instagram/${(artist as { igHandle?: string | null }).igHandle}`}
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
          {artist.connections} connections
        </span>
      </div>

      {artist.free && artist.slug ? (
        <Link
          href={`/artist/${artist.slug}`}
          className="block text-center text-sm font-semibold bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white px-4 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
        >
          Explore Network →
        </Link>
      ) : (
        <div className="text-center text-sm font-medium text-[#505050] bg-white/[0.02] px-4 py-3 rounded-lg border border-white/[0.06]">
          Available with Pro
        </div>
      )}
    </div>
  );
}

export default function Artists() {
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ARTISTS.map((artist) => (
            <ArtistCard key={artist.name} artist={artist} />
          ))}
        </div>

        {/* Pro CTA */}
        <div className="mt-24 bg-white/[0.025] backdrop-blur-md border border-orange-500/15 rounded-2xl p-10 text-center scroll-animate">
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
