import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { giveawayState } from "@/lib/giveaway-state";

export async function POST() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  giveawayState.reset();
  return NextResponse.json({ ok: true, message: "Giveaway reset" });
}
