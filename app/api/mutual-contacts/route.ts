import { NextResponse } from "next/server";

export const revalidate = 0;

// Normalise alternate spellings to canonical artist names
const ARTIST_ALIAS: Record<string, string> = {
  "CurrenSy": "Curren$y",
  "Curren$y": "Curren$y",
  "Harry Fraud": "Harry Fraud",
  "Wheezy": "Wheezy",
};

const TYPE_MAP: Record<string, string> = {
  "Beatmaker/Producteur": "Producer",
  "Beatmaker": "Producer",
  "Producteur": "Producer",
  "Producer / Beatmaker": "Producer",
  "Ingé son": "Sound Engineer",
  "Engineer": "Sound Engineer",
  "Artiste/Rappeur": "Artist/Rapper",
  "Artiste": "Artist/Rapper",
  "Rappeur": "Artist/Rapper",
  "Artist": "Artist/Rapper",
  "Photographe/Vidéaste": "Photographer/Videographer",
  "Photographe": "Photographer/Videographer",
  "Vidéaste": "Photographer/Videographer",
  "Autre": "Other",
  "Entourage": "Other",
  "Entrepreneur": "Other",
  "Journalist": "Other",
  "Media": "Other",
};

export type MutualContact = {
  username: string;
  fullName: string;
  profileType: string;
  followers: number;
  artists: string[];
  artistCount: number;
};

export async function GET() {
  const BASE_ID = "appW42oNhB9Hl14bq";
  const TABLE_ID = "tbl0nVXbK5BQnU5FM";
  const API_KEY = process.env.AIRTABLE_API_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

  type RawRow = {
    username: string;
    fullName: string;
    profileType: string;
    followers: number;
    suiviPar: string;
  };

  const rows: RawRow[] = [];
  let offset: string | null = null;

  do {
    const parts = [
      "pageSize=100",
      "fields[]=" + encodeURIComponent("Pseudo Instagram"),
      "fields[]=" + encodeURIComponent("Nom complet"),
      "fields[]=" + encodeURIComponent("Type de profil"),
      "fields[]=" + encodeURIComponent("Nombre de followers"),
      "fields[]=" + encodeURIComponent("Suivi par"),
    ];
    if (offset) parts.push("offset=" + encodeURIComponent(offset));

    const res = await fetch(`${url}?${parts.join("&")}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Airtable error: ${res.status} ${res.statusText}${body ? ` — ${body}` : ""}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    for (const record of data.records as { fields: Record<string, unknown> }[]) {
      const f = record.fields;
      const username = ((f["Pseudo Instagram"] as string) || "").replace("@", "").toLowerCase().trim();
      // "Suivi par" may be a string or an array (multi-select)
      const raw = f["Suivi par"];
      const suiviParValues: string[] = Array.isArray(raw)
        ? (raw as string[])
        : raw ? [raw as string] : [];

      if (!username || suiviParValues.length === 0) continue;

      for (const sp of suiviParValues) {
        rows.push({
          username,
          fullName: (f["Nom complet"] as string) || "",
          profileType: TYPE_MAP[(f["Type de profil"] as string) || ""] ?? (f["Type de profil"] as string) ?? "Other",
          followers: (f["Nombre de followers"] as number) || 0,
          suiviPar: ARTIST_ALIAS[sp] ?? sp,
        });
      }
    }

    offset = data.offset || null;
  } while (offset);

  // Group by username, collecting unique artist names
  const byUsername = new Map<
    string,
    { fullName: string; profileType: string; followers: number; artists: Set<string> }
  >();

  for (const row of rows) {
    if (!byUsername.has(row.username)) {
      byUsername.set(row.username, {
        fullName: row.fullName,
        profileType: row.profileType,
        followers: row.followers,
        artists: new Set(),
      });
    }
    byUsername.get(row.username)!.artists.add(row.suiviPar);
  }

  // Keep only contacts in 2+ networks
  const mutual: MutualContact[] = [];
  for (const [username, data] of byUsername.entries()) {
    if (data.artists.size >= 2) {
      mutual.push({
        username,
        fullName: data.fullName,
        profileType: data.profileType,
        followers: data.followers,
        artists: Array.from(data.artists).sort(),
        artistCount: data.artists.size,
      });
    }
  }

  // Sort: more networks first, then by followers desc
  mutual.sort((a, b) => b.artistCount - a.artistCount || b.followers - a.followers);

  return NextResponse.json({ contacts: mutual });
}
