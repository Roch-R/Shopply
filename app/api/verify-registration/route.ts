import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { generateToken, formatUser } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 422 });
    }

    if (!otp) {
      return NextResponse.json({ message: "Verification code is required." }, { status: 422 });
    }

    // Get pending registration from Firestore (keyed by email)
    const pendingDocRef = doc(db, "pending_registrations", email);
    const pendingDoc = await getDoc(pendingDocRef);

    if (!pendingDoc.exists()) {
      return NextResponse.json({ message: "Registration expired or not found. Please register again." }, { status: 422 });
    }

    const pending = pendingDoc.data();

    // Check expiration
    if (Date.now() > pending.expires_at) {
      await deleteDoc(pendingDocRef);
      return NextResponse.json({ message: "Verification code has expired. Please request a new one." }, { status: 422 });
    }

    // Strict OTP check — must match the exact code sent to email
    if (pending.otp !== otp) {
      return NextResponse.json({ message: "Invalid verification code. Please check your email and try again." }, { status: 422 });
    }

    // OTP is correct - Create user in Firestore
    const userId = Date.now();
    const userDocRef = doc(db, "users", String(userId));
    
    const newUser = {
      id: userId,
      name: pending.name,
      username: pending.username,
      email: pending.email,
      phone: null,
      password: pending.password,
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDoc(userDocRef, newUser);

    // Delete pending registration
    await deleteDoc(pendingDocRef);

    // Generate JWT token
    const token = generateToken({ userId: newUser.id });

    return NextResponse.json({
      message: "Email verified successfully!",
      token,
      user: formatUser(newUser)
    }, { status: 200 });

  } catch (err: any) {
    console.error("[verify-registration] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
