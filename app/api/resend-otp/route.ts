import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update user's OTP code in Firestore
    const userDocRef = doc(db, "users", String(user.id));
    await updateDoc(userDocRef, {
      otp_code: otp,
      updated_at: new Date().toISOString()
    });

    // Send OTP to user's email
    const email = user.email;
    if (email) {
      try {
        await sendOtpEmail(email, otp);
      } catch (emailErr) {
        console.error("[resend-otp] Failed to send OTP email:", emailErr);
      }
    }

    console.log(`[resend-otp] New OTP for user ${user.id}: ${otp}`);

    return NextResponse.json({
      message: "New verification code sent to your email."
    }, { status: 200 });

  } catch (err: any) {
    console.error("[resend-otp] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
