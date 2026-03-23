export const revalidate = 0;

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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

    // Extract user info
    const emailAddresses = data.email_addresses as Array<{ email_address: string }> | undefined;
    const primaryEmailId = data.primary_email_address_id as string | undefined;
    const primaryEmailObj = emailAddresses?.find(
      (e) => (data.email_addresses as Array<{ id: string; email_address: string }>)
        ?.find((x) => x.id === primaryEmailId)?.email_address === e.email_address
    );
    const userEmail = primaryEmailObj?.email_address ?? emailAddresses?.[0]?.email_address ?? "Unknown";

    const firstName = (data.first_name as string) || "";
    const lastName = (data.last_name as string) || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "No name provided";

    const createdAt = data.created_at as number;
    const signUpDate = createdAt
      ? new Date(createdAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "long", timeStyle: "short" }) + " UTC"
      : new Date().toUTCString();

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
  }

  return NextResponse.json({ received: true });
}
