import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const { collabRequestId, action, userId } = await req.json();

  if (!collabRequestId || !action || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (action !== "accepted" && action !== "declined") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the collab request — verify this user is the receiver
  const { data: collabRequest, error: fetchError } = await supabase
    .from("collab_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("id", collabRequestId)
    .single();

  if (fetchError || !collabRequest) {
    return NextResponse.json({ error: "Collab request not found" }, { status: 404 });
  }
  if (collabRequest.receiver_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (collabRequest.status !== "pending") {
    return NextResponse.json({ error: "Already responded" }, { status: 409 });
  }

  // Update status
  const { error: updateError } = await supabase
    .from("collab_requests")
    .update({ status: action })
    .eq("id", collabRequestId);

  if (updateError) {
    console.error("collab_requests update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If accepted: notify the sender
  if (action === "accepted") {
    // Get receiver's producer_name
    const { data: receiverProfile } = await supabase
      .from("user_profiles")
      .select("producer_name")
      .eq("user_id", userId)
      .single();
    const receiverName = receiverProfile?.producer_name || "A producer";

    const { error: msgError } = await supabase.from("messages").insert({
      batch_id: collabRequestId,
      user_id: collabRequest.sender_id,
      title: `🎉 ${receiverName} accepted your collab request!`,
      body: `${receiverName} accepted your collab request. Reach out and make it happen!`,
      type: "collab_request",
      read: false,
      is_broadcast: false,
    });

    if (msgError) {
      console.error("acceptance message insert error:", msgError);
    }
  }

  return NextResponse.json({ success: true, status: action });
}
