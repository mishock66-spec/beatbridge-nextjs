import Link from "next/link";
import { fetchAirtableRecords } from "@/lib/airtable";
import ArtistNetworkClient from "@/components/ArtistNetworkClient";
import type { AirtableRecord } from "@/lib/airtable";
import { TelegramButton } from "@/components/TelegramButton";

export const revalidate = 0;

export default async function WheezyTopContactsPage() {
  let records: AirtableRecord[] = [];
  let error: string | null = null;

  try {
    const all = await fetchAirtableRecords("Wheezy");
    records = all.filter((r) => r.template.trim() !== "");
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const dmPriorityOrder = [...records]
    .sort((a, b) => a.followers - b.followers)
    .map((r) => r.username);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-10 flex-wrap">
          <Link
            href="/artists"
            className="text-gray-500 hover:text-orange-500 transition-colors"
          >
            All Artists
          </Link>
          <span className="text-gray-600">›</span>
          <Link
            href="/artist/wheezy"
            className="text-gray-500 hover:text-orange-500 transition-colors"
          >
            Wheezy
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-[#a0a0a0]">Top Contacts</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-[#111111] border border-[#1f1f1f] overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/wheezy.jpg"
              alt="Wheezy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-[#606060] text-xs uppercase tracking-[0.1em] mb-1">
              Wheezy · Curated List
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-1">
              Top{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
                Contacts
              </span>
            </h1>
            <p className="text-[#a0a0a0] text-sm">
              Curated music contacts with ready-to-send DM templates
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl px-6 py-4 text-center flex-shrink-0">
            <p className="text-3xl font-black text-orange-500">
              {records.length}
            </p>
            <p className="text-gray-500 text-xs mt-1">Curated contacts</p>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl px-4 py-3 mb-8 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5">★</span>
          <p className="text-sm text-[#a0a0a0] leading-relaxed">
            <span className="text-orange-400 font-semibold">
              These are the highest-value contacts in {"Wheezy's"} network.
            </span>{" "}
            Each one has a curated DM template written specifically for them.
          </p>
        </div>

        {/* Connection grid */}
        <ArtistNetworkClient
          records={records}
          loading={false}
          error={error}
          dmPriorityOrder={dmPriorityOrder}
          artistSlug="wheezy"
        />

        {/* Back to Wheezy */}
        <div className="mt-12 flex justify-center border-t border-[#1f1f1f] pt-8">
          <Link
            href="/artist/wheezy"
            className="text-sm text-gray-500 hover:text-orange-500 transition-colors"
          >
            ← Back to Wheezy
          </Link>
        </div>

        {/* Telegram */}
        <div className="mt-10 border-t border-[#1f1f1f] pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">Got a reply? Share it with the community</p>
          <TelegramButton label="Join Telegram →" />
        </div>
      </div>
    </div>
  );
}
