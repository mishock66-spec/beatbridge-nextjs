import { NextRequest, NextResponse } from "next/server";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  const artistName: string = body.artistName ?? "";

  // 1. Fetch current record to get existing Notes
  const getRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${params.recordId}?fields[]=Notes`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!getRes.ok) {
    const text = await getRes.text().catch(() => "");
    return NextResponse.json({ error: `Airtable error: ${getRes.status} ${text}` }, { status: 500 });
  }
  const record = await getRes.json();
  const existingNotes: string = (record.fields?.Notes as string) ?? "";

  const archiveNote = artistName
    ? `\n[ARCHIVED] Page no longer exists or no longer followed by ${artistName}`
    : `\n[ARCHIVED] Page no longer exists`;
  const newNotes = existingNotes ? existingNotes + archiveNote : archiveNote.trimStart();

  // 2. PATCH the record: set Statut de contact = "Archivé" and append to Notes
  const patchRes = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${params.recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Statut de contact": "Archivé",
          Notes: newNotes,
        },
      }),
    }
  );

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => "");
    return NextResponse.json({ error: `Airtable error: ${patchRes.status} ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
