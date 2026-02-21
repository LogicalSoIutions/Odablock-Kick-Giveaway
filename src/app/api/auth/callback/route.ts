import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, getUser } from "@/lib/kick";
import { upsertAuthUser } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.BASE_URL!;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent("Missing code or state")}`
    );
  }

  // Retrieve and verify PKCE state from cookie
  const cookieStore = await cookies();
  const pkceCookie = cookieStore.get("pkce_state");
  if (!pkceCookie) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent("Missing PKCE state cookie")}`
    );
  }

  let pkceData: { codeVerifier: string; state: string };
  try {
    pkceData = JSON.parse(pkceCookie.value);
  } catch {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent("Invalid PKCE state cookie")}`
    );
  }

  if (pkceData.state !== state) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent("State mismatch")}`
    );
  }

  // Clear the PKCE cookie
  cookieStore.delete("pkce_state");

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code, pkceData.codeVerifier);

    // Get the authenticated user's info
    const user = await getUser(tokens.access_token);
    const username = user.name.toLowerCase();

    // Check allowed usernames
    const allowedUsernames = (process.env.ALLOWED_USERNAMES || "")
      .split(",")
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean);

    if (allowedUsernames.length > 0 && !allowedUsernames.includes(username)) {
      return NextResponse.redirect(
        `${baseUrl}/?error=${encodeURIComponent("Your account is not authorized to use this tool")}`
      );
    }

    // Store auth in DB
    upsertAuthUser(
      user.user_id,
      user.name,
      tokens.access_token,
      tokens.refresh_token
    );

    // Set session cookie
    await createSession(user.user_id);

    return NextResponse.redirect(baseUrl);
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(message)}`
    );
  }
}
