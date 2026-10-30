import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { comparePassword, generateToken, formatUser } from "@/lib/db";
import { signSessionCookie, applySessionCookie, clearSessionCookie } from "@/lib/sessionCookie";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 422 });
    }

    // Find user in Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data();

    // Verify password
    if (!comparePassword(password, user.password)) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    // Check if user is blocked by admin
    if (user.is_blocked === true) {
      const blockedRes = NextResponse.json(
        {
          message: "Your account has been suspended by the administrator.",
          is_blocked: true,
        },
        { status: 403 }
      );
      return clearSessionCookie(blockedRes);
    }

    // Generate token
    const token = generateToken({ userId: user.id });

    // Check if email is verified
    if (!user.email_verified_at) {
      const unverifiedRes = NextResponse.json(
        {
          message: "Please verify your account first.",
          requires_verify: true,
          token,
          user: formatUser(user),
          pending_email: user.email,
        },
        { status: 403 }
      );
      return clearSessionCookie(unverifiedRes);
    }

    const signedSession = await signSessionCookie(user.id);
    const res = NextResponse.json(
      {
        message: "Login successful.",
        token,
        user: formatUser(user),
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    return applySessionCookie(res, signedSession);
  } catch (err: any) {
    console.error("[login] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
