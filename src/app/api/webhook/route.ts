import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/kick";
import { giveawayState } from "@/lib/giveaway-state";

function hasSubscriberBadge(sender: Record<string, unknown>): boolean {
  const identity = sender?.identity as Record<string, unknown> | null;
  if (!identity) return false;
  const badges = identity.badges as Array<{ type: string }> | undefined;
  if (!badges || !Array.isArray(badges)) return false;
  return badges.some((b) => b.type === "subscriber");
}

export async function POST(request: NextRequest) {
  const messageId = request.headers.get("Kick-Event-Message-Id") || "";
  const timestamp = request.headers.get("Kick-Event-Message-Timestamp") || "";
  const signature = request.headers.get("Kick-Event-Signature") || "";
  const eventType = request.headers.get("Kick-Event-Type") || "";

  const rawBody = await request.text();

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(
    messageId,
    timestamp,
    rawBody,
    signature
  );

  if (!isValid) {
    console.warn("Invalid webhook signature for message:", messageId);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Process chat messages
  if (eventType === "chat.message.sent") {
    try {
      const body = JSON.parse(rawBody);
      const senderId: number = body.sender?.user_id;
      const senderUsername: string = body.sender?.username || "";
      const content: string = body.content || "";
      const isSubscriber = hasSubscriberBadge(body.sender || {});

      if (!senderId) {
        return NextResponse.json({ ok: true });
      }

      // Check for winner confirmation: any message from the winner during countdown
      if (
        giveawayState.winner &&
        !giveawayState.confirmed &&
        !giveawayState.timedOut &&
        giveawayState.winner.userId === senderId
      ) {
        giveawayState.confirmWinner(senderId);
      }

      // Check for giveaway entry: message matches keyword
      if (giveawayState.active && giveawayState.keyword) {
        const normalizedContent = content.trim().toLowerCase();
        const normalizedKeyword = giveawayState.keyword.trim().toLowerCase();

        if (normalizedContent === normalizedKeyword) {
          giveawayState.addEntrant(senderId, senderUsername, isSubscriber);
        }
      }
    } catch (err) {
      console.error("Error processing chat message webhook:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
