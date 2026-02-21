import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { deleteAuthUser } from "@/lib/db";

export async function GET() {
  const userId = await getSession();
  if (userId) deleteAuthUser(userId);
  await clearSession();
  return NextResponse.redirect(process.env.BASE_URL || "/");
}

export async function POST() {
  const userId = await getSession();
  if (userId) deleteAuthUser(userId);
  await clearSession();
  return NextResponse.json({ ok: true });
}
