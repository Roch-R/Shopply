import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const ordersRef = collection(db, "orders");
    const snap = await getDocs(ordersRef);

    const userIdStr = String(user.id);
    const usernameStr = user.username ? String(user.username) : "";

    const sellerOrders = snap.docs
      .map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      }))
      .filter((o: any) => {
        const sId = String(o.seller_id || o.seller?.id || "");
        const sName = String(o.seller_name || o.seller?.name || "");
        return sId === userIdStr || (usernameStr && (sId === usernameStr || sName === usernameStr)) || !o.seller_id || sId === "1";
      })
      .map((o: any) => {
        const firstItem = (o.items && Array.isArray(o.items) && o.items.length > 0) ? o.items[0] : null;
        const itemName = firstItem?.item?.name || firstItem?.name || o.item?.name || o.title || "Shopply Item";
        const itemImg = firstItem?.item?.image || firstItem?.image || o.item?.image || o.image_url || "";
        const itemPrice = firstItem?.price || firstItem?.item?.price || o.price || o.total_amount || 0;
        const itemQty = firstItem?.quantity || o.quantity || 1;

        return {
          id: o.id,
          user_id: o.user_id,
          status: o.status || "pending",
          price: String(itemPrice),
          quantity: Number(itemQty),
          variation: o.variation || firstItem?.variation || "",
          created_at: o.created_at || new Date().toISOString(),
          item: {
            id: firstItem?.item_id || firstItem?.item?.id || o.item_id || "1",
            name: itemName,
            image: itemImg,
            price: String(itemPrice)
          },
          buyer: {
            id: o.user_id || o.user?.id || "1",
            name: o.user?.name || o.user_name || "Shopply Customer"
          }
        };
      });

    return NextResponse.json({ orders: sellerOrders }, { status: 200 });

  } catch (err: any) {
    console.error("[seller/orders] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
