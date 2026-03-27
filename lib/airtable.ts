export type AirtableRecord = {
  id: string;
  username: string;
  fullName: string;
  profileUrl: string;
  followers: number;
  profileType: string;
  template: string;
  description: string;
  instagramDmId: string;
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
    description: (f["Notes"] as string) || "",
    instagramDmId: (f["Instagram DM ID"] as string) || "",
  };
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

  do {
    const params = new URLSearchParams({
      pageSize: "100",
      filterByFormula: suivi,
    });
    params.append("fields[]", "Pseudo Instagram");
    if (offset) params.set("offset", offset);

    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Airtable error: ${res.status} ${res.statusText}`);

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
    const params = new URLSearchParams({
      pageSize: "100",
      "sort[0][field]": "Nombre de followers",
      "sort[0][direction]": "asc",
    });

    const conditions: string[] = [];
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
      params.set(
        "filterByFormula",
        conditions.length === 1 ? conditions[0] : `AND(${conditions.join(",")})`
      );
    }

    if (offset) params.set("offset", offset);

    const res = await fetch(`${url}?${params}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: 3600 }, // revalidate every hour
    });

    if (!res.ok) {
      throw new Error(`Airtable error: ${res.status} ${res.statusText}`);
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
