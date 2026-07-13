import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendOtpSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { email: phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ message: "Phone number is required." }, { status: 422 });
    }

    const pendingRef = doc(db, "pending_registrations", phone);
    const pendingDoc = await getDoc(pendingRef);

    if (!pendingDoc.exists()) {
      return NextResponse.json({ message: "No registration in progress. Please sign up first." }, { status: 422 });
    }

    // Generate new random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update in Firestore
    await updateDoc(pendingRef, {
      otp,
      expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    console.log(`[resend-registration-otp] Updated OTP for ${phone}: ${otp}`);

    // Send the SMS
    await sendOtpSms(phone, otp);

    return NextResponse.json({ message: "Verification code resent successfully!" }, { status: 200 });

  } catch (err: any) {
    console.error("[resend-registration-otp] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
