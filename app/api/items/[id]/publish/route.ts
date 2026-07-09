import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const itemDocRef = doc(db, "items", id);
    const itemSnap = await getDoc(itemDocRef);
    if (!itemSnap.exists()) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    const itemData = itemSnap.data();
    if (itemData.user.id !== Number(user.id)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    const newPublishStatus = !itemData.is_published;
    await updateDoc(itemDocRef, {
      is_published: newPublishStatus
    });

    const updatedItem = {
      ...itemData,
      is_published: newPublishStatus
    };

    return NextResponse.json({
      message: "Item publish status updated.",
      item: updatedItem
    }, { status: 200 });

  } catch (err: any) {
    console.error("[api/items/[id]/publish] PUT error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
