import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuthUser, formatUser } from "@/lib/db";

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
      if (avatarField && avatarField instanceof File && avatarField.size > 0) {
        const buffer = Buffer.from(await avatarField.arrayBuffer());
        avatarBase64 = `data:${avatarField.type};base64,${buffer.toString("base64")}`;
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

    await updateDoc(userDocRef, updateData);

    // Re-fetch updated user
    const updatedDoc = await getDoc(userDocRef);
    const updatedUser = updatedDoc.exists() ? { ...updatedDoc.data(), id: user.id } : user;

    return NextResponse.json({ user: formatUser(updatedUser) }, { status: 200 });

  } catch (err: any) {
    console.error("[profile] POST API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
