import { Suspense } from "react";
import { fetchAllAirtableGrouped } from "@/lib/airtable";
import DashboardClient from "@/components/DashboardClient";
import SuccessToast from "@/components/SuccessToast";

export const revalidate = 0;

// Metadata for known artists — slug + photo path.
// Any artist in Airtable without an entry here gets a generated slug and no photo.
const ARTIST_METADATA: Record<string, { slug: string; photo: string }> = {
  "Curren$y":   { slug: "currensy",    photo: "/images/currensy.png" },
  "Harry Fraud": { slug: "harry-fraud", photo: "/images/harryfraud.jpg" },
  "Wheezy":     { slug: "wheezy",      photo: "/images/wheezy.jpg" },
  "Juke Wong":  { slug: "juke-wong",   photo: "/artists/juke-wong.jpg" },
};

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
