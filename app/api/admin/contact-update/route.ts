import { NextRequest, NextResponse } from "next/server";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !body?.recordId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  const fields: Record<string, unknown> = {};
  if (body.followers !== undefined) fields["Nombre de followers"] = Number(body.followers);
  if (body.profileType !== undefined) fields["Type de profil"] = String(body.profileType);
  if (body.fullName !== undefined) fields["Nom complet"] = String(body.fullName);
  if (body.username !== undefined) fields["Pseudo Instagram"] = String(body.username);
  if (body.bio !== undefined) fields["Notes"] = String(body.bio);
  if (body.template !== undefined) fields["template"] = String(body.template);

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{ id: body.recordId, fields }],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `Airtable error: ${res.status} ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
