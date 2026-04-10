import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ANALYZER_SECRET || "beatbridge-analyzer-2026";
const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

// Field IDs for Airtable (used instead of field names to avoid mismatch)
// fldNrahDUrSgVljvc — Pseudo Instagram (username)
// fldJEVNir9beLv8Ph — Nom complet (full name)
// fldKKIDVHyYSg2lNh — Lien profil (profile URL)
// fldvT6sZIjc1ypnMw — Nombre de followers
// fld8dCqjrnqCsRSog — Type de profil
// fldgITyqXWRJMA5tV — Statut de contact
// fld7C9ekFhBlwcy2L — Suivi par (artist)
// fldpLozVCrvYj62i0 — Notes (bio)
// fldy8ho1lxBh8iB3n — template

type ImportRecord = {
  username?: string;
  fullName?: string;
  profileUrl?: string;
  followers?: number;
  profileType?: string;
  suiviPar?: string;
  bio?: string;
  template?: string;
};

async function batchCreate(
  apiKey: string,
  records: ImportRecord[]
): Promise<{ created: number; errors: string[] }> {
  const BATCH = 10;
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const airtableRecords = batch.map((r) => {
      const fields: Record<string, unknown> = {
        fldgITyqXWRJMA5tV: "À contacter", // Statut de contact default
      };
      if (r.username)    fields["fldNrahDUrSgVljvc"] = r.username.replace(/^@/, "");
      if (r.fullName)    fields["fldJEVNir9beLv8Ph"] = r.fullName;
      if (r.profileUrl)  fields["fldKKIDVHyYSg2lNh"] = r.profileUrl;
      if (r.followers)   fields["fldvT6sZIjc1ypnMw"] = r.followers;
      if (r.profileType) fields["fld8dCqjrnqCsRSog"] = r.profileType;
      if (r.suiviPar)    fields["fld7C9ekFhBlwcy2L"] = r.suiviPar;
      if (r.bio)         fields["fldpLozVCrvYj62i0"] = r.bio;
      if (r.template)    fields["fldy8ho1lxBh8iB3n"] = r.template;
      return { fields };
    });

    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: airtableRecords }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${res.status} ${text.slice(0, 100)}`);
    } else {
      const data = await res.json();
      created += (data.records ?? []).length;
    }
  }

  return { created, errors };
}

export async function POST(req: NextRequest) {
  let body: { adminSecret?: string; records?: ImportRecord[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.adminSecret || body.adminSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json({ error: "records must be a non-empty array" }, { status: 400 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });
  }

  const { created, errors } = await batchCreate(apiKey, body.records);
  return NextResponse.json({ success: true, imported: created, errors });
}
