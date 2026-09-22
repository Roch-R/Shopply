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

    const userOrders = snap.docs
      .map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id
        };
      })
      .filter((o: any) => {
        const uId = String(o.user_id || "");
        const uObjId = o.user ? String(o.user.id || "") : "";
        return uId === userIdStr || (usernameStr && uId === usernameStr) || (emailStr && uId === emailStr) || uObjId === userIdStr;
      });

    const formattedOrders = userOrders.map((o: any) => {
      const firstItem = (o.items && Array.isArray(o.items) && o.items.length > 0) ? o.items[0] : null;
      const itemName = firstItem?.item?.name || firstItem?.name || o.item?.name || o.title || "Shopply Item";
      const itemImg = firstItem?.item?.image || firstItem?.image || o.item?.image || o.image_url || "";
      const itemPrice = firstItem?.price || firstItem?.item?.price || o.price || o.total_amount || 0;
      const itemQty = firstItem?.quantity || o.quantity || 1;
      const defaultTracking = o.tracking_number || `SPX-PH-${String(o.id).slice(-8)}`;
      const defaultCourier = o.courier || "Shopply Express (SPX Standard Local)";
      const defaultAddress = o.shipping_address || (user.location ? `${user.location}, Philippines` : "Toledo City, Cebu, Philippines");
      const defaultPayment = o.payment_method || "Cash on Delivery";

      return {
        id: o.id,
        user_id: o.user_id,
        status: o.status || "pending",
        price: String(itemPrice),
        quantity: Number(itemQty),
        variation: o.variation || firstItem?.variation || "",
        created_at: o.created_at || new Date().toISOString(),
        shipping_address: defaultAddress,
        payment_method: defaultPayment,
        tracking_number: defaultTracking,
        courier: defaultCourier,
        cancellation_reason: o.cancellation_reason || "",
        items: o.items || [],
        item: {
          id: firstItem?.item_id || firstItem?.item?.id || o.item_id || "1",
          name: itemName,
          image: itemImg,
          price: String(itemPrice)
        },
        seller: {
          id: o.seller_id || o.seller?.id || "1",
          name: o.seller_name || o.seller?.name || "Shopply Store"
        },
        buyer: {
          id: user.id,
          name: user.name || user.username || "Shopply Customer",
          email: user.email || ""
        }
      };
    });

    return NextResponse.json({ orders: formattedOrders }, { status: 200 });

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
    const { item_id, cart_item_ids, shipping_address, payment_method, price, quantity, variation, coupon_code } = body;

    const orderItems: any[] = [];
    let totalAmount = 0;
    let sellerId = "1";
    let sellerName = "Shopply Store";

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

      // Sync flash deals quota in Firestore if product is enrolled
      try {
        const flashDocRef = doc(db, "settings", "flash_deals");
        const flashSnap = await getDoc(flashDocRef);
        if (flashSnap.exists()) {
          const fData = flashSnap.data();
          if (Array.isArray(fData.items)) {
            let updated = false;
            const newItems = fData.items.map((it: any) => {
              if (String(it.item_id) === String(item_id)) {
                updated = true;
                const curStock = it.stock !== undefined && it.stock !== null ? Number(it.stock) : 20;
                const curClaimed = it.claimed_pct !== undefined && it.claimed_pct !== null ? Number(it.claimed_pct) : 40;
                return {
                  ...it,
                  stock: Math.max(0, curStock - buyQty),
                  claimed_pct: Math.min(100, curClaimed + (buyQty * 4))
                };
              }
              return it;
            });
            if (updated) {
              await updateDoc(flashDocRef, { items: newItems });
            }
          }
        }
      } catch (fErr) {
        console.warn("[orders] Could not update flash deal stats:", fErr);
      }

      const unitPrice = price ? Number(price) : Number(itemData.price || 0);
      totalAmount = unitPrice * buyQty;

      sellerId = itemData.user?.id || itemData.user_id || itemData.seller_id || itemData.seller?.id || "1";
      sellerName = itemData.user?.name || itemData.seller_name || itemData.seller?.name || itemData.seller || "Shopply Store";

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
            sellerId = item.user?.id || item.user_id || item.seller_id || sellerId;
            sellerName = item.user?.name || item.seller_name || sellerName;

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

    // Process Promo Voucher Discount if provided
    let discountApplied = 0;
    let validatedCouponCode: string | null = null;

    if (coupon_code && typeof coupon_code === 'string') {
      try {
        const cleanCoupon = coupon_code.trim().toUpperCase();
        const couponRef = doc(db, "coupons", cleanCoupon);
        const couponSnap = await getDoc(couponRef);
        if (couponSnap.exists()) {
          const couponData = couponSnap.data();
          if (couponData && couponData.is_active !== false) {
            const minSpend = Number(couponData.min_spend || 0);
            if (minSpend <= 0 || totalAmount >= minSpend) {
              const dType = couponData.discount_type || (couponData.discount_value ? "fixed" : "percent");
              const dVal = Number(couponData.discount_value ?? couponData.discount ?? 0);
              if (dType === "percent") {
                discountApplied = (totalAmount * dVal) / 100;
              } else {
                discountApplied = dVal;
              }
              discountApplied = Math.min(discountApplied, totalAmount);
              totalAmount = Math.max(0, totalAmount - discountApplied);
              validatedCouponCode = cleanCoupon;

              // Increment usage_count in Firestore
              const currentUsage = Number(couponData.usage_count || 0);
              await updateDoc(couponRef, {
                usage_count: currentUsage + 1
              });
            }
          }
        }
      } catch (couponErr) {
        console.warn("Error processing coupon during order creation:", couponErr);
      }
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
      seller_id: sellerId,
      seller_name: sellerName,
      seller: {
        id: sellerId,
        name: sellerName
      },
      items: orderItems,
      total_amount: totalAmount.toFixed(2),
      coupon_code: validatedCouponCode || "",
      discount_amount: discountApplied.toFixed(2),
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
