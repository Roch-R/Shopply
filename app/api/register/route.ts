import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { hashPassword } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, username, email, password } = await req.json();

    if (!name || !username || !email || !password) {
      return NextResponse.json({ message: "All fields are required." }, { status: 422 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Invalid email address." }, { status: 422 });
    }

    // Check if username already exists in Firestore users
    const usersRef = collection(db, "users");
    const qUsername = query(usersRef, where("username", "==", username));
    const snapUsername = await getDocs(qUsername);
    if (!snapUsername.empty) {
      return NextResponse.json({ message: "Username is already taken." }, { status: 422 });
    }

    // Check if email already exists
    const qEmail = query(usersRef, where("email", "==", email));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return NextResponse.json({ message: "Email is already registered." }, { status: 422 });
    }

    // Generate random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save pending registration in Firestore (keyed by email)
    const pendingRef = doc(db, "pending_registrations", email);
    await setDoc(pendingRef, {
      name,
      username,
      email,
      password: hashPassword(password),
      otp,
      expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send OTP to email
    try {
      await sendOtpEmail(email, otp);
    } catch (emailErr) {
      console.error("[register] Failed to send OTP email:", emailErr);
    }

    console.log(`[register] Pending registration saved for ${email}. OTP: ${otp}`);

    return NextResponse.json({
      message: "OTP sent to your email. Please verify to complete registration.",
      requires_verify: true,
      pending_email: email
    }, { status: 201 });

  } catch (err: any) {
    console.error("[register] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
