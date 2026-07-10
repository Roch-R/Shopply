import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { hashPassword, generateToken, formatUser } from "@/lib/db";

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

    // Create user doc directly in Firestore (bypass SMS verification)
    const userId = Date.now();
    const userDocRef = doc(db, "users", String(userId));

    const newUser = {
      id: userId,
      name,
      username,
      phone,
      password: hashPassword(password),
      email: "",
      avatar: "",
      email_verified_at: new Date().toISOString(), // Directly verified
      created_at: new Date().toISOString()
    };

    await setDoc(userDocRef, newUser);

    // Generate JWT token for automatic session login
    const token = generateToken({ userId });

    console.log(`[register] User registered directly and logged in: ${username} (ID: ${userId})`);

    return NextResponse.json({
      message: "Registration successful.",
      token,
      user: formatUser(newUser)
    }, { status: 201 });

  } catch (err: any) {
    console.error("[register] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
