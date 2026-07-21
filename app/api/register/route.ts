import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { hashPassword } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, username, email, password, recaptchaToken } = await req.json();

    // Verify Official Google reCAPTCHA v2 token
    if (recaptchaToken) {
      try {
        const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=6LcORV4tAAAAAK4dJKQ6UgGahdcQtMqG5hZD3sp1&response=${encodeURIComponent(recaptchaToken)}`
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          console.warn("[register] Google reCAPTCHA verification failed:", verifyData);
          return NextResponse.json({ message: "Google reCAPTCHA verification failed. Please try again." }, { status: 400 });
        }
      } catch (captchaErr) {
        console.warn("[register] Could not reach Google siteverify API:", captchaErr);
      }
    }

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

    // Generate real random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save pending registration in Firestore
    const pendingRef = doc(db, "pending_registrations", email);
    await setDoc(pendingRef, {
      name,
      username,
      email,
      password: hashPassword(password),
      otp,
      expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send real OTP email via Gmail SMTP
    try {
      await sendOtpEmail(email, otp);
    } catch (emailErr: any) {
      console.error("[register] Email delivery failed:", emailErr);
      return NextResponse.json({
        message: `Could not send OTP email: ${emailErr?.message || "Check server credentials."}`
      }, { status: 500 });
    }

    console.log(`[register] Real OTP email sent to ${email}.`);

    return NextResponse.json({
      message: "A 6-digit verification code has been sent to your email.",
      requires_verify: true,
      pending_email: email
    }, { status: 201 });

  } catch (err: any) {
    console.error("[register] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
