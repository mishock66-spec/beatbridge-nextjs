import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAirtableRecords } from "@/lib/airtable";
import { contactScore } from "@/lib/scoreContact";

const ARTISTS = [
  { slug: "currensy",    name: "Curren$y",    suiviPar: ["Curren$y", "CurrenSy"] as string | string[] },
  { slug: "harry-fraud", name: "Harry Fraud", suiviPar: "Harry Fraud"             as string | string[] },
];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all contacts for all artists in parallel
    const artistContacts = await Promise.all(
      ARTISTS.map(async (artist) => {
        try {
          const records = await fetchAirtableRecords(artist.suiviPar);
          return records.map((record) => ({
            record,
            artistSlug: artist.slug,
            artistName: artist.name,
          }));
        } catch {
          return [];
        }
      })
    );
    const allContacts = artistContacts.flat();

    // Find contacts that already have a generated ice_breaker for this user
    const { data: existing } = await supabase
      .from("dm_status")
      .select("artist_slug, username")
      .eq("user_id", userId)
      .not("ice_breaker", "is", null);

    const alreadyGenerated = new Set(
      (existing ?? []).map((r) => `${r.artist_slug}__${r.username}`)
    );

    // Filter out already-generated and sort by score descending
    const toGenerate = allContacts
      .filter(({ record, artistSlug }) => {
        const username = record.username.replace("@", "");
        return !alreadyGenerated.has(`${artistSlug}__${username}`);
      })
      .sort((a, b) => contactScore(b.record) - contactScore(a.record));

    return NextResponse.json({
      contacts: toGenerate.map(({ record, artistSlug, artistName }) => ({
        username:    record.username.replace("@", ""),
        fullName:    record.fullName,
        profileType: record.profileType,
        followers:   record.followers,
        description: record.description,
        artistSlug,
        artistName,
      })),
    });
  } catch (err) {
    console.error("[get-contacts-for-generation]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
