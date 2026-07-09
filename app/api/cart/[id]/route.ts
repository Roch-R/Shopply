import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { id } = await params;
    const { quantity } = await req.json();

    if (!quantity || Number(quantity) < 1) {
      return NextResponse.json({ message: "Invalid quantity." }, { status: 422 });
    }

    const cartItemDocRef = doc(db, "cart_items", id);
    const cartItemDoc = await getDoc(cartItemDocRef);

    if (!cartItemDoc.exists()) {
      return NextResponse.json({ message: "Cart item not found." }, { status: 404 });
    }

    const cartItem = cartItemDoc.data();
    if (cartItem.user_id !== user.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    // Check stock
    const itemDocRef = doc(db, "items", String(cartItem.item_id));
    const itemDoc = await getDoc(itemDocRef);
    if (itemDoc.exists()) {
      const item = itemDoc.data();
      if (item.stock < Number(quantity)) {
        return NextResponse.json({ message: "Not enough stock available." }, { status: 422 });
      }
    }

    await updateDoc(cartItemDocRef, { quantity: Number(quantity) });

    const updatedCartItem = {
      ...cartItem,
      id,
      quantity: Number(quantity)
    };

    return NextResponse.json({ message: "Cart updated.", cart_item: updatedCartItem }, { status: 200 });

  } catch (err: any) {
    console.error("[cart/[id]] PATCH error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { id } = await params;

    const cartItemDocRef = doc(db, "cart_items", id);
    const cartItemDoc = await getDoc(cartItemDocRef);

    if (!cartItemDoc.exists()) {
      return NextResponse.json({ message: "Cart item not found." }, { status: 404 });
    }

    const cartItem = cartItemDoc.data();
    if (cartItem.user_id !== user.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    await deleteDoc(cartItemDocRef);

    return NextResponse.json({ message: "Item removed from cart." }, { status: 200 });

  } catch (err: any) {
    console.error("[cart/[id]] DELETE error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
