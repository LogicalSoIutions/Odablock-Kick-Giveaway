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
    const body = await request.json();
    const keyword = body.keyword?.trim();

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    giveawayState.start(keyword);

    return NextResponse.json({
      ok: true,
      keyword,
      message: `Giveaway started with keyword: ${keyword}`,
    });
  } catch (err) {
    console.error("Error starting giveaway:", err);
    return NextResponse.json(
      { error: "Failed to start giveaway" },
      { status: 500 }
    );
  }
}
