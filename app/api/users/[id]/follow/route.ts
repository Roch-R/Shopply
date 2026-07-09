import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
    const targetUserId = Number(id);

    const targetUserDocRef = doc(db, "users", String(targetUserId));
    const targetUserDoc = await getDoc(targetUserDocRef);

    if (!targetUserDoc.exists()) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const targetUser = targetUserDoc.data();
    
    // Toggle follow status (for mock purposes, we can just increment followers count)
    const currentFollowers = targetUser.followers_count || 0;
    const newFollowersCount = currentFollowers + 1;

    await updateDoc(targetUserDocRef, {
      followers_count: newFollowersCount
    });

    return NextResponse.json({ 
      message: "Followed successfully.", 
      followers_count: newFollowersCount,
      is_following: true
    }, { status: 200 });

  } catch (err: any) {
    console.error("[users/[id]/follow] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
