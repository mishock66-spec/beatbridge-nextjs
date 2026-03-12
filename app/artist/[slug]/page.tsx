import Link from "next/link";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";

const ARTIST_META: Record<
  string,
  { name: string; subtitle: string; igHandle: string | null; bio: string; photo?: string }
> = {
  currensy: {
    name: "Curren$y",
    subtitle: "Jet Life Recordings · New Orleans, LA",
    igHandle: "spitta_andretti",
    photo: "/images/currensy.png",
    bio: "Prolific New Orleans rapper and founder of Jet Life Recordings. Spitta has cultivated one of the most loyal and talented networks in independent hip-hop — from beatmakers to A&R reps to engineers who all share his laid-back, smoke-filled aesthetic.",
  },
};

export default async function ArtistNetwork({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  if (slug !== "currensy") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-6">🔒</p>
          <h1 className="text-3xl font-black mb-3">Pro Artist</h1>
          <p className="text-gray-400 mb-8">
            This artist&apos;s network is available with a Pro subscription.
          </p>
          <Link
            href="/artists"
            className="text-orange-500 font-semibold hover:text-orange-400"
          >
            ← Back to artists
          </Link>
        </div>
      </div>
    );
  }

  const meta = ARTIST_META[slug];

  let records: Awaited<ReturnType<typeof fetchAirtableRecords>> = [];
  let error: string | null = null;

  try {
    records = await fetchAirtableRecords();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
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
            {meta.photo || meta.igHandle ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.photo ?? `https://unavatar.io/instagram/${meta.igHandle}`}
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
            <p className="text-gray-500 text-sm mb-3">{meta.subtitle}</p>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              {meta.bio}
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">
              {records.length}
            </p>
            <p className="text-gray-500 text-xs mt-1">Connections mapped</p>
          </div>
        </div>

        {/* Client component handles listening link, filter, search, and grid */}
        <ArtistNetworkClient
          records={records}
          loading={false}
          error={error}
        />
      </div>
    </div>
  );
}
