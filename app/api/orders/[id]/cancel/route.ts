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
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Buyer requested cancellation";

    const orderDocRef = doc(db, "orders", String(id));
    const orderDoc = await getDoc(orderDocRef);

    if (!orderDoc.exists()) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Verify ownership
    const buyerId = String(orderData.user_id || orderData.user?.id || "");
    const currentUserId = String(user.id);
    if (buyerId && buyerId !== currentUserId) {
      return NextResponse.json({ message: "You do not have permission to cancel this order." }, { status: 403 });
    }

    // Only pending orders can be cancelled by the buyer
    const currentStatus = (orderData.status || "").toLowerCase();
    if (currentStatus !== "pending") {
      return NextResponse.json({ 
        message: `Cannot cancel an order that is already ${currentStatus}. Please contact the seller directly.` 
      }, { status: 400 });
    }

    // Restore stock if items exist
    if (orderData.items && Array.isArray(orderData.items)) {
      for (const item of orderData.items) {
        const itemId = item.item_id || item.item?.id;
        if (itemId) {
          const itemDocRef = doc(db, "items", String(itemId));
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
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: "buyer"
    });

    return NextResponse.json({ 
      message: "Order successfully cancelled.", 
      order_id: id,
      status: "cancelled" 
    }, { status: 200 });

  } catch (err: any) {
    console.error("[orders/cancel] error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
