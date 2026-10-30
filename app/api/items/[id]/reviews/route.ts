import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const targetIdStr = String(id);

    const reviewsRef = collection(db, "reviews");
    const snap = await getDocs(reviewsRef);

    const reviews = snap.docs
      .map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.data().id ?? docSnap.id
      }))
      .filter((r: any) => String(r.item_id ?? "") === targetIdStr);

    // Sort newest first
    reviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ reviews }, { status: 200 });

  } catch (err: any) {
    console.error("[items/[id]/reviews] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
