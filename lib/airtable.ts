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
    profileType: (f["Type de profil"] as string) || "Other",
    template: (f["template"] as string) || "",
    description: (f["Analyse de profil"] as string) || "",
    instagramDmId: (f["Instagram DM ID"] as string) || "",
  };
}

export async function fetchAirtableRecords(suiviPar?: string): Promise<AirtableRecord[]> {
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
    const params = new URLSearchParams({ pageSize: "100" });
    if (suiviPar) params.set("filterByFormula", `{Suivi par}="${suiviPar}"`);
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
