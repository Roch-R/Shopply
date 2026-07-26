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

    const orderData = orderDoc.data();

    // Restore stock if item exists
    if (orderData.items && Array.isArray(orderData.items)) {
      for (const item of orderData.items) {
        if (item.item_id) {
          const itemDocRef = doc(db, "items", String(item.item_id));
          const itemDoc = await getDoc(itemDocRef);
          if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            if (typeof itemData.stock === 'number') {
              await updateDoc(itemDocRef, {
                stock: itemData.stock + (Number(item.quantity) || 1)
              });
            }
          }
        }
      }
    }

    await updateDoc(orderDocRef, {
      status: "cancelled"
    });

    return NextResponse.json({ message: "Order rejected successfully.", order_id: id }, { status: 200 });

  } catch (err: any) {
    console.error("[seller/orders/reject] error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
