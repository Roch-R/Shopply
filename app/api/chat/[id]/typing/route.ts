import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { id } = await params;
    const otherUserId = Number(id);

    const userId = Number(user.id);
    const chatId = userId < otherUserId ? `${userId}_${otherUserId}` : `${otherUserId}_${userId}`;
    const typingDocRef = doc(db, "typing", `${chatId}_${userId}`);

    await setDoc(typingDocRef, {
      last_typed_at: Date.now()
    }, { merge: true });

    return NextResponse.json({ status: "typing" }, { status: 200 });

  } catch (err: any) {
    console.error("[chat/[id]/typing] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
