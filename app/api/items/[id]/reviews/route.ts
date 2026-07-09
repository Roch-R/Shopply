import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = Number(id);

    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("item_id", "==", itemId));
    const snap = await getDocs(q);

    const reviews = snap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    // Sort by created_at desc
    reviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(reviews, { status: 200 });

  } catch (err: any) {
    console.error("[items/[id]/reviews] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
