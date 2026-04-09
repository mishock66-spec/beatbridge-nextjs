import { NextRequest, NextResponse } from "next/server";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const RAILWAY_URL =
  process.env.ANALYZER_WEBHOOK_URL ||
  "https://beatbridge-analyzer-production.up.railway.app";

const ANALYZER_SECRET =
  process.env.ANALYZER_SECRET || "beatbridge-analyzer-2026";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.userId || !Array.isArray(body?.contacts)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.contacts.length === 0) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${RAILWAY_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contacts: body.contacts,
        apiSecret: ANALYZER_SECRET,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not reach analyzer service: ${err instanceof Error ? err.message : "Network error"}` },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Analyzer error: ${res.status} ${text}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
