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
    const snap = await getDocs(ordersRef);

    const userIdStr = String(user.id);
    const usernameStr = user.username ? String(user.username) : "";
    const emailStr = user.email ? String(user.email) : "";

    const orders = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        };
      })
      .filter((o: any) => {
        const uId = String(o.user_id || "");
        const uObjId = o.user ? String(o.user.id || "") : "";
        return uId === userIdStr || (usernameStr && uId === usernameStr) || (emailStr && uId === emailStr) || uObjId === userIdStr;
      });

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

    const body = await req.json();
    const { item_id, cart_item_ids, shipping_address, payment_method, price, quantity, variation } = body;

    const orderItems: any[] = [];
    let totalAmount = 0;

    // DIRECT BUY NOW FOR SINGLE PRODUCT ITEM
    if (item_id) {
      const itemDocRef = doc(db, "items", String(item_id));
      const itemDoc = await getDoc(itemDocRef);

      if (!itemDoc.exists()) {
        return NextResponse.json({ message: "Product is no longer available." }, { status: 404 });
      }

      const itemData = itemDoc.data();
      const buyQty = Number(quantity) || 1;

      if (typeof itemData.stock === 'number' && itemData.stock < buyQty) {
        return NextResponse.json({ message: `Not enough stock available for ${itemData.name || itemData.title}.` }, { status: 422 });
      }

      if (typeof itemData.stock === 'number') {
        await updateDoc(itemDocRef, {
          stock: Math.max(0, itemData.stock - buyQty)
        });
      }

      const unitPrice = price ? Number(price) : Number(itemData.price || 0);
      totalAmount = unitPrice * buyQty;

      orderItems.push({
        item_id: String(item_id),
        item: {
          id: String(item_id),
          name: itemData.name || itemData.title || "Shopply Product",
          price: unitPrice,
          image: itemData.image_url || itemData.image || ""
        },
        price: unitPrice,
        quantity: buyQty,
        variation: variation || ""
      });

    } else if (cart_item_ids && Array.isArray(cart_item_ids) && cart_item_ids.length > 0) {
      // FETCH AND CHECK ALL SELECTED CART ITEMS
      for (const id of cart_item_ids) {
        const cartItemRef = doc(db, "cart_items", String(id));
        const cartItemDoc = await getDoc(cartItemRef);

        if (!cartItemDoc.exists()) {
          return NextResponse.json({ message: "One of the cart items was not found." }, { status: 404 });
        }

        const cartItem = cartItemDoc.data();
        
        // Verify item stock if itemDoc exists
        if (cartItem.item_id) {
          const itemDocRef = doc(db, "items", String(cartItem.item_id));
          const itemDoc = await getDoc(itemDocRef);

          if (itemDoc.exists()) {
            const item = itemDoc.data();
            if (typeof item.stock === 'number' && item.stock < cartItem.quantity) {
              return NextResponse.json({ message: `Not enough stock available for ${item.name || item.title || 'Item'}.` }, { status: 422 });
            }

            // Deduct stock
            if (typeof item.stock === 'number') {
              await updateDoc(itemDocRef, {
                stock: Math.max(0, item.stock - cartItem.quantity)
              });
            }
          }
        }

        orderItems.push(cartItem);
        totalAmount += (Number(cartItem.price) || Number(cartItem.item?.price) || 0) * (Number(cartItem.quantity) || 1);

        // Delete from cart
        await deleteDoc(cartItemRef);
      }

    } else {
      return NextResponse.json({ message: "No items selected for checkout." }, { status: 422 });
    }

    const orderId = Date.now(); // numeric ID
    const orderDocRef = doc(db, "orders", String(orderId));

    const newOrder = {
      id: orderId,
      user_id: user.id,
      user: {
        id: user.id,
        name: user.name || user.username || "Shopply User",
        email: user.email || ""
      },
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
