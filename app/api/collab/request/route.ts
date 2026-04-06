import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { senderId, receiverId, message, beats_link, intent } = await req.json();

  if (!senderId || !receiverId || !message || !intent) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (senderId === receiverId) {
    return NextResponse.json({ error: "Cannot send collab request to yourself" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get sender's producer_name
  const { data: senderProfile } = await supabase
    .from("user_profiles")
    .select("producer_name")
    .eq("user_id", senderId)
    .single();
  const senderName = senderProfile?.producer_name || "A beatmaker";

  // Get receiver's producer_name
  const { data: receiverProfile } = await supabase
    .from("user_profiles")
    .select("producer_name")
    .eq("user_id", receiverId)
    .single();
  const receiverName = receiverProfile?.producer_name || "Producer";

  // Insert collab request
  const { data: collabRequest, error: insertError } = await supabase
    .from("collab_requests")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      message,
      beats_link: beats_link || null,
      intent,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("collab_requests insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const collabRequestId = collabRequest.id;

  // Build inbox message body
  const msgBody = [
    message,
    beats_link ? `\n\nBeats: ${beats_link}` : "",
    `\nLooking for: ${intent}`,
  ].join("");

  // Insert message in receiver's inbox
  const { error: msgError } = await supabase.from("messages").insert({
    batch_id: collabRequestId,
    user_id: receiverId,
    title: `🤝 New collab request from ${senderName}`,
    body: msgBody,
    type: "collab_request",
    read: false,
    is_broadcast: false,
  });

  if (msgError) {
    console.error("messages insert error:", msgError);
  }

  // Get receiver email from Clerk
  try {
    const clerk = await clerkClient();
    const receiverUser = await clerk.users.getUser(receiverId);
    const receiverEmail = receiverUser.emailAddresses.find(
      (e) => e.id === receiverUser.primaryEmailAddressId
    )?.emailAddress;

    if (receiverEmail) {
      await resend.emails.send({
        from: "BeatBridge <updates@beatbridge.live>",
        to: receiverEmail,
        subject: `🤝 ${senderName} wants to collab on BeatBridge`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <div style="max-width:560px;margin:40px auto;padding:0 16px;">
              <div style="text-align:center;padding:40px 0 32px;">
                <span style="font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">
                  Beat<span style="color:#f97316;">Bridge</span>
                </span>
              </div>
              <div style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:40px 36px;">
                <div style="font-size:32px;margin-bottom:16px;">🤝</div>
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                  New collab request, ${receiverName}!
                </h1>
                <p style="margin:0 0 6px;font-size:14px;color:#a0a0a0;">
                  <strong style="color:#ffffff;">${senderName}</strong> wants to collab with you on BeatBridge.
                </p>

                <div style="background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;padding:20px;margin:24px 0;">
                  <p style="margin:0 0 16px;font-size:14px;color:#e0e0e0;line-height:1.6;">${message.replace(/\n/g, "<br>")}</p>
                  ${beats_link ? `<p style="margin:0 0 8px;font-size:13px;color:#a0a0a0;">🎵 <a href="${beats_link}" style="color:#f97316;text-decoration:none;">${beats_link}</a></p>` : ""}
                  <p style="margin:0;font-size:13px;color:#a0a0a0;">Looking for: <span style="color:#e0e0e0;">${intent}</span></p>
                </div>

                <div style="text-align:center;">
                  <a href="https://beatbridge.live/inbox"
                     style="display:inline-block;background:linear-gradient(135deg,#f97316,#f85c00);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:10px;">
                    View in inbox →
                  </a>
                </div>
              </div>
              <div style="text-align:center;padding:28px 0 40px;">
                <p style="margin:0;font-size:13px;color:#404040;">
                  <a href="https://beatbridge.live" style="color:#606060;text-decoration:none;">beatbridge.live</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    }
  } catch (emailErr) {
    console.error("Email send error:", emailErr);
    // Non-fatal — request was already created
  }

  return NextResponse.json({ success: true, collabRequestId });
}
