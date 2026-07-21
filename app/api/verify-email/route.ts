import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getAuthUser, formatUser } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { otp } = await req.json();

    // Verify OTP code against the user's stored OTP
    if (user.otp_code !== otp) {
      return NextResponse.json({ message: "Invalid verification code. Please try again." }, { status: 422 });
    }

    // Update user verified status in Firestore
    const userDocRef = doc(db, "users", String(user.id));
    await updateDoc(userDocRef, {
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Refresh user object
    const updatedUser = {
      ...user,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      message: "Email verified successfully!",
      user: formatUser(updatedUser)
    }, { status: 200 });

  } catch (err: any) {
    console.error("[verify-email] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
