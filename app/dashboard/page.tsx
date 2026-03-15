import { fetchAirtableRecords } from "@/lib/airtable";
import DashboardClient from "@/components/DashboardClient";

export const revalidate = 0;

const ARTISTS = [
  {
    slug: "currensy",
    name: "Curren$y",
    suiviPar: ["Curren$y", "CurrenSy"] as string | string[],
    photo: "/images/currensy.png",
  },
  {
    slug: "harry-fraud",
    name: "Harry Fraud",
    suiviPar: "Harry Fraud" as string | string[],
    photo: "/images/harryfraud.jpg",
  },
];

export default async function DashboardPage() {
  const artists = await Promise.all(
    ARTISTS.map(async (artist) => {
      try {
        const records = await fetchAirtableRecords(artist.suiviPar);
        return { slug: artist.slug, name: artist.name, photo: artist.photo, records };
      } catch {
        return { slug: artist.slug, name: artist.name, photo: artist.photo, records: [] };
      }
    })
  );

  return <DashboardClient artists={artists} />;
}
