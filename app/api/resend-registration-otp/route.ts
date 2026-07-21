import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 422 });
    }

    // Get pending registration from Firestore
    const pendingRef = doc(db, "pending_registrations", email);
    const pendingDoc = await getDoc(pendingRef);

    if (!pendingDoc.exists()) {
      return NextResponse.json({ message: "Registration not found. Please register again." }, { status: 422 });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update pending registration with new OTP
    await updateDoc(pendingRef, {
      otp,
      expires_at: Date.now() + 5 * 60 * 1000
    });

    // Send OTP to email
    try {
      await sendOtpEmail(email, otp);
    } catch (emailErr) {
      console.error("[resend-registration-otp] Failed to send OTP email:", emailErr);
    }

    console.log(`[resend-registration-otp] New OTP for ${email}: ${otp}`);

    return NextResponse.json({
      message: "New verification code sent to your email."
    }, { status: 200 });

  } catch (err: any) {
    console.error("[resend-registration-otp] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
