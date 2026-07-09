import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("user_id", "==", user.id));
    const snap = await getDocs(q);

    const orders = snap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    return NextResponse.json(orders, { status: 200 });

  } catch (err: any) {
    console.error("[orders] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { cart_item_ids, shipping_address, payment_method } = await req.json();

    if (!cart_item_ids || !Array.isArray(cart_item_ids) || cart_item_ids.length === 0) {
      return NextResponse.json({ message: "No items selected for checkout." }, { status: 422 });
    }

    const orderItems: any[] = [];
    let totalAmount = 0;

    // Fetch and check all cart items
    for (const id of cart_item_ids) {
      const cartItemRef = doc(db, "cart_items", String(id));
      const cartItemDoc = await getDoc(cartItemRef);

      if (!cartItemDoc.exists()) {
        return NextResponse.json({ message: "One of the cart items was not found." }, { status: 404 });
      }

      const cartItem = cartItemDoc.data();
      
      // Verify item stock
      const itemDocRef = doc(db, "items", String(cartItem.item_id));
      const itemDoc = await getDoc(itemDocRef);

      if (!itemDoc.exists()) {
        return NextResponse.json({ message: `Product ${cartItem.item.name} is no longer available.` }, { status: 404 });
      }

      const item = itemDoc.data();
      if (item.stock < cartItem.quantity) {
        return NextResponse.json({ message: `Not enough stock available for ${item.name}.` }, { status: 422 });
      }

      // Deduct stock
      await updateDoc(itemDocRef, {
        stock: item.stock - cartItem.quantity
      });

      orderItems.push(cartItem);
      totalAmount += Number(cartItem.price) * cartItem.quantity;

      // Delete from cart
      await deleteDoc(cartItemRef);
    }

    const orderId = Date.now(); // numeric ID
    const orderDocRef = doc(db, "orders", String(orderId));

    const newOrder = {
      id: orderId,
      user_id: user.id,
      items: orderItems,
      total_amount: totalAmount.toFixed(2),
      shipping_address: shipping_address || "Default Address",
      payment_method: payment_method || "COD",
      status: "pending",
      created_at: new Date().toISOString()
    };

    await setDoc(orderDocRef, newOrder);

    return NextResponse.json({ message: "Order placed successfully.", order: newOrder }, { status: 201 });

  } catch (err: any) {
    console.error("[orders] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
