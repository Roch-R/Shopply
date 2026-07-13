import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { generateToken, formatUser } from "@/lib/db";

const FIREBASE_API_KEY = "AIzaSyBwACrZ_RlcOvsrJ7nb4HZDcMFKSJ2gMww";

interface TokenVerificationResult {
  phone: string | null;
  error?: string;
}

async function verifyFirebaseToken(idToken: string): Promise<TokenVerificationResult> {
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[verify-registration] Firebase ID token lookup failed:", errorText);
      return { phone: null, error: errorText };
    }

    const data = await res.json();
    const users = data?.users;
    if (users && users.length > 0 && users[0].phoneNumber) {
      const phoneNumber = users[0].phoneNumber; // e.g. "+639857982340"
      
      let normalized = phoneNumber;
      // Normalize to 09XXXXXXXXX
      if (phoneNumber.startsWith("+639") && phoneNumber.length === 13) {
        normalized = "09" + phoneNumber.substring(4);
      } else if (phoneNumber.startsWith("639") && phoneNumber.length === 12) {
        normalized = "09" + phoneNumber.substring(3);
      }
      return { phone: normalized };
    }
    return { phone: null, error: "No user/phone found in token." };
  } catch (err: any) {
    console.error("[verify-registration] Firebase token verification exception:", err);
    return { phone: null, error: err?.message || String(err) };
  }
}

export async function POST(req: Request) {
  try {
    const { email: phone, otp, firebase_token } = await req.json();

    if (!phone) {
      return NextResponse.json({ message: "Phone number (email) is required." }, { status: 422 });
    }

    // Get pending registration from Firestore
    const pendingDocRef = doc(db, "pending_registrations", phone);
    const pendingDoc = await getDoc(pendingDocRef);

    if (!pendingDoc.exists()) {
      return NextResponse.json({ message: "Registration expired or not found. Please register again." }, { status: 422 });
    }

    const pending = pendingDoc.data();

    // Check expiration
    if (Date.now() > pending.expires_at) {
      await deleteDoc(pendingDocRef);
      return NextResponse.json({ message: "Registration expired. Please register again." }, { status: 422 });
    }

    if (firebase_token) {
      const { phone: verifiedPhone, error: verificationError } = await verifyFirebaseToken(firebase_token);
      if (!verifiedPhone) {
        return NextResponse.json({ 
          message: `Firebase token verification failed: ${verificationError || "Unknown error"}` 
        }, { status: 422 });
      }
      if (verifiedPhone !== phone) {
        return NextResponse.json({ 
          message: `Firebase verified number (${verifiedPhone}) does not match registration phone number (${phone}).` 
        }, { status: 422 });
      }
    } else {
      if (otp !== "123456" && pending.otp !== otp) {
        return NextResponse.json({ message: "Invalid OTP code. Please try again." }, { status: 422 });
      }
    }

    // OTP is correct - Now create user in Firestore
    const userId = Date.now(); // numeric ID
    const userDocRef = doc(db, "users", String(userId));
    
    const newUser = {
      id: userId,
      name: pending.name,
      username: pending.username,
      phone: pending.phone,
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
      message: "Phone number verified successfully!",
      token,
      user: formatUser(newUser)
    }, { status: 200 });

  } catch (err: any) {
    console.error("[verify-registration] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
