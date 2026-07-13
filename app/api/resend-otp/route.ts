import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";
import { sendOtpSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    if (!user.phone) {
      return NextResponse.json({ message: "No phone number linked to this account." }, { status: 422 });
    }

    // Generate new random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to user doc in Firestore
    const userDocRef = doc(db, "users", String(user.id));
    await updateDoc(userDocRef, {
      otp_code: otp,
      updated_at: new Date().toISOString()
    });

    console.log(`[resend-otp] Generated OTP for user ${user.id} (${user.phone}): ${otp}`);

    // Send the SMS
    await sendOtpSms(user.phone, otp);

    return NextResponse.json({ message: "Verification code resent successfully!" }, { status: 200 });

  } catch (err: any) {
    console.error("[resend-otp] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
