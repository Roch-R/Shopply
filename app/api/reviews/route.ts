import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { item_id, rating, comment, variation } = await req.json();

    if (!item_id || !rating) {
      return NextResponse.json({ message: "item_id and rating are required." }, { status: 422 });
    }

    const itemDocRef = doc(db, "items", String(item_id));
    const itemDoc = await getDoc(itemDocRef);

    if (!itemDoc.exists()) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    const item = itemDoc.data();

    const reviewId = String(Date.now());
    const reviewDocRef = doc(db, "reviews", reviewId);

    const newReview = {
      id: reviewId,
      item_id: Number(item_id),
      rating: Number(rating),
      comment: comment || "",
      variation: variation || "Standard",
      user: {
        id: user.id,
        name: user.name
      },
      created_at: new Date().toISOString()
    };

    await setDoc(reviewDocRef, newReview);

    // Update product review metadata
    const newReviewsCount = (item.reviews_count || 0) + 1;
    const newAvgRating = (
      ((Number(item.reviews_avg_rating || 0) * (item.reviews_count || 0)) + Number(rating)) /
      newReviewsCount
    ).toFixed(1);

    await updateDoc(itemDocRef, {
      reviews_count: newReviewsCount,
      reviews_avg_rating: Number(newAvgRating)
    });

    return NextResponse.json({ message: "Review submitted.", review: newReview }, { status: 201 });

  } catch (err: any) {
    console.error("[reviews] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
