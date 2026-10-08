import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAuthUser, formatUser } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let name = user.name;
    let location = user.location || null;
    let avatarBase64: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const nameField = formData.get("name");
      if (nameField && typeof nameField === "string") {
        name = nameField;
      }
      const locationField = formData.get("location");
      if (locationField && typeof locationField === "string") {
        location = locationField.trim() || null;
      }
      const avatarField = formData.get("avatar");
      if (avatarField && typeof avatarField === "object" && "size" in avatarField && (avatarField as any).size > 0) {
        const fileObj = avatarField as any;
        const buffer = Buffer.from(await fileObj.arrayBuffer());
        const mimeType = fileObj.type || "image/jpeg";
        avatarBase64 = `data:${mimeType};base64,${buffer.toString("base64")}`;
      }
    } else {
      const body = await req.json();
      if (body.name) name = body.name;
      if (body.location !== undefined) location = body.location?.trim() || null;
    }

    const userDocRef = doc(db, "users", String(user.id));
    const updateData: Record<string, any> = {
      name,
      location,
      updated_at: new Date().toISOString(),
    };

    if (avatarBase64) {
      updateData.avatar = avatarBase64;
    }

    await setDoc(userDocRef, updateData, { merge: true });

    // Sync updated avatar, name, and location across all products created by this user in Firestore
    try {
      const itemsSnap = await getDocs(collection(db, "items"));
      const userStrId = String(user.id);
      const userNameLower = String(user.name || user.username || "").toLowerCase();

      for (const itemDoc of itemsSnap.docs) {
        const itemData = itemDoc.data();
        const itemUserId = String(itemData.user?.id || itemData.user_id || "");
        const itemUserName = String(itemData.user?.name || itemData.user?.username || "").toLowerCase();

        if (itemUserId === userStrId || (userNameLower && itemUserName === userNameLower)) {
          const updatedUserObj = {
            ...(itemData.user || {}),
            id: user.id,
            name: name || itemData.user?.name,
            location: location || itemData.user?.location,
          };
          if (avatarBase64) {
            updatedUserObj.avatar = avatarBase64;
          }
          await setDoc(doc(db, "items", itemDoc.id), {
            user: updatedUserObj,
            location: location || itemData.location || null,
          }, { merge: true });
        }
      }
    } catch (syncErr) {
      console.warn("[profile] Failed to sync updated profile to items:", syncErr);
    }

    // Re-fetch updated user
    const updatedDoc = await getDoc(userDocRef);
    const updatedUser = updatedDoc.exists() ? { ...updatedDoc.data(), id: user.id } : user;

    return NextResponse.json({ user: formatUser(updatedUser) }, { status: 200 });

  } catch (err: any) {
    console.error("[profile] POST API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
