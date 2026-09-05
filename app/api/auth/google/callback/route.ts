import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { generateToken, formatUser, hashPassword } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GOOGLE_CLIENT_ID = "10342567270-6b7rfni3mbil5anjo1fk1u9c9eo4mp6l.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

// Safely parse Google OpenID JWT ID Token (delivered directly from Google's token endpoint over HTTPS)
function parseIdToken(idToken: string): any | null {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn("[google-callback] Failed to parse id_token:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, redirect_uri, simulated_email, simulated_name, simulated_avatar } = body;

    let email: string | null = null;
    let name: string | null = null;
    let avatar: string | null = null;

    if (code) {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.json({ 
          message: "Google OAuth credentials are not configured on the backend." 
        }, { status: 500 });
      }

      // Determine redirect URI - prefer the one sent by the client to match exactly
      const origin = req.headers.get("origin") || "https://shopply-nine.vercel.app";
      const finalRedirectUri = redirect_uri || `${origin}/auth/google/callback`;

      console.log("[google-callback] Exchanging code with redirect_uri:", finalRedirectUri);

      // Exchange authorization code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: finalRedirectUri,
          grant_type: "authorization_code",
          code
        })
      });

      if (!tokenRes.ok) {
        const errDetails = await tokenRes.text();
        console.error("[google-callback] Token exchange error:", errDetails);
        return NextResponse.json({ 
          message: `Failed to exchange Google authorization code. Details: ${errDetails}` 
        }, { status: 400 });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const idToken = tokenData.id_token;

      // 1. First priority: Extract identity directly from id_token (Google OpenID Connect)
      if (idToken) {
        const idPayload = parseIdToken(idToken);
        if (idPayload && idPayload.email) {
          email = idPayload.email;
          name = idPayload.name || idPayload.given_name || "Google User";
          avatar = idPayload.picture || null;
          console.log("[google-callback] Extracted user from id_token successfully:", email);
        }
      }

      // 2. Secondary: If email wasn't found in id_token, query Google userinfo endpoints
      if (!email && accessToken) {
        const endpoints = [
          "https://www.googleapis.com/oauth2/v3/userinfo",
          "https://openidconnect.googleapis.com/v1/userinfo"
        ];

        for (const ep of endpoints) {
          try {
            const userRes = await fetch(ep, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "Shopply/1.0",
                Accept: "application/json"
              }
            });

            if (userRes.ok) {
              const googleUser = await userRes.json();
              email = email || googleUser.email || null;
              name = name || googleUser.name || null;
              avatar = avatar || googleUser.picture || null;
              if (email) {
                console.log(`[google-callback] Extracted user from ${ep}:`, email);
                break;
              }
            } else {
              const userErr = await userRes.text();
              console.warn(`[google-callback] ${ep} failed:`, userRes.status, userErr);
            }
          } catch (fetchErr) {
            console.warn(`[google-callback] Network error fetching ${ep}:`, fetchErr);
          }
        }
      }

    } else if (simulated_email) {
      email = simulated_email;
      name = simulated_name || "Google User";
      avatar = simulated_avatar || null;
    } else {
      return NextResponse.json({ message: "No authorization code or simulated user provided." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ 
        message: "Failed to fetch user info from Google. Please try signing in again." 
      }, { status: 400 });
    }

    // Check if user exists in Firestore by email or username
    const usersRef = collection(db, "users");
    let snap = await getDocs(query(usersRef, where("email", "==", email)));
    if (snap.empty) {
      snap = await getDocs(query(usersRef, where("username", "==", email)));
    }

    let user: any;
    let userId: number;

    if (!snap.empty) {
      const userDoc = snap.docs[0];
      user = userDoc.data();
      userId = user.id || Number(userDoc.id);

      // Update fields if missing
      const updates: any = { 
        updated_at: new Date().toISOString(),
        email: email
      };
      let hasUpdates = false;

      if (!user.email) {
        user.email = email;
        hasUpdates = true;
      }
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
        await setDoc(doc(db, "users", String(userId)), updates, { merge: true });
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
        email: email,
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
