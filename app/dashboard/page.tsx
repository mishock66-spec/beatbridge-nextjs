import { Suspense } from "react";
import { fetchAllAirtableGrouped } from "@/lib/airtable";
import DashboardClient from "@/components/DashboardClient";
import SuccessToast from "@/components/SuccessToast";
import { ARTISTS_CONFIG } from "@/lib/artists.config";

export const revalidate = 0;

// Derived from config — maps "Suivi par" value → { slug, photo }
const ARTIST_METADATA: Record<string, { slug: string; photo: string }> =
  ARTISTS_CONFIG.reduce(
    (acc, artist) => {
      const keys = Array.isArray(artist.airtableFilter)
        ? artist.airtableFilter
        : [artist.airtableFilter];
      keys.forEach((key) => {
        acc[key] = { slug: artist.slug, photo: artist.photo };
      });
      return acc;
    },
    {} as Record<string, { slug: string; photo: string }>
  );


export default async function DashboardPage() {
  let groups: { artistName: string; records: import("@/lib/airtable").AirtableRecord[] }[] = [];
  try {
    groups = await fetchAllAirtableGrouped();
  } catch {
    groups = [];
  }

  const artists = groups.map(({ artistName, records }) => {
    const meta = ARTIST_METADATA[artistName] ?? {
      slug: artistName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      photo: "",
    };
    return { slug: meta.slug, name: artistName, photo: meta.photo, records };
  });

  return (
    <>
      <Suspense fallback={null}>
        <SuccessToast />
      </Suspense>
      <DashboardClient artists={artists} />
    </>
  );
}
