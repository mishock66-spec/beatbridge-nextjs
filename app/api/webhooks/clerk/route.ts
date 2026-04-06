export const revalidate = 0;

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Get Svix headers for verification
  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Verify the webhook
  const body = await req.text();
  const wh = new Webhook(webhookSecret);
  let event: { type: string; data: Record<string, unknown> };

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const data = event.data;

    const emailAddresses = data.email_addresses as Array<{ email_address: string }> | undefined;
    const primaryEmailId = data.primary_email_address_id as string | undefined;
    const primaryEmailObj = emailAddresses?.find(
      (e) => (data.email_addresses as Array<{ id: string; email_address: string }>)
        ?.find((x) => x.id === primaryEmailId)?.email_address === e.email_address
    );
    const userEmail = primaryEmailObj?.email_address ?? emailAddresses?.[0]?.email_address ?? "Unknown";

    const firstName = (data.first_name as string) || "";
    const lastName = (data.last_name as string) || "";

    // Derive a display name: "First Last", or email prefix if no name provided
    const derivedName =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      (userEmail !== "Unknown" ? userEmail.split("@")[0] : "");

    // Create Supabase profile immediately on sign-up
    const newUserId = data.id as string;
    if (newUserId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const now = new Date().toISOString();
      await supabase.from("user_profiles").upsert(
        {
          user_id: newUserId,
          producer_name: derivedName || null,
          plan: "free",
          subscription_status: "free",
          trial_start: now,
          onboarding_completed: false,
          created_at: now,
        },
        { onConflict: "user_id" }
      );
    }
    const fullName = derivedName || "No name provided";

    const createdAt = data.created_at as number;
    const signUpDate = createdAt
      ? new Date(createdAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "long", timeStyle: "short" }) + " UTC"
      : new Date().toUTCString();

    // Admin notification
    await resend.emails.send({
      from: "BeatBridge <onboarding@resend.dev>",
      to: "contact@beatbridge.live",
      subject: "🎹 New BeatBridge signup!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f0f0f; color: #f1f1f1; border-radius: 8px;">
          <h2 style="color: #f97316; margin-bottom: 8px;">🎹 New BeatBridge Signup</h2>
          <p style="color: #a3a3a3; margin-bottom: 24px;">Someone just joined the platform.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; color: #a3a3a3; width: 40%;">Email</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; color: #f1f1f1;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; color: #a3a3a3;">Full Name</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; color: #f1f1f1;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #a3a3a3;">Signed Up</td>
              <td style="padding: 10px 0; color: #f1f1f1;">${signUpDate}</td>
            </tr>
          </table>
        </div>
      `,
    });

    // Welcome email to new user
    if (userEmail && userEmail !== "Unknown") {
      await resend.emails.send({
        from: "BeatBridge <onboarding@resend.dev>",
        to: userEmail,
        subject: "Welcome to BeatBridge 🎹",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <div style="max-width:560px;margin:40px auto;padding:0 16px;">

              <!-- Header -->
              <div style="text-align:center;padding:40px 0 32px;">
                <span style="font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">
                  Beat<span style="color:#f97316;">Bridge</span>
                </span>
              </div>

              <!-- Card -->
              <div style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:40px 36px;">

                <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                  Welcome to BeatBridge${firstName ? `, ${firstName}` : ""}!
                </h1>

                <p style="margin:0 0 20px;font-size:15px;color:#a0a0a0;line-height:1.6;">
                  You now have access to the hip-hop networking tool built for beatmakers like you.
                </p>

                <p style="margin:0 0 32px;font-size:15px;color:#a0a0a0;line-height:1.6;">
                  Start by exploring <strong style="color:#ffffff;">Curren$y</strong> or
                  <strong style="color:#ffffff;">Harry Fraud</strong>'s network — find producers,
                  engineers, managers and labels, and use the built-in DM templates to reach out
                  the right way.
                </p>

                <!-- CTA Button -->
                <div style="text-align:center;margin-bottom:8px;">
                  <a href="https://beatbridge.live/artists"
                     style="display:inline-block;background:linear-gradient(135deg,#f97316,#f85c00);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.01em;">
                    Explore Networks →
                  </a>
                </div>

              </div>

              <!-- Footer -->
              <div style="text-align:center;padding:28px 0 40px;">
                <p style="margin:0;font-size:13px;color:#404040;line-height:1.6;">
                  Questions?
                  <a href="mailto:contact@beatbridge.live"
                     style="color:#606060;text-decoration:none;">
                    contact@beatbridge.live
                  </a>
                </p>
              </div>

            </div>
          </body>
          </html>
        `,
      });
    }
  }

  return NextResponse.json({ received: true });
}
