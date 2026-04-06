import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const showArchived = searchParams.get("showArchived") === "true";

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  // Sanitise query: strip characters that could break Airtable formula syntax
  const safe = q.replace(/["'\\]/g, "");

  const searchFormula = `OR(SEARCH(LOWER("${safe}"),LOWER({Pseudo Instagram})),SEARCH(LOWER("${safe}"),LOWER({Nom complet})))`;
  const formula = showArchived
    ? searchFormula
    : `AND(${searchFormula},{Statut de contact}!="Archivé")`;

  const params = new URLSearchParams({
    filterByFormula: formula,
    pageSize: "20",
    "fields[]": "Pseudo Instagram",
  });
  params.append("fields[]", "Nom complet");
  params.append("fields[]", "Nombre de followers");
  params.append("fields[]", "Type de profil");
  params.append("fields[]", "Suivi par");
  params.append("fields[]", "Statut de contact");

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return NextResponse.json({ error: `Airtable error: ${res.status} ${body}` }, { status: 500 });
  }

  const data = await res.json();
  const results = (data.records ?? []).map((r: { id: string; fields: Record<string, unknown> }) => ({
    id: r.id,
    username: (r.fields["Pseudo Instagram"] as string) ?? "",
    fullName: (r.fields["Nom complet"] as string) ?? "",
    followers: (r.fields["Nombre de followers"] as number) ?? 0,
    profileType: (r.fields["Type de profil"] as string) ?? "",
    suiviPar: (r.fields["Suivi par"] as string) ?? "",
    statutDeContact: (r.fields["Statut de contact"] as string) ?? "",
  }));

  return NextResponse.json({ results });
}
