export const revalidate = 0;

import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId || audienceId === "REPLACE_WITH_AUDIENCE_ID_FROM_RESEND_DASHBOARD") {
      return NextResponse.json({ error: "Audience not configured" }, { status: 500 });
    }

    await resend.contacts.create({
      email: email.trim().toLowerCase(),
      audienceId,
      unsubscribed: false,
    });

    const dateSubscribed = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "long",
      timeStyle: "short",
    }) + " UTC";

    await resend.emails.send({
      from: "BeatBridge <onboarding@resend.dev>",
      to: "mishock66@gmail.com",
      subject: "📧 New BeatBridge newsletter subscriber!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f0f0f; color: #f1f1f1; border-radius: 8px;">
          <h2 style="color: #f97316; margin-bottom: 8px;">📧 New Newsletter Subscriber</h2>
          <p style="color: #a3a3a3; margin-bottom: 24px;">Someone just signed up for the BeatBridge newsletter.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; color: #a3a3a3; width: 40%;">Email</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; color: #f1f1f1;">${email.trim().toLowerCase()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #a3a3a3;">Date Subscribed</td>
              <td style="padding: 10px 0; color: #f1f1f1;">${dateSubscribed}</td>
            </tr>
          </table>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
