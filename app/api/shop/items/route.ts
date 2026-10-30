import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export const dynamic = "force-dynamic";

// Initial catalog seed only used when Firestore `items` collection is completely empty
const seededItems = [
  {
    id: 1,
    name: "AeroSwift Running Shoes",
    description: "Breathable engineered mesh upper with responsive everyday cushioning.",
    price: "120.00",
    stock: 50,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    category: "Footwear",
    reviews_count: 0,
    reviews_avg_rating: 0,
    sold_count: 0,
    attributes: {
      sizes: ["8", "9", "10", "11"],
      colors: ["Red", "Black", "Blue"],
      size_stocks: { "8": 15, "9": 15, "10": 10, "11": 10 }
    },
    user: {
      id: 999,
      name: "Aero Athletics",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      items_count: 1,
      reviews_count: 0,
      followers_count: 0,
      is_online: true,
      location: "Cebu City, Cebu"
    },
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Apex Smart Watch",
    description: "1.4-inch AMOLED display with workout tracking, notifications, and 7-day battery life.",
    price: "199.00",
    stock: 30,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    reviews_count: 0,
    reviews_avg_rating: 0,
    sold_count: 0,
    attributes: {
      colors: ["Midnight Black", "Silver", "Rose Gold"]
    },
    user: {
      id: 998,
      name: "Apex Tech",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      items_count: 1,
      reviews_count: 0,
      followers_count: 0,
      is_online: false,
      location: "Manila, Metro Manila"
    },
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Studio Pro ANC Headphones",
    description: "Over-ear wireless headphones with active noise cancellation and 40-hour battery life.",
    price: "299.00",
    stock: 20,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    reviews_count: 0,
    reviews_avg_rating: 0,
    sold_count: 0,
    attributes: {
      colors: ["Matte Black", "Sand White"]
    },
    user: {
      id: 997,
      name: "Studio Sounds",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      items_count: 1,
      reviews_count: 0,
      followers_count: 0,
      is_online: true,
      location: "Davao City, Davao"
    },
    created_at: new Date().toISOString()
  }
];

export async function GET() {
  try {
    const itemsRef = collection(db, "items");
    const snap = await getDocs(itemsRef);

    // If database is empty, seed initial data so the shop is not blank
    if (snap.empty) {
      const publishedSeeded = seededItems.map(item => ({ ...item, is_published: true }));
      for (const item of publishedSeeded) {
        await setDoc(doc(db, "items", String(item.id)), item);
      }
      return NextResponse.json({ items: publishedSeeded }, { status: 200 });
    }

    // Fetch users, orders, and reviews in parallel so all storefront counts are 100% real
    const [usersResult, ordersResult, reviewsResult] = await Promise.allSettled([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "reviews")),
    ]);

    const usersMap = new Map<string, any>();
    if (usersResult.status === "fulfilled") {
      usersResult.value.docs.forEach((uDoc) => {
        const uData = uDoc.data();
        const uId = String(uData.id ?? uDoc.id);
        usersMap.set(uId, uData);
        if (uDoc.id) usersMap.set(String(uDoc.id), uData);
        if (uData.username) usersMap.set(String(uData.username).toLowerCase(), uData);
        if (uData.name) usersMap.set(String(uData.name).toLowerCase(), uData);
        if (uData.email) usersMap.set(String(uData.email).toLowerCase(), uData);
      });
    }

    // Aggregate real sold units per item & order fulfillment stats per seller from Firestore `orders`
    const itemSoldMap = new Map<string, number>();
    const sellerOrdersMap = new Map<string, { total: number; fulfilled: number }>();

    if (ordersResult.status === "fulfilled") {
      ordersResult.value.docs.forEach((oDoc) => {
        const o = oDoc.data();
        const status = String(o.status || "pending").toLowerCase();
        const isCancelledOrRejected = status === "cancelled" || status === "rejected";

        const sId = String(o.seller_id || o.seller?.id || "");
        const sName = String(o.seller_name || o.seller?.name || "").toLowerCase();
        for (const key of [sId, sName].filter(Boolean)) {
          const prev = sellerOrdersMap.get(key) || { total: 0, fulfilled: 0 };
          prev.total += 1;
          if (!isCancelledOrRejected) prev.fulfilled += 1;
          sellerOrdersMap.set(key, prev);
        }

        if (isCancelledOrRejected) return;

        if (Array.isArray(o.items) && o.items.length > 0) {
          for (const line of o.items) {
            const lineItemId = String(line?.item_id ?? line?.item?.id ?? "");
            if (!lineItemId) continue;
            const qty = Math.max(1, Number(line?.quantity || 1));
            itemSoldMap.set(lineItemId, (itemSoldMap.get(lineItemId) || 0) + qty);
          }
        } else {
          const directItemId = String(o.item_id ?? o.item?.id ?? "");
          if (directItemId) {
            const qty = Math.max(1, Number(o.quantity || 1));
            itemSoldMap.set(directItemId, (itemSoldMap.get(directItemId) || 0) + qty);
          }
        }
      });
    }

    // Aggregate real review count & average rating per item from Firestore `reviews`
    const itemReviewsMap = new Map<string, { count: number; sum: number }>();
    if (reviewsResult.status === "fulfilled") {
      reviewsResult.value.docs.forEach((rDoc) => {
        const r = rDoc.data();
        const rItemId = String(r.item_id ?? "");
        const rating = Number(r.rating || 0);
        if (!rItemId || rating <= 0) return;
        const prev = itemReviewsMap.get(rItemId) || { count: 0, sum: 0 };
        prev.count += 1;
        prev.sum += rating;
        itemReviewsMap.set(rItemId, prev);
      });
    }

    // First pass over published items to compute real per-seller product & review totals
    const sellerItemsCountMap = new Map<string, number>();
    const sellerReviewsCountMap = new Map<string, number>();

    const publishedDocs = snap.docs.filter((d) => d.data()?.is_published === true);
    for (const docSnap of publishedDocs) {
      const item = docSnap.data();
      const itemUser = item.user || {};
      const sellerId = String(itemUser.id || item.user_id || "");
      const sellerUsername = String(itemUser.username || "").toLowerCase();
      const sellerName = String(itemUser.name || "").toLowerCase();
      const liveUser =
        (sellerId ? usersMap.get(sellerId) : null) ||
        (sellerUsername ? usersMap.get(sellerUsername) : null) ||
        (sellerName ? usersMap.get(sellerName) : null);

      const canonicalSellerKey = String(liveUser?.id || sellerId || sellerUsername || sellerName || "unknown");
      sellerItemsCountMap.set(canonicalSellerKey, (sellerItemsCountMap.get(canonicalSellerKey) || 0) + 1);

      const itemKey = String(item.id ?? docSnap.id);
      const revStats = itemReviewsMap.get(itemKey);
      if (revStats && revStats.count > 0) {
        sellerReviewsCountMap.set(canonicalSellerKey, (sellerReviewsCountMap.get(canonicalSellerKey) || 0) + revStats.count);
      }
    }

    const parseAttributes = (raw: any) => {
      if (!raw) return null;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
          return null;
        }
      }
      return typeof raw === "object" ? raw : null;
    };

    const computeItemStock = (item: any, attrs: any) => {
      if (attrs?.size_stocks && typeof attrs.size_stocks === "object" && Object.keys(attrs.size_stocks).length > 0) {
        return Object.values(attrs.size_stocks).reduce((acc: number, qty: any) => acc + Number(qty || 0), 0);
      }
      return Number(item.stock || 0);
    };

    const computeEffectivePrice = (item: any, attrs: any) => {
      const base = parseFloat(String(item.price ?? "0")) || 0;
      if (base > 0) return base;
      if (Array.isArray(attrs?.variant_prices) && attrs.variant_prices.length > 0) {
        const valid = attrs.variant_prices
          .map((p: any) => parseFloat(String(p)))
          .filter((p: number) => !isNaN(p) && p > 0);
        if (valid.length > 0) return Math.min(...valid);
      }
      return 0;
    };

    const items = publishedDocs.map((docSnap) => {
      const item = docSnap.data();
      const normalizedAttrs = parseAttributes(item.attributes);
      const itemKey = String(item.id ?? docSnap.id);
      const itemUser = item.user || {};
      const sellerId = String(itemUser.id || item.user_id || "");
      const sellerUsername = String(itemUser.username || "").toLowerCase();
      const sellerName = String(itemUser.name || "").toLowerCase();

      const liveUser =
        (sellerId ? usersMap.get(sellerId) : null) ||
        (sellerUsername ? usersMap.get(sellerUsername) : null) ||
        (sellerName ? usersMap.get(sellerName) : null);

      const resolvedId = liveUser?.id ?? itemUser.id;
      const resolvedAvatar = liveUser?.avatar || itemUser.avatar || "";
      const resolvedName = liveUser?.name || itemUser.name || "Seller";
      const resolvedLocation = liveUser?.location || item.location || itemUser.location || null;
      const canonicalSellerKey = String(resolvedId || sellerId || sellerUsername || sellerName || "unknown");

      const realSoldCount = itemSoldMap.get(itemKey) ?? 0;
      const revStats = itemReviewsMap.get(itemKey);
      const realReviewsCount = revStats ? revStats.count : 0;
      const realAvgRating = revStats && revStats.count > 0
        ? Number((revStats.sum / revStats.count).toFixed(1))
        : 0;

      const sellerOrderStats =
        (resolvedId !== undefined ? sellerOrdersMap.get(String(resolvedId)) : undefined) ||
        (resolvedName ? sellerOrdersMap.get(resolvedName.toLowerCase()) : undefined) ||
        { total: 0, fulfilled: 0 };

      const realFollowersCount = Array.isArray(liveUser?.follower_ids)
        ? liveUser.follower_ids.length
        : Number(liveUser?.followers_count ?? itemUser.followers_count ?? 0);

      // Keep seller profile snapshot in sync in the background when changed
      if (resolvedAvatar && itemUser.avatar !== resolvedAvatar) {
        setDoc(doc(db, "items", docSnap.id), {
          user: {
            ...itemUser,
            name: resolvedName,
            avatar: resolvedAvatar,
            location: resolvedLocation
          }
        }, { merge: true }).catch((e) => console.warn("Background item sync error:", e));
      }

      return {
        ...item,
        attributes: normalizedAttrs,
        sold_count: realSoldCount,
        reviews_count: realReviewsCount,
        reviews_avg_rating: realAvgRating,
        location: resolvedLocation,
        user: {
          ...itemUser,
          id: resolvedId,
          name: resolvedName,
          avatar: resolvedAvatar,
          location: resolvedLocation,
          created_at: liveUser?.created_at || itemUser.created_at || item.created_at,
          is_online: Boolean(liveUser?.is_online ?? itemUser.is_online ?? false),
          items_count: sellerItemsCountMap.get(canonicalSellerKey) ?? 1,
          reviews_count: sellerReviewsCountMap.get(canonicalSellerKey) ?? 0,
          followers_count: realFollowersCount,
          total_orders: sellerOrderStats.total,
          accepted_orders: sellerOrderStats.fulfilled,
        }
      };
    });

    // Arrange catalog in real e-commerce merchandising order:
    // 1) In-stock & priced listings first, 2) In-stock listings next, 3) Out-of-stock listings pushed to the end
    items.sort((a: any, b: any) => {
      const stockA = computeItemStock(a, a.attributes);
      const stockB = computeItemStock(b, b.attributes);
      const priceA = computeEffectivePrice(a, a.attributes);
      const priceB = computeEffectivePrice(b, b.attributes);

      const tierA = stockA > 0 && priceA > 0 ? 2 : stockA > 0 ? 1 : 0;
      const tierB = stockB > 0 && priceB > 0 ? 2 : stockB > 0 ? 1 : 0;
      if (tierA !== tierB) return tierB - tierA;

      const engA = Number(a.sold_count || 0) * 2 + Number(a.reviews_count || 0);
      const engB = Number(b.sold_count || 0) * 2 + Number(b.reviews_count || 0);
      if (engA !== engB) return engB - engA;

      const timeA = new Date(a.created_at || 0).getTime() || Number(a.id || 0);
      const timeB = new Date(b.created_at || 0).getTime() || Number(b.id || 0);
      return timeB - timeA;
    });

    return NextResponse.json({ items }, { status: 200 });

  } catch (err: any) {
    console.error("[shop/items] GET API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const payload = await req.json();
    const itemId = Date.now(); // numeric ID
    const itemDocRef = doc(db, "items", String(itemId));

    const itemLocation = payload.location || user.location || null;

    const newItem = {
      ...payload,
      id: itemId,
      stock: Number(payload.stock || 0),
      reviews_count: 0,
      reviews_avg_rating: 0.0,
      sold_count: 0,
      location: itemLocation,
      user: {
        id: user.id,
        name: user.name || "",
        avatar: user.avatar || "",
        is_online: true,
        location: itemLocation
      },
      created_at: new Date().toISOString()
    };

    await setDoc(itemDocRef, newItem);

    return NextResponse.json(newItem, { status: 201 });

  } catch (err: any) {
    console.error("[shop/items] POST API error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
