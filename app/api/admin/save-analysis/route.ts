import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ANALYZER_SECRET || "beatbridge-analyzer-2026";
const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

type AnalysisResult = {
  record_id: string;
  username: string;
  profile_type?: string;
  template?: string;
  analysis_note?: string;
};

async function updateRecord(apiKey: string, result: AnalysisResult): Promise<void> {
  // Fetch current Notes to append (not overwrite)
  const getRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${result.record_id}?fields[]=fldpLozVCrvYj62i0`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }
  );
  const existing = getRes.ok ? await getRes.json() : null;
  const existingNotes: string = existing?.fields?.fldpLozVCrvYj62i0 || "";

  const newNotes = result.analysis_note
    ? existingNotes
      ? `${existingNotes}\n— Analysis: ${result.analysis_note}`
      : `— Analysis: ${result.analysis_note}`
    : existingNotes;

  const fields: Record<string, unknown> = {
    fldLRttkukXJiVs0u: true, // analyzed checkbox
  };
  if (result.profile_type) fields["fld8dCqjrnqCsRSog"] = result.profile_type;
  if (result.template)     fields["fldy8ho1lxBh8iB3n"] = result.template;
  if (newNotes)            fields["fldpLozVCrvYj62i0"] = newNotes;

  const patchRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${result.record_id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => "");
    throw new Error(`Airtable ${patchRes.status}: ${text.slice(0, 200)}`);
  }
}

export async function POST(req: NextRequest) {
  let body: { adminSecret?: string; results?: AnalysisResult[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.adminSecret || body.adminSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!Array.isArray(body.results) || body.results.length === 0) {
    return NextResponse.json({ error: "results must be a non-empty array" }, { status: 400 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });
  }

  let updated = 0;
  const errors: { username: string; error: string }[] = [];

  for (const result of body.results) {
    if (!result.record_id) {
      errors.push({ username: result.username || "?", error: "Missing record_id" });
      continue;
    }
    try {
      await updateRecord(apiKey, result);
      updated++;
    } catch (err) {
      errors.push({
        username: result.username || result.record_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ success: true, updated, errors });
}
