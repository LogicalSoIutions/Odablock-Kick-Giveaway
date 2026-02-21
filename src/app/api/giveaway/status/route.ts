import { NextResponse } from "next/server";
import { giveawayState } from "@/lib/giveaway-state";
import { getAuthUser, getWinners } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSession();
  const authUser = userId ? getAuthUser(userId) : undefined;
  const isLoggedIn = !!(userId && authUser);

  return NextResponse.json({
    authenticated: isLoggedIn,
    username: isLoggedIn ? authUser!.username : null,
    giveaway: giveawayState.getStatus(),
    winners: getWinners(20),
  });
}
