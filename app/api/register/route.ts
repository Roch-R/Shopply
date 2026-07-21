import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { hashPassword, generateToken, formatUser } from "@/lib/db";

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

    // Create user directly in Firestore as active/verified
    const userId = Date.now();
    const userDocRef = doc(db, "users", String(userId));

    const newUser = {
      id: userId,
      name,
      username,
      email,
      phone: null,
      password: hashPassword(password),
      email_verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDoc(userDocRef, newUser);

    // Generate JWT token
    const token = generateToken({ userId: newUser.id });

    console.log(`[register] User registered and auto-verified: ${username} (${email})`);

    return NextResponse.json({
      message: "Registration successful!",
      token,
      user: formatUser(newUser)
    }, { status: 201 });

  } catch (err: any) {
    console.error("[register] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
