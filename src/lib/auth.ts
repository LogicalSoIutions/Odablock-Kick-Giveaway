import crypto from "crypto";
import { cookies } from "next/headers";
import { getAuthUser, type AuthUser } from "./db";

const COOKIE_NAME = "kick_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET environment variable");
  return secret;
}

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(value);
  return `${value}.${hmac.digest("base64url")}`;
}

function verify(signedValue: string): string | null {
  const lastDot = signedValue.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signedValue.substring(0, lastDot);
  const expected = sign(value);

  if (
    expected.length !== signedValue.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signedValue))
  ) {
    return null;
  }

  return value;
}

export async function createSession(kickUserId: number): Promise<void> {
  const cookieStore = await cookies();
  const signed = sign(String(kickUserId));
  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;

  const userId = verify(cookie.value);
  if (!userId) return null;

  return parseInt(userId, 10);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth(): Promise<AuthUser> {
  const userId = await getSession();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = getAuthUser(userId);
  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
