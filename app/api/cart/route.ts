import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const cartRef = collection(db, "cart_items");
    const q = query(cartRef, where("user_id", "==", user.id));
    const snap = await getDocs(q);

    const cartItems = snap.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    return NextResponse.json({ cart_items: cartItems }, { status: 200 });

  } catch (err: any) {
    console.error("[cart] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { item_id, quantity, price, variation } = await req.json();

    if (!item_id) {
      return NextResponse.json({ message: "item_id is required." }, { status: 422 });
    }

    // Fetch the product item from Firestore
    const itemDocRef = doc(db, "items", String(item_id));
    const itemDoc = await getDoc(itemDocRef);

    if (!itemDoc.exists()) {
      return NextResponse.json({ message: "Item not available." }, { status: 404 });
    }

    const item = itemDoc.data();

    if (item.user.id === user.id) {
      return NextResponse.json({ message: "You cannot add your own item to the cart." }, { status: 422 });
    }

    const qty = Number(quantity || 1);
    const cartItemsRef = collection(db, "cart_items");
    
    // Check if item already exists in user's cart with same variation
    const q = query(
      cartItemsRef, 
      where("user_id", "==", user.id), 
      where("item_id", "==", Number(item_id)),
      where("variation", "==", variation || null)
    );
    const snap = await getDocs(q);

    let cartItem: any;

    if (!snap.empty) {
      // Update quantity
      const docSnap = snap.docs[0];
      cartItem = { ...docSnap.data(), id: docSnap.id };
      const newQty = cartItem.quantity + qty;

      if (item.stock < newQty) {
        return NextResponse.json({ message: "Not enough stock available." }, { status: 422 });
      }

      const cartItemRef = doc(db, "cart_items", docSnap.id);
      await updateDoc(cartItemRef, { quantity: newQty });
      cartItem.quantity = newQty;
    } else {
      // Add new cart item
      if (item.stock < qty) {
        return NextResponse.json({ message: "Not enough stock available." }, { status: 422 });
      }

      const cartItemId = String(Date.now());
      const cartItemRef = doc(db, "cart_items", cartItemId);
      
      cartItem = {
        id: cartItemId,
        user_id: user.id,
        item_id: Number(item_id),
        quantity: qty,
        price: price || item.price,
        variation: variation || null,
        item: {
          id: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          user: {
            id: item.user.id,
            name: item.user.name
          }
        }
      };

      await setDoc(cartItemRef, cartItem);
    }

    return NextResponse.json({ message: "Item added to cart.", cart_item: cartItem }, { status: 201 });

  } catch (err: any) {
    console.error("[cart] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
