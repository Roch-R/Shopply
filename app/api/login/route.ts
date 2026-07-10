import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { comparePassword, generateToken, formatUser } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 422 });
    }

    // Find user in Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data();

    // Verify password
    if (!comparePassword(password, user.password)) {
      return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
    }

    // Generate token
    const token = generateToken({ userId: user.id });
    // Check if phone number is verified
    if (!user.email_verified_at) {
      return NextResponse.json({
        message: "Please verify your account first.",
        requires_verify: true,
        token,
        user: formatUser(user),
        pending_email: user.phone
      }, { status: 403 });
    }
    return NextResponse.json({
      message: "Login successful.",
      token,
      user: formatUser(user)
    }, { status: 200 });

  } catch (err: any) {
    console.error("[login] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
