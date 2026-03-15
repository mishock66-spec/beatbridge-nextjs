export const revalidate = 0;

import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_TEMPLATE = (subject: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="https://beatbridge-nextjs.vercel.app" style="text-decoration:none;">
                <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Beat<span style="color:#f97316;">Bridge</span></span>
              </a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #1f1f1f;padding-bottom:32px;"></td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:40px;">
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.7;color:#d1d5db;white-space:pre-line;">${body}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                You're receiving this because you joined the BeatBridge waitlist.<br/>
                <a href="https://beatbridge-nextjs.vercel.app" style="color:#f97316;text-decoration:none;">beatbridge-nextjs.vercel.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-newsletter-secret");
    if (secret !== process.env.NEWSLETTER_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, body, from } = await req.json();

    if (!subject || !body) {
      return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId || audienceId === "REPLACE_WITH_AUDIENCE_ID_FROM_RESEND_DASHBOARD") {
      return NextResponse.json({ error: "Audience not configured" }, { status: 500 });
    }

    const result = await resend.broadcasts.create({
      audienceId,
      from: from || "BeatBridge <onboarding@resend.dev>",
      subject,
      html: EMAIL_TEMPLATE(subject, body),
    });

    const broadcastId = (result.data as { id?: string })?.id;
    if (broadcastId) {
      await resend.broadcasts.send(broadcastId);
    }

    return NextResponse.json({ success: true, broadcastId });
  } catch (err) {
    console.error("Newsletter send error:", err);
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 });
  }
}
