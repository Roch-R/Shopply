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
    const targetUserIdStr = String(id);
    if (String(user.id) === targetUserIdStr) {
      return NextResponse.json({ message: "You cannot follow yourself." }, { status: 422 });
    }

    let requestedAction: "follow" | "unfollow" | null = null;
    try {
      const body = await req.json();
      if (body?.action === "follow" || body?.action === "unfollow") {
        requestedAction = body.action;
      }
    } catch {}

    const targetUserDocRef = doc(db, "users", targetUserIdStr);
    const targetUserDoc = await getDoc(targetUserDocRef);

    if (!targetUserDoc.exists()) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const targetUser = targetUserDoc.data();
    const myIdStr = String(user.id);

    const existingFollowerIds: string[] = Array.isArray(targetUser.follower_ids)
      ? targetUser.follower_ids.map((v: any) => String(v))
      : [];

    const alreadyFollowing = existingFollowerIds.includes(myIdStr);
    const shouldFollow = requestedAction ? requestedAction === "follow" : !alreadyFollowing;

    let updatedFollowerIds: string[];
    let newFollowersCount: number;

    if (shouldFollow) {
      updatedFollowerIds = alreadyFollowing ? existingFollowerIds : [...existingFollowerIds, myIdStr];
      newFollowersCount = Array.isArray(targetUser.follower_ids)
        ? updatedFollowerIds.length
        : Math.max(updatedFollowerIds.length, Number(targetUser.followers_count || 0) + (alreadyFollowing ? 0 : 1));
    } else {
      updatedFollowerIds = existingFollowerIds.filter((fid) => fid !== myIdStr);
      newFollowersCount = Array.isArray(targetUser.follower_ids)
        ? updatedFollowerIds.length
        : Math.max(0, Number(targetUser.followers_count || 0) - 1);
    }

    await updateDoc(targetUserDocRef, {
      follower_ids: updatedFollowerIds,
      followers_count: newFollowersCount
    });

    // Keep current user's following_ids / following_count in sync as well
    try {
      const myUserRef = doc(db, "users", myIdStr);
      const mySnap = await getDoc(myUserRef);
      if (mySnap.exists()) {
        const myData = mySnap.data();
        const existingFollowing: string[] = Array.isArray(myData.following_ids)
          ? myData.following_ids.map((v: any) => String(v))
          : [];
        const updatedFollowing = shouldFollow
          ? (existingFollowing.includes(targetUserIdStr) ? existingFollowing : [...existingFollowing, targetUserIdStr])
          : existingFollowing.filter((fid) => fid !== targetUserIdStr);
        await updateDoc(myUserRef, {
          following_ids: updatedFollowing,
          following_count: updatedFollowing.length
        });
      }
    } catch (syncErr) {
      console.warn("[users/[id]/follow] Could not sync following_count:", syncErr);
    }

    return NextResponse.json({
      message: shouldFollow ? "Followed seller." : "Unfollowed seller.",
      followers_count: newFollowersCount,
      is_following: shouldFollow
    }, { status: 200 });

  } catch (err: any) {
    console.error("[users/[id]/follow] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
