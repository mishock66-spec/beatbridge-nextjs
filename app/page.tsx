import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";
import SignInValueProp from "@/components/SignInValueProp";
import { TelegramButton } from "@/components/TelegramButton";

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
    free: true,
    connections: 29,
    igHandle: "currencyspitta",
    photo: "/images/currensy.png",
  },
  {
    name: "Harry Fraud",
    subtitle: "NYC · Boom-Bap",
    slug: "harry-fraud",
    free: true,
    connections: 39,
    igHandle: "harryfraud",
    photo: "/images/harryfraud.jpg",
  },
  {
    name: "Wiz Khalifa",
    subtitle: "Taylor Gang",
    slug: null,
    free: false,
    connections: 40,
    photo: null,
  },
  {
    name: "Freddie Gibbs",
    subtitle: "ESGN",
    slug: null,
    free: false,
    connections: 35,
    photo: null,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-24 pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.1),transparent)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-500 text-xs font-semibold mb-8 tracking-wide uppercase">
            Hip-Hop Networking Tool
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Stop cold-DMing.
            <br />
            <span className="text-orange-500">Start networking.</span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            BeatBridge maps the Instagram connections of established hip-hop
            artists and gives you personalized DM templates to reach the right
            people — not just any people.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/artists"
              className="bg-orange-500 text-black font-bold px-8 py-4 rounded-full hover:bg-orange-400 transition-colors text-base"
            >
              Explore Networks →
            </Link>
            <a
              href="#waitlist"
              className="border border-white/10 text-white font-semibold px-8 py-4 rounded-full hover:border-orange-500/40 hover:text-orange-500 transition-colors text-base"
            >
              Get Early Access
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              How it works
            </h2>
            <p className="text-gray-400">
              Three steps from zero to in their DMs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-6xl font-black text-orange-500/10 mb-4 leading-none">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Artist Preview */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black mb-2">
                Artist roster
              </h2>
              <p className="text-gray-400">
                Networks mapped and ready to explore.
              </p>
            </div>
            <Link
              href="/artists"
              className="text-orange-500 text-sm font-semibold hover:text-orange-400 transition-colors hidden sm:block"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PREVIEW_ARTISTS.map((artist) => (
              <div
                key={artist.name}
                className={`bg-[#111111] border rounded-2xl p-6 relative overflow-hidden transition-all duration-200 ${
                  artist.free
                    ? "border-orange-500/30 hover:border-orange-500/60 cursor-pointer"
                    : "border-white/5 opacity-60"
                }`}
              >
                {!artist.free && (
                  <div className="absolute top-4 right-4 bg-orange-500/20 text-orange-500 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                    PRO
                  </div>
                )}
                <div className="w-16 h-16 rounded-full bg-[#2a2a2a] mb-4 overflow-hidden">
                  {artist.photo || (artist as { igHandle?: string }).igHandle ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.photo ?? `https://unavatar.io/instagram/${(artist as { igHandle?: string }).igHandle}`}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-600">
                      {artist.name[0]}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg">{artist.name}</h3>
                <p className="text-gray-500 text-sm mb-3">{artist.subtitle}</p>
                <p className="text-orange-500 text-xs font-semibold">
                  {artist.connections} connections mapped
                </p>
                {artist.free && artist.slug && (
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="mt-4 block text-center text-sm font-bold bg-orange-500 text-black px-4 py-2 rounded-full hover:bg-orange-400 transition-colors"
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
              className="text-orange-500 text-sm font-semibold hover:text-orange-400 sm:hidden"
            >
              View all artists →
            </Link>
          </div>
        </div>
      </section>

      {/* Sign in value prop */}
      <SignInValueProp />

      {/* Waitlist */}
      <section id="waitlist" className="py-24 px-4 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          <div className="text-5xl mb-6">🎤</div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            More artists. <span className="text-orange-500">Coming soon.</span>
          </h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            We&apos;re mapping more networks every week. Get on the waitlist and
            be the first to know when your favorite artist&apos;s network drops.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-10 text-center">
            <div className="text-4xl mb-4">✈️</div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Join the BeatBridge Community
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              Connect with beatmakers, share wins, and get tips from producers who are actively networking.
            </p>
            <TelegramButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4 text-center text-gray-600 text-sm">
        <p className="font-bold text-white mb-1">
          Beat<span className="text-orange-500">Bridge</span>
        </p>
        <p>© 2025 BeatBridge. Built for the independent grind.</p>
        <p className="mt-2">
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
        </p>
      </footer>
    </div>
  );
}
