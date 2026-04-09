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

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
  const contacts: AnalysisContact[] = [];
  let offset: string | null = null;

  const fields = [
    "Pseudo Instagram",
    "Nom complet",
    "Nombre de followers",
    "Type de profil",
    "Suivi par",
    "template",
    "Notes",
    "analyzed",
  ];

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
      return NextResponse.json({ error: `Airtable error: ${res.status} ${text}` }, { status: 500 });
    }

    const data = await res.json();
    for (const record of data.records as { id: string; fields: Record<string, unknown> }[]) {
      if (!Object.keys(record.fields).length) continue;
      const f = record.fields;
      contacts.push({
        id: record.id,
        username: (f["Pseudo Instagram"] as string) || "",
        fullName: (f["Nom complet"] as string) || "",
        followers: (f["Nombre de followers"] as number) || 0,
        profileType: (f["Type de profil"] as string) || "Autre",
        suiviPar: (f["Suivi par"] as string) || "",
        template: (f["template"] as string) || "",
        bio: (f["Notes"] as string) || "",
        analyzed: Boolean(f["analyzed"]),
      });
    }
    offset = data.offset || null;
  } while (offset);

  const totalAnalyzed = contacts.filter((c) => c.analyzed).length;
  const totalPending = contacts.filter((c) => !c.analyzed).length;

  return NextResponse.json({ contacts, totalAnalyzed, totalPending });
}
