import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import SignInValueProp from "@/components/SignInValueProp";
import { TelegramButton } from "@/components/TelegramButton";
import { fetchAirtableCount, fetchTotalConnectionsCount } from "@/lib/airtable";

export const revalidate = 0;

const STEPS = [
  {
    number: "01",
    title: "Pick an artist",
    description:
      "Browse our curated roster of hip-hop artists. Each profile comes with their verified network already mapped.",
  },
  {
    number: "02",
    title: "Explore their network",
    description:
      "See every producer, label, engineer, and manager in their circle. Filter by role to find exactly who you need.",
  },
  {
    number: "03",
    title: "Send the right DM",
    description:
      "Use our personalized templates — crafted for each contact — to reach out with context, not cold pitches.",
  },
];

const PREVIEW_ARTISTS = [
  {
    name: "Curren$y",
    subtitle: "Jet Life Recordings",
    slug: "currensy",
    suiviPar: ["Curren$y", "CurrenSy"] as string | string[],
    free: true,
    igHandle: "currencyspitta",
    photo: "/images/currensy.png",
  },
  {
    name: "Harry Fraud",
    subtitle: "NYC · Boom-Bap",
    slug: "harry-fraud",
    suiviPar: "Harry Fraud" as string | string[],
    free: true,
    igHandle: "harryfraud",
    photo: "/images/harryfraud.jpg",
  },
  {
    name: "Wheezy",
    subtitle: "Atlanta · Trap",
    slug: "wheezy",
    suiviPar: "Wheezy" as string | string[],
    free: true,
    igHandle: "wheezyouttahere",
    photo: "/images/wheezy.jpg",
  },
  {
    name: "Juke Wong",
    subtitle: "Melodic Trap",
    slug: "juke-wong",
    suiviPar: "Juke Wong" as string | string[],
    free: true,
    igHandle: "jukewong",
    photo: "/artists/juke-wong.jpg",
  },
];

export default async function Home() {
  // Fetch total connections count + per-artist preview counts in parallel
  const activePreview = PREVIEW_ARTISTS.filter((a) => a.suiviPar !== null);
  const [totalConnections, ...previewCounts] = await Promise.all([
    fetchTotalConnectionsCount().catch(() => 0),
    ...activePreview.map((a) =>
      fetchAirtableCount(a.suiviPar as string | string[]).catch(() => 0)
    ),
  ]);
  const previewCountMap = new Map<string, number>();
  activePreview.forEach((a, i) => previewCountMap.set(a.name, previewCounts[i]));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-36 pb-44 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.08),transparent)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="hero-animate inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-500 text-xs font-medium mb-10 tracking-[0.1em] uppercase">
            Hip-Hop Networking Tool
          </div>
          <h1 className="hero-animate hero-delay-1 text-5xl sm:text-6xl md:text-7xl font-light leading-tight tracking-[0.02em] mb-8">
            Stop cold-DMing.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              Start networking.
            </span>
          </h1>
          <p className="hero-animate hero-delay-2 text-[#a0a0a0] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            BeatBridge maps the Instagram connections of established hip-hop
            artists and gives you personalized DM templates to reach the right
            people — not just any people.
          </p>
          <div className="hero-animate hero-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/artists"
              className="bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-8 py-4 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200 text-base"
            >
              Explore Networks →
            </Link>
            <a
              href="#waitlist"
              className="border border-white/[0.1] text-white font-medium px-8 py-4 rounded-lg hover:border-orange-500/40 hover:text-orange-400 hover:scale-[1.02] transition-all duration-200 text-base"
            >
              Get Early Access
            </a>
          </div>
          {/* Stats bar */}
          <div className="hero-animate hero-delay-4 mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-[#606060]">
            <span>
              <span className="text-orange-500 font-medium">{totalConnections.toLocaleString()}</span> connections mapped
            </span>
            <span className="text-[#303030]">·</span>
            <span>
              <span className="text-orange-500 font-medium">4</span> artist networks
            </span>
            <span className="text-[#303030]">·</span>
            <span>New connections added constantly</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-4 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 scroll-animate">
            <h2 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-4">
              How it works
            </h2>
            <p className="text-[#a0a0a0]">
              Three steps from zero to in their DMs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="relative scroll-animate"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="text-6xl font-thin text-orange-500/10 mb-5 leading-none tracking-tight">
                  {step.number}
                </div>
                <h3 className="text-xl font-medium tracking-[0.02em] mb-3">{step.title}</h3>
                <p className="text-[#a0a0a0] text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artist Preview */}
      <section className="py-32 px-4 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-14 scroll-animate">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-2">
                Artist roster
              </h2>
              <p className="text-[#a0a0a0]">
                Networks mapped and ready to explore.
              </p>
            </div>
            <Link
              href="/artists"
              className="text-orange-500 text-sm font-medium hover:text-orange-400 transition-colors hidden sm:block"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PREVIEW_ARTISTS.map((artist, i) => (
              <div
                key={artist.name}
                className={`bg-white/[0.03] backdrop-blur-md border rounded-2xl p-7 relative overflow-hidden transition-all duration-200 scroll-animate ${
                  artist.free
                    ? "border-orange-500/20 hover:border-orange-500/40 hover:-translate-y-0.5 cursor-pointer"
                    : "border-white/[0.06] opacity-50"
                }`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                {!artist.free && (
                  <div className="absolute top-4 right-4 bg-orange-500/15 text-orange-500 text-xs font-medium px-2 py-0.5 rounded-full border border-orange-500/20 tracking-[0.05em] uppercase">
                    Pro
                  </div>
                )}
                <div className="w-14 h-14 rounded-full bg-white/[0.05] mb-5 overflow-hidden">
                  {artist.photo || (artist as { igHandle?: string }).igHandle ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.photo ?? `https://unavatar.io/instagram/${(artist as { igHandle?: string }).igHandle}`}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-[#404040]">
                      {artist.name[0]}
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-base tracking-[0.01em]">{artist.name}</h3>
                <p className="text-[#606060] text-sm mb-3">{artist.subtitle}</p>
                <p className="text-orange-500 text-xs font-medium tracking-[0.05em] uppercase">
                  {previewCountMap.get(artist.name) ?? 0} connections
                </p>
                {artist.free && artist.slug && (
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="mt-5 block text-center text-sm font-semibold bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white px-4 py-2.5 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
                  >
                    Explore Network
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/artists"
              className="text-orange-500 text-sm font-medium hover:text-orange-400 sm:hidden"
            >
              View all artists →
            </Link>
          </div>
        </div>
      </section>

      {/* Sign in value prop */}
      <SignInValueProp />

      {/* Waitlist */}
      <section id="waitlist" className="py-32 px-4 border-t border-white/[0.05]">
        <div className="max-w-xl mx-auto text-center scroll-animate">
          <div className="text-5xl mb-8">🎤</div>
          <h2 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-4">
            More artists.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              Coming soon.
            </span>
          </h2>
          <p className="text-[#a0a0a0] mb-12 leading-relaxed">
            We&apos;re mapping more networks every week. Get on the waitlist and
            be the first to know when your favorite artist&apos;s network drops.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-20 px-4 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto scroll-animate">
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl p-12 text-center">
            <div className="text-4xl mb-5">✈️</div>
            <h2 className="text-2xl sm:text-3xl font-light tracking-[0.02em] mb-3">
              Join the BeatBridge Community
            </h2>
            <p className="text-[#a0a0a0] text-sm leading-relaxed mb-10 max-w-lg mx-auto">
              Connect with beatmakers, share wins, and get tips from producers who are actively networking.
            </p>
            <TelegramButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-12 px-4 text-center text-[#404040] text-sm">
        <p className="font-medium text-white mb-1.5 tracking-wide">
          Beat<span className="text-orange-500">Bridge</span>
        </p>
        <p>© 2025 BeatBridge. Built for the independent grind.</p>
        <p className="mt-2.5 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/why-beatbridge" className="hover:text-[#a0a0a0] transition-colors">Why BeatBridge</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-[#a0a0a0] transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-[#a0a0a0] transition-colors">Terms of Service</Link>
        </p>
      </footer>
    </div>
  );
}
