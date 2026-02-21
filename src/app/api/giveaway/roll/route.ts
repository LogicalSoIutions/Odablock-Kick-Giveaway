import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { giveawayState } from "@/lib/giveaway-state";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const isReRoll = body.reroll === true;

    const winner = isReRoll
      ? giveawayState.reRoll()
      : giveawayState.pickWinner();

    if (!winner) {
      return NextResponse.json(
        { error: "No eligible entrants remaining" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      winner,
      entrants: Array.from(giveawayState.entrants.values()).map((e) => e.username),
      deadline: giveawayState.confirmationDeadline,
    });
  } catch (err) {
    console.error("Error rolling winner:", err);
    return NextResponse.json(
      { error: "Failed to pick winner" },
      { status: 500 }
    );
  }
}
