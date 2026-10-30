import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/sessionCookie";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out successfully." }, { status: 200 });
  res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  return clearSessionCookie(res);
}
