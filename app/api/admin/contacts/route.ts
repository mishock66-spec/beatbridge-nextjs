import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

export type ContactFull = {
  id: string;
  username: string;
  fullName: string;
  followers: number;
  profileType: string;
  suiviPar: string;
  hasTemplate: boolean;
  hasBio: boolean;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "";

  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  const records: ContactFull[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    params.append("fields[]", "Pseudo Instagram");
    params.append("fields[]", "Nom complet");
    params.append("fields[]", "Nombre de followers");
    params.append("fields[]", "Type de profil");
    params.append("fields[]", "Suivi par");
    params.append("fields[]", "template");
    params.append("fields[]", "Notes");
    if (offset) params.set("offset", offset);

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Airtable error: ${res.status} ${text}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    for (const r of data.records ?? []) {
      records.push({
        id: r.id,
        username: ((r.fields["Pseudo Instagram"] as string) ?? "").toLowerCase().replace(/^@/, "").trim(),
        fullName: (r.fields["Nom complet"] as string) ?? "",
        followers: (r.fields["Nombre de followers"] as number) ?? 0,
        profileType: (r.fields["Type de profil"] as string) ?? "",
        suiviPar: (r.fields["Suivi par"] as string) ?? "",
        hasTemplate: !!((r.fields["template"] as string) ?? ""),
        hasBio: !!((r.fields["Notes"] as string) ?? ""),
      });
    }
    offset = data.offset as string | undefined;
  } while (offset);

  return NextResponse.json({ records });
}
