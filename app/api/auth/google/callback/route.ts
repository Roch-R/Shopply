import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { generateToken, formatUser, hashPassword } from "@/lib/db";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "10342567270-6b7rfni3mbil5anjo1fk1u9c9eo4mp6l.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";

export async function POST(req: Request) {
  try {
    const { code, simulated_email, simulated_name, simulated_avatar } = await req.json();

    let email = null;
    let name = null;
    let avatar = null;

    if (code) {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json({ 
          message: "Google OAuth credentials are not configured on the backend." 
        }, { status: 500 });
      }

      // Determine redirect URI
      const origin = req.headers.get("origin") || "https://shopply-nine.vercel.app";
      const redirectUri = `${origin}/auth/google/callback`;

      // Exchange authorization code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code
        })
      });

      if (!tokenRes.ok) {
        const errDetails = await tokenRes.text();
        return NextResponse.json({ 
          message: `Failed to exchange Google authorization code. Details: ${errDetails}` 
        }, { status: 400 });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Fetch user profile info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.ok) {
        return NextResponse.json({ message: "Failed to fetch user info from Google." }, { status: 400 });
      }

      const googleUser = await userRes.json();
      email = googleUser.email || null;
      name = googleUser.name || null;
      avatar = googleUser.picture || null;

    } else if (simulated_email) {
      email = simulated_email;
      name = simulated_name || "Google User";
      avatar = simulated_avatar || null;
    } else {
      return NextResponse.json({ message: "No authorization code or simulated user provided." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ message: "Unable to retrieve email address from Google." }, { status: 400 });
    }

    // Check if user exists in Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", email));
    const snap = await getDocs(q);

    let user: any;
    let userId: number;

    if (!snap.empty) {
      const userDoc = snap.docs[0];
      user = userDoc.data();
      userId = user.id;

      // Update fields if missing
      const updates: any = { updated_at: new Date().toISOString() };
      let hasUpdates = false;

      if (!user.email_verified_at) {
        updates.email_verified_at = new Date().toISOString();
        user.email_verified_at = updates.email_verified_at;
        hasUpdates = true;
      }
      if (!user.avatar && avatar) {
        updates.avatar = avatar;
        user.avatar = avatar;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await updateDoc(doc(db, "users", String(userId)), updates);
      }
    } else {
      // Create new Google User
      userId = Date.now();
      const userDocRef = doc(db, "users", String(userId));
      
      const randomPassword = Math.random().toString(36).substring(2, 15);
      user = {
        id: userId,
        name: name || "Google User",
        username: email,
        password: hashPassword(randomPassword),
        avatar,
        phone: null,
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await setDoc(userDocRef, user);
    }

    // Generate JWT token
    const token = generateToken({ userId });

    return NextResponse.json({
      message: "Google login successful.",
      token,
      user: formatUser(user)
    }, { status: 200 });

  } catch (err: any) {
    console.error("[google-callback] API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
