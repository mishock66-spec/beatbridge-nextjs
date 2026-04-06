import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

async function fetchClerkEmailMap(): Promise<Record<string, string>> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return {};
  const map: Record<string, string> = {};
  try {
    const res = await fetch("https://api.clerk.com/v1/users?limit=500", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!res.ok) return {};
    const users = await res.json();
    for (const u of Array.isArray(users) ? users : []) {
      const email = u.email_addresses?.[0]?.email_address ?? "";
      if (u.id && email) map[u.id] = email;
    }
  } catch {
    // ignore
  }
  return map;
}

function buildEmailHtml(title: string, body: string, name?: string): string {
  // Convert basic markdown-ish newlines to <br>
  const htmlBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="text-align:center;padding:36px 0 28px;">
      <span style="font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">
        Beat<span style="color:#f97316;">Bridge</span>
      </span>
    </div>
    <div style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:36px 32px;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${title}</h2>
      ${name ? `<p style="margin:0 0 16px;font-size:14px;color:#606060;">Hi ${name},</p>` : ""}
      <div style="font-size:15px;color:#a0a0a0;line-height:1.7;">${htmlBody}</div>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1f1f1f;">
        <a href="https://beatbridge.live/inbox"
           style="display:inline-block;background:linear-gradient(135deg,#f97316,#f85c00);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
          View in inbox →
        </a>
      </div>
    </div>
    <div style="text-align:center;padding:24px 0 36px;">
      <p style="margin:0;font-size:12px;color:#404040;">
        BeatBridge · <a href="https://beatbridge.live" style="color:#606060;text-decoration:none;">beatbridge.live</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const { title, body: msgBody, type = "update", recipientUserId } = body as {
    title: string;
    body: string;
    type: string;
    recipientUserId?: string;
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  const batchId = crypto.randomUUID();
  const isBroadcast = !recipientUserId;

  // ── Gather recipients ────────────────────────────────────────────────────
  let recipients: { userId: string; email: string; name: string }[] = [];

  if (isBroadcast) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, producer_name");
    const emailMap = await fetchClerkEmailMap();
    recipients = (profiles ?? []).map((p) => ({
      userId: p.user_id,
      email: emailMap[p.user_id] ?? "",
      name: p.producer_name ?? "",
    }));
  } else {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("producer_name")
      .eq("user_id", recipientUserId)
      .single();
    const emailMap = await fetchClerkEmailMap();
    recipients = [{
      userId: recipientUserId,
      email: emailMap[recipientUserId] ?? "",
      name: profile?.producer_name ?? "",
    }];
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  // ── Insert messages in Supabase ──────────────────────────────────────────
  const rows = recipients.map((r) => ({
    batch_id: batchId,
    user_id: r.userId,
    title,
    body: msgBody,
    type,
    read: false,
    is_broadcast: isBroadcast,
  }));

  const { error: insertError } = await supabase.from("messages").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Send emails via Resend ───────────────────────────────────────────────
  let emailsSent = 0;
  for (const r of recipients) {
    if (!r.email) continue;
    try {
      await resend.emails.send({
        from: "BeatBridge <updates@beatbridge.live>",
        to: r.email,
        subject: title,
        html: buildEmailHtml(title, msgBody, r.name || undefined),
      });
      emailsSent++;
    } catch {
      // log but don't fail the whole request
    }
  }

  return NextResponse.json({
    ok: true,
    recipientCount: recipients.length,
    emailsSent,
    batchId,
  });
}

// ── Helper exported for reuse in webhook ─────────────────────────────────────
export { buildEmailHtml };
