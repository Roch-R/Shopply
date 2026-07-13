import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { hashPassword } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, username, phone, password } = await req.json();

    if (!name || !username || !phone || !password) {
      return NextResponse.json({ message: "All fields are required." }, { status: 422 });
    }

    // Check if username already exists in Firestore users
    const usersRef = collection(db, "users");
    const qUsername = query(usersRef, where("username", "==", username));
    const snapUsername = await getDocs(qUsername);
    if (!snapUsername.empty) {
      return NextResponse.json({ message: "Username is already taken." }, { status: 422 });
    }

    // Check if phone number already exists
    const qPhone = query(usersRef, where("phone", "==", phone));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      return NextResponse.json({ message: "Phone number is already registered." }, { status: 422 });
    }

    // Generate random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save pending registration in Firestore
    const pendingRef = doc(db, "pending_registrations", phone);
    await setDoc(pendingRef, {
      name,
      username,
      phone,
      password: hashPassword(password),
      otp,
      expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    console.log(`[register] Pending registration saved for ${phone}. OTP: ${otp}`);

    return NextResponse.json({
      message: "OTP sent. Please verify to complete registration.",
      requires_verify: true,
      pending_email: phone
    }, { status: 201 });

  } catch (err: any) {
    console.error("[register] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
