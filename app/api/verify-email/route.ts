import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getAuthUser, formatUser } from "@/lib/db";
import { signSessionCookie, applySessionCookie, clearSessionCookie } from "@/lib/sessionCookie";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return clearSessionCookie(NextResponse.json({ message: "Unauthenticated." }, { status: 401 }));
    }

    if (user.is_blocked === true) {
      return clearSessionCookie(
        NextResponse.json(
          { message: "Your account has been suspended by the administrator.", is_blocked: true },
          { status: 403 }
        )
      );
    }

    // Update user verified status in Firestore instantly
    const nowIso = new Date().toISOString();
    const userDocRef = doc(db, "users", String(user.id));
    await updateDoc(userDocRef, {
      email_verified_at: nowIso,
      updated_at: nowIso,
    });

    // Refresh user object
    const updatedUser = {
      ...user,
      email_verified_at: nowIso,
      updated_at: nowIso,
    };

    const signedSession = await signSessionCookie(user.id);
    const res = NextResponse.json(
      {
        message: "Email verified successfully!",
        user: formatUser(updatedUser),
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    return applySessionCookie(res, signedSession);
  } catch (err: any) {
    console.error("[verify-email] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
