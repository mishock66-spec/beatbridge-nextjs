export type AirtableRecord = {
  id: string;
  username: string;
  fullName: string;
  profileUrl: string;
  followers: number;
  profileType: string;
  template: string;
  followUp: string;
  description: string;
  instagramDmId: string;
  suiviPar?: string;
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

function normalizeType(raw: string): string {
  return TYPE_MAP[raw] ?? raw;
}

function mapRecord(record: {
  id: string;
  fields: Record<string, unknown>;
}): AirtableRecord {
  const f = record.fields;
  return {
    id: record.id,
    username: (f["Pseudo Instagram"] as string) || "",
    fullName: (f["Nom complet"] as string) || "",
    profileUrl: (f["Lien profil"] as string) || "",
    followers: (f["Nombre de followers"] as number) || 0,
    profileType: normalizeType((f["Type de profil"] as string) || "Other"),
    template: (f["template"] as string) || "",
    followUp: (f["follow_up"] as string) || "",
    description: (f["Notes"] as string) || "",
    instagramDmId: (f["Instagram DM ID"] as string) || "",
    suiviPar: (f["Suivi par"] as string) || "",
  };
}

// Normalize inconsistent "Suivi par" values to canonical artist names
const SUIVIPAR_NORMALIZE: Record<string, string> = {
  "CurrenSy": "Curren$y",
};

const ARTIST_ORDER = ["Curren$y", "Harry Fraud", "Wheezy", "Juke Wong", "Southside"];

export async function fetchAllAirtableGrouped(): Promise<
  { artistName: string; records: AirtableRecord[] }[]
> {
  const all = await fetchAirtableRecords();
  const groups = new Map<string, AirtableRecord[]>();

  for (const record of all) {
    const raw = record.suiviPar ?? "";
    const name = SUIVIPAR_NORMALIZE[raw] ?? raw;
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(record);
  }

  // Sort: predefined order first, then alphabetical for any extras
  const result: { artistName: string; records: AirtableRecord[] }[] = [];
  for (const name of ARTIST_ORDER) {
    if (groups.has(name)) {
      result.push({ artistName: name, records: groups.get(name)! });
      groups.delete(name);
    }
  }
  for (const [name, records] of Array.from(groups).sort(([a], [b]) => a.localeCompare(b))) {
    result.push({ artistName: name, records });
  }
  return result;
}

export async function fetchAirtableCount(
  suiviPar: string | string[]
): Promise<number> {
  const BASE_ID = "appW42oNhB9Hl14bq";
  const TABLE_ID = "tbl0nVXbK5BQnU5FM";
  const API_KEY = process.env.AIRTABLE_API_KEY;

  if (!API_KEY) throw new Error("AIRTABLE_API_KEY environment variable is not set");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  let count = 0;
  let offset: string | null = null;

  const values = Array.isArray(suiviPar) ? suiviPar : [suiviPar];
  const suivi =
    values.length === 1
      ? `{Suivi par}="${values[0]}"`
      : `OR(${values.map((v) => `{Suivi par}="${v}"`).join(",")})`;
  const countFormula = `AND(${suivi},{Statut de contact}!="Archivé")`;

  do {
    const parts: string[] = [
      "pageSize=100",
      "filterByFormula=" + encodeURIComponent(countFormula),
      "fields[]=" + encodeURIComponent("Pseudo Instagram"),
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
    count += (data.records as { fields: Record<string, unknown> }[]).filter(
      (r) => Object.keys(r.fields).length > 0
    ).length;
    offset = data.offset || null;
  } while (offset);

  return count;
}

export async function fetchTotalConnectionsCount(): Promise<number> {
  const BASE_ID = "appW42oNhB9Hl14bq";
  const TABLE_ID = "tbl0nVXbK5BQnU5FM";
  const API_KEY = process.env.AIRTABLE_API_KEY;

  if (!API_KEY) throw new Error("AIRTABLE_API_KEY environment variable is not set");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  let count = 0;
  let offset: string | null = null;

  do {
    const parts: string[] = [
      "pageSize=100",
      "fields[]=" + encodeURIComponent("Pseudo Instagram"),
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
    count += (data.records as { fields: Record<string, unknown> }[]).filter(
      (r) => Object.keys(r.fields).length > 0
    ).length;
    offset = data.offset || null;
  } while (offset);

  return count;
}

export async function fetchAirtableRecords(
  suiviPar?: string | string[],
  followerRange?: { min: number; max: number }
): Promise<AirtableRecord[]> {
  const BASE_ID = "appW42oNhB9Hl14bq";
  const TABLE_ID = "tbl0nVXbK5BQnU5FM";
  const API_KEY = process.env.AIRTABLE_API_KEY;

  if (!API_KEY) {
    throw new Error("AIRTABLE_API_KEY environment variable is not set");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  let all: AirtableRecord[] = [];
  let offset: string | null = null;

  do {
    // Build query string manually — URLSearchParams encodes brackets as %5B%5D
    // which Airtable rejects with 422. Literal brackets are required.
    const parts: string[] = [
      "pageSize=100",
      "sort[0][field]=" + encodeURIComponent("Nombre de followers"),
      "sort[0][direction]=asc",
    ];

    const conditions: string[] = [];
    // Always exclude archived contacts from public-facing pages
    conditions.push(`{Statut de contact}!="Archivé"`);
    if (suiviPar) {
      const values = Array.isArray(suiviPar) ? suiviPar : [suiviPar];
      const suivi =
        values.length === 1
          ? `{Suivi par}="${values[0]}"`
          : `OR(${values.map((v) => `{Suivi par}="${v}"`).join(",")})`;
      conditions.push(suivi);
    }
    if (followerRange) {
      conditions.push(`{Nombre de followers}>=${followerRange.min}`);
      conditions.push(`{Nombre de followers}<=${followerRange.max}`);
    }
    if (conditions.length > 0) {
      const formula =
        conditions.length === 1 ? conditions[0] : `AND(${conditions.join(",")})`;
      parts.push("filterByFormula=" + encodeURIComponent(formula));
    }

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
    const nonEmpty = data.records.filter(
      (r: { fields: Record<string, unknown> }) =>
        Object.keys(r.fields).length > 0
    );
    all = all.concat(nonEmpty.map(mapRecord));
    offset = data.offset || null;
  } while (offset);

  return all;
}
