export const revalidate = 0;

const COMING_SOON_ARTISTS = [
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
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ComingSoonCard({
  name,
  role,
  igHandle,
}: {
  name: string;
  role: string;
  igHandle: string;
}) {
  return (
    <div className="bg-white/[0.025] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 flex flex-col items-center text-center hover:border-white/[0.15] transition-all duration-200">
      {/* Photo */}
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden mb-4 flex-shrink-0 border border-white/[0.08]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://unavatar.io/instagram/${igHandle}`}
          alt={name}
          className="w-full h-full object-cover opacity-60"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        {/* Blur overlay to reinforce "not available yet" */}
        <div className="absolute inset-0 backdrop-blur-[1px] bg-black/20" />
        {/* Fallback initials */}
        <div
          className="absolute inset-0 items-center justify-center text-orange-500 text-xl font-semibold bg-white/[0.04]"
          style={{ display: "none" }}
        >
          {getInitials(name)}
        </div>
      </div>

      {/* Name */}
      <h3 className="font-medium text-sm tracking-[0.01em] mb-1 leading-snug">
        {name}
      </h3>

      {/* Role */}
      <p className="text-[#606060] text-xs mb-3">{role}</p>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-[0.08em] uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        Coming Soon
      </span>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="mb-16 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-500 text-xs font-medium mb-8 tracking-[0.1em] uppercase">
            Expanding Network
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-5">
            More artist networks{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              coming soon
            </span>
          </h1>
          <p className="text-[#a0a0a0] text-lg leading-relaxed">
            BeatBridge is mapping the inner circles of hip-hop&apos;s most
            influential producers and artists. New networks drop regularly —
            stay tuned.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {COMING_SOON_ARTISTS.map((artist) => (
            <ComingSoonCard key={artist.igHandle} {...artist} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 bg-white/[0.025] backdrop-blur-md border border-orange-500/15 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-light tracking-[0.02em] mb-3">
            Want early access when they drop?
          </h2>
          <p className="text-[#a0a0a0] mb-8 max-w-lg mx-auto">
            Join the waitlist and be the first to know when new artist networks
            go live.
          </p>
          <a
            href="/#waitlist"
            className="inline-block bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-8 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            Join the Waitlist
          </a>
        </div>
      </div>
    </div>
  );
}
