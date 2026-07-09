import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getAuthUser, formatUser } from "@/lib/db";

const FIREBASE_API_KEY = "AIzaSyCpnHKz0UAcvny-UgAaOfsxVWIbFKfOKW8";

async function verifyFirebaseToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const users = data?.users;
    if (users && users.length > 0 && users[0].phoneNumber) {
      const phoneNumber = users[0].phoneNumber;
      
      // Normalize to 09XXXXXXXXX
      if (phoneNumber.startsWith("+639") && phoneNumber.length === 13) {
        return "09" + phoneNumber.substring(4);
      }
      if (phoneNumber.startsWith("639") && phoneNumber.length === 12) {
        return "09" + phoneNumber.substring(3);
      }
      return phoneNumber;
    }
  } catch (err) {
    console.error("[verify-email] Firebase token verification exception:", err);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { otp, firebase_token } = await req.json();

    if (firebase_token) {
      const verifiedPhone = await verifyFirebaseToken(firebase_token);
      if (!verifiedPhone) {
        return NextResponse.json({ message: "Invalid or expired Firebase verification token." }, { status: 422 });
      }
      if (verifiedPhone !== user.phone) {
        return NextResponse.json({ 
          message: `Firebase verified number (${verifiedPhone}) does not match account phone number (${user.phone}).` 
        }, { status: 422 });
      }
    } else {
      // Fallback verification code check (mocked for testing)
      if (otp !== "123456" && user.otp_code !== otp) {
        return NextResponse.json({ message: "Invalid verification code. Please try again." }, { status: 422 });
      }
    }

    // Update user verified status in Firestore
    const userDocRef = doc(db, "users", String(user.id));
    await updateDoc(userDocRef, {
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Refresh user object
    const updatedUser = {
      ...user,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      message: "Phone number verified successfully!",
      user: formatUser(updatedUser)
    }, { status: 200 });

  } catch (err: any) {
    console.error("[verify-email] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
