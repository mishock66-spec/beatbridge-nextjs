import { NextRequest, NextResponse } from "next/server";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: { recordId: string; position: number }[] = body.updates ?? [];
  if (!updates.length) return NextResponse.json({ ok: true });

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  // Airtable batch update: max 10 records per request
  const chunks: typeof updates[] = [];
  for (let i = 0; i < updates.length; i += 10) {
    chunks.push(updates.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: chunk.map(({ recordId, position }) => ({
          id: recordId,
          fields: { position },
        })),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Airtable error: ${res.status} ${text}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
