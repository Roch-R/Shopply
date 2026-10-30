import { NextResponse } from "next/server";
import { getAuthUser, formatUser } from "@/lib/db";
import { signSessionCookie, applySessionCookie, clearSessionCookie } from "@/lib/sessionCookie";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      const unauthRes = NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
      unauthRes.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
      return clearSessionCookie(unauthRes);
    }
    if (user.is_blocked === true) {
      const blockedRes = NextResponse.json(
        {
          message: "Your account has been suspended by the administrator.",
          is_blocked: true,
        },
        { status: 403 }
      );
      blockedRes.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
      return clearSessionCookie(blockedRes);
    }

    const res = NextResponse.json({ user: formatUser(user) }, { status: 200 });
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");

    if (user.email_verified_at) {
      const signedSession = await signSessionCookie(user.id);
      applySessionCookie(res, signedSession);
    } else {
      clearSessionCookie(res);
    }
    return res;
  } catch (err: any) {
    console.error("[me] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
