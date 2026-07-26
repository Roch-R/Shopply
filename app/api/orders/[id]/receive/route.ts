import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { id } = await params;
    const orderDocRef = doc(db, "orders", String(id));
    const orderDoc = await getDoc(orderDocRef);

    if (!orderDoc.exists()) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    await updateDoc(orderDocRef, {
      status: "delivered"
    });

    return NextResponse.json({ message: "Order marked as received.", order_id: id }, { status: 200 });

  } catch (err: any) {
    console.error("[orders/receive] error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
