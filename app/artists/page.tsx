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
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Curren%24y_2012.jpg/440px-Curren%24y_2012.jpg",
    description:
      "New Orleans legend and founder of Jet Life. Known for his prolific output and tight-knit producer network.",
  },
  {
    name: "Wiz Khalifa",
    subtitle: "Taylor Gang",
    slug: null,
    free: false,
    connections: 40,
    genres: ["Hip-Hop", "Pittsburgh"],
    igHandle: null,
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
    igHandle: null,
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
    igHandle: null,
    description: "LA beatmaker and MC with deep underground hip-hop connections.",
  },
  {
    name: "Boldy James",
    subtitle: "Detroit",
    slug: null,
    free: false,
    connections: 22,
    genres: ["Hip-Hop", "Detroit"],
    igHandle: null,
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
    igHandle: null,
    description:
      "Griselda's cornerstone. Heavy connections across the East Coast indie scene.",
  },
];

type Artist = (typeof ARTISTS)[0];

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <div
      className={`bg-[#1a1a1a] border rounded-2xl p-6 relative flex flex-col transition-all duration-200 ${
        artist.free
          ? "border-orange-500/20 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5"
          : "border-white/5"
      }`}
    >
      {!artist.free && (
        <div className="absolute top-5 right-5 bg-orange-500/15 text-orange-500 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/30">
          PRO
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-[#2a2a2a] overflow-hidden flex-shrink-0 border border-white/5">
          {artist.photo || artist.igHandle ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.photo ?? `https://unavatar.io/instagram/${artist.igHandle}`}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-500">
              {artist.name[0]}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-black text-xl">{artist.name}</h3>
          <p className="text-gray-500 text-sm">{artist.subtitle}</p>
        </div>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
        {artist.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {artist.genres.map((g) => (
          <span
            key={g}
            className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full"
          >
            {g}
          </span>
        ))}
        <span className="text-xs text-orange-500 font-semibold ml-auto">
          {artist.connections} connections
        </span>
      </div>

      {artist.free && artist.slug ? (
        <Link
          href={`/artist/${artist.slug}`}
          className="block text-center text-sm font-bold bg-orange-500 text-black px-4 py-3 rounded-xl hover:bg-orange-400 transition-colors"
        >
          Explore Network →
        </Link>
      ) : (
        <div className="text-center text-sm font-semibold text-gray-600 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/5">
          Available with Pro
        </div>
      )}
    </div>
  );
}

export default function Artists() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-16 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-500 text-xs font-semibold mb-6 tracking-wide uppercase">
            Artist Roster
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            Networks, mapped.
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
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
        <div className="mt-20 bg-[#1a1a1a] border border-orange-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-black mb-3">
            Want the full roster?{" "}
            <span className="text-orange-500">Go Pro.</span>
          </h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Unlock every artist network, unlimited DM templates, and early
            access to new additions.
          </p>
          <Link
            href="/#waitlist"
            className="inline-block bg-orange-500 text-black font-bold px-8 py-3 rounded-full hover:bg-orange-400 transition-colors"
          >
            Join the Waitlist
          </Link>
        </div>
      </div>
    </div>
  );
}
