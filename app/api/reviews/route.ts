import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc, getDoc, getDocs } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let item_id: string | number | null = null;
    let rating: number = 0;
    let comment = "";
    let variation = "";
    const uploadedImages: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      item_id = String(formData.get("item_id") || "");
      rating = Number(formData.get("rating") || 0);
      comment = String(formData.get("comment") || "");
      variation = String(formData.get("variation") || "");

      const files = formData.getAll("review_images[]");
      for (const entry of files) {
        if (entry && typeof entry === "object" && "arrayBuffer" in entry) {
          const file = entry as File;
          if (file.size > 0 && file.size <= 4 * 1024 * 1024) {
            const bytes = Buffer.from(await file.arrayBuffer());
            const mime = file.type || "image/jpeg";
            uploadedImages.push(`data:${mime};base64,${bytes.toString("base64")}`);
          }
        }
      }
    } else {
      const body = await req.json();
      item_id = body.item_id;
      rating = Number(body.rating || 0);
      comment = body.comment || "";
      variation = body.variation || "";
      if (Array.isArray(body.images)) {
        uploadedImages.push(...body.images.filter((v: any) => typeof v === "string"));
      }
    }

    if (!item_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Valid item_id and rating (1-5) are required." }, { status: 422 });
    }

    const itemDocRef = doc(db, "items", String(item_id));
    const itemDoc = await getDoc(itemDocRef);

    if (!itemDoc.exists()) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    const reviewId = String(Date.now());
    const reviewDocRef = doc(db, "reviews", reviewId);

    const newReview = {
      id: reviewId,
      item_id: Number.isNaN(Number(item_id)) ? String(item_id) : Number(item_id),
      rating: Number(rating),
      comment: comment.trim(),
      variation: variation.trim() || "Standard",
      images: uploadedImages,
      user: {
        id: user.id,
        name: user.name || user.username || "Customer"
      },
      created_at: new Date().toISOString()
    };

    await setDoc(reviewDocRef, newReview);

    // Recompute exact review count and average rating from Firestore `reviews`
    const allReviewsSnap = await getDocs(collection(db, "reviews"));
    const matching = allReviewsSnap.docs
      .map(d => d.data())
      .filter(r => String(r.item_id ?? "") === String(item_id) && Number(r.rating) > 0);

    const newReviewsCount = matching.length;
    const newAvgRating = newReviewsCount > 0
      ? Number((matching.reduce((sum, r) => sum + Number(r.rating), 0) / newReviewsCount).toFixed(1))
      : 0;

    await updateDoc(itemDocRef, {
      reviews_count: newReviewsCount,
      reviews_avg_rating: newAvgRating
    });

    return NextResponse.json({
      message: "Review submitted.",
      review: newReview,
      reviews_count: newReviewsCount,
      reviews_avg_rating: newAvgRating
    }, { status: 201 });

  } catch (err: any) {
    console.error("[reviews] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
