import { NextRequest, NextResponse } from "next/server";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

export type AnalysisContact = {
  id: string;
  username: string;
  fullName: string;
  followers: number;
  profileType: string;
  suiviPar: string;
  template: string;
  bio: string;
  analyzed: boolean;
};

const BASE_FIELDS = [
  "Pseudo Instagram",
  "Nom complet",
  "Nombre de followers",
  "Type de profil",
  "Suivi par",
  "template",
  "Notes",
];

async function fetchAllPages(
  apiKey: string,
  fields: string[]
): Promise<{ records: { id: string; fields: Record<string, unknown> }[]; error?: string }> {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  const records: { id: string; fields: Record<string, unknown> }[] = [];
  let offset: string | null = null;

  do {
    const parts: string[] = [
      "pageSize=100",
      ...fields.map((f) => "fields[]=" + encodeURIComponent(f)),
      "filterByFormula=" + encodeURIComponent(`{Statut de contact}!="Archivé"`),
    ];
    if (offset) parts.push("offset=" + encodeURIComponent(offset));

    const res = await fetch(`${url}?${parts.join("&")}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { records: [], error: `${res.status} ${text}` };
    }

    const data = await res.json();
    for (const r of data.records as { id: string; fields: Record<string, unknown> }[]) {
      if (Object.keys(r.fields).length > 0) records.push(r);
    }
    offset = data.offset || null;
  } while (offset);

  return { records };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  // Try with the "analyzed" field first; if Airtable rejects it (field doesn't exist yet),
  // fall back to fetching without it — all contacts will be treated as not-yet-analyzed.
  let result = await fetchAllPages(apiKey, [...BASE_FIELDS, "analyzed"]);
  let analyzedFieldExists = true;

  if (result.error) {
    // Unknown field error from Airtable (422 or error body mentions "analyzed")
    const isFieldError =
      result.error.includes("Unknown field") ||
      result.error.includes("analyzed") ||
      result.error.startsWith("422");

    if (isFieldError) {
      // Retry without the analyzed field
      result = await fetchAllPages(apiKey, BASE_FIELDS);
      analyzedFieldExists = false;
    } else {
      return NextResponse.json({ error: `Airtable error: ${result.error}` }, { status: 500 });
    }
  }

  if (result.error) {
    return NextResponse.json({ error: `Airtable error: ${result.error}` }, { status: 500 });
  }

  const contacts: AnalysisContact[] = result.records.map((record) => {
    const f = record.fields;
    return {
      id: record.id,
      username: (f["Pseudo Instagram"] as string) || "",
      fullName: (f["Nom complet"] as string) || "",
      followers: (f["Nombre de followers"] as number) || 0,
      profileType: (f["Type de profil"] as string) || "Autre",
      suiviPar: (f["Suivi par"] as string) || "",
      template: (f["template"] as string) || "",
      bio: (f["Notes"] as string) || "",
      // If the field doesn't exist in Airtable, treat all contacts as not-yet-analyzed
      analyzed: analyzedFieldExists ? Boolean(f["analyzed"]) : false,
    };
  });

  const totalAnalyzed = contacts.filter((c) => c.analyzed).length;
  const totalPending = contacts.filter((c) => !c.analyzed).length;

  return NextResponse.json({ contacts, totalAnalyzed, totalPending, analyzedFieldExists });
}
