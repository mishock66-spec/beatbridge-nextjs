export type MutualContact = {
  username: string;
  fullName: string;
  profileType: string;
  followers: number;
  artists: string[];
  artistCount: number;
};

export type NetworkContact = {
  username: string;
  fullName: string;
  profileType: string;
  followers: number;
  artists: string[];
  isMutual: boolean;
};

export const ARTIST_NAMES = ["Wheezy", "Curren$y", "Harry Fraud"];

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

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

type RawRow = {
  username: string;
  fullName: string;
  profileType: string;
  followers: number;
  suiviPar: string;
};

async function fetchRawRows(): Promise<RawRow[]> {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  if (!API_KEY) throw new Error("Missing AIRTABLE_API_KEY");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
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
      throw new Error(`Airtable error: ${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`);
    }

    const data = await res.json();

    for (const record of data.records as { fields: Record<string, unknown> }[]) {
      const f = record.fields;
      const username = ((f["Pseudo Instagram"] as string) || "")
        .replace("@", "")
        .toLowerCase()
        .trim();
      const raw = f["Suivi par"];
      const suiviParValues: string[] = Array.isArray(raw)
        ? (raw as string[])
        : raw ? [raw as string] : [];

      if (!username || suiviParValues.length === 0) continue;

      for (const sp of suiviParValues) {
        rows.push({
          username,
          fullName: (f["Nom complet"] as string) || "",
          profileType:
            TYPE_MAP[(f["Type de profil"] as string) || ""] ??
            (f["Type de profil"] as string) ??
            "Other",
          followers: (f["Nombre de followers"] as number) || 0,
          suiviPar: ARTIST_ALIAS[sp] ?? sp,
        });
      }
    }

    offset = data.offset || null;
  } while (offset);

  return rows;
}

function groupRows(
  rows: RawRow[]
): Map<string, { fullName: string; profileType: string; followers: number; artists: Set<string> }> {
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

  return byUsername;
}

export async function fetchMutualContacts(): Promise<MutualContact[]> {
  const rows = await fetchRawRows();
  const byUsername = groupRows(rows);

  const mutual: MutualContact[] = [];
  for (const [username, data] of Array.from(byUsername.entries())) {
    if (data.artists.size >= 2) {
      mutual.push({
        username,
        fullName: data.fullName,
        profileType: data.profileType,
        followers: data.followers,
        artists: Array.from(data.artists as Set<string>).sort(),
        artistCount: data.artists.size,
      });
    }
  }

  mutual.sort((a, b) => b.artistCount - a.artistCount || b.followers - a.followers);
  return mutual;
}

export async function fetchNetworkData(): Promise<{
  artistNames: string[];
  contacts: NetworkContact[];
}> {
  const rows = await fetchRawRows();
  const byUsername = groupRows(rows);

  const contacts: NetworkContact[] = [];
  for (const [username, data] of Array.from(byUsername.entries())) {
    contacts.push({
      username,
      fullName: data.fullName,
      profileType: data.profileType,
      followers: data.followers,
      artists: Array.from(data.artists).sort(),
      isMutual: data.artists.size >= 2,
    });
  }

  contacts.sort((a, b) => b.followers - a.followers);
  return { artistNames: ARTIST_NAMES, contacts };
}
