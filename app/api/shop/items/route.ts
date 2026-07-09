import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, addDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

// Seed data to populate empty Firestore database
const seededItems = [
  {
    id: 1,
    name: "AeroSwift Running Shoes",
    description: "Experience maximum speed and comfort with breathable mesh and responsive foam cushioning.",
    price: "120.00",
    stock: 50,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    category: "Footwear",
    reviews_count: 5,
    reviews_avg_rating: 4.8,
    sold_count: 12,
    attributes: {
      sizes: ["8", "9", "10", "11"],
      colors: ["Red", "Black", "Blue"],
      size_stocks: { "8": 15, "9": 15, "10": 10, "11": 10 }
    },
    user: {
      id: 999,
      name: "Aero Athletics",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      items_count: 3,
      reviews_count: 15,
      followers_count: 120,
      is_online: true
    },
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Apex Smart Watch",
    description: "Track your fitness, notifications, and heart rate with a sleek 1.4-inch AMOLED display and 7-day battery life.",
    price: "199.00",
    stock: 30,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    reviews_count: 3,
    reviews_avg_rating: 4.5,
    sold_count: 8,
    attributes: {
      sizes: ["Standard"],
      colors: ["Midnight Black", "Silver", "Rose Gold"],
      size_stocks: { "Standard": 30 }
    },
    user: {
      id: 998,
      name: "Apex Tech",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      items_count: 1,
      reviews_count: 8,
      followers_count: 85,
      is_online: false
    },
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Studio Pro ANC Headphones",
    description: "Immerse yourself in premium sound quality with active noise cancellation and 40 hours of playback time.",
    price: "299.00",
    stock: 20,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    category: "Audio",
    reviews_count: 8,
    reviews_avg_rating: 4.9,
    sold_count: 15,
    attributes: {
      sizes: ["Over-Ear"],
      colors: ["Matte Black", "Sand White"],
      size_stocks: { "Over-Ear": 20 }
    },
    user: {
      id: 997,
      name: "Studio Sounds",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      items_count: 2,
      reviews_count: 24,
      followers_count: 340,
      is_online: true
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
      console.log("[shop/items] Seeding default products...");
      for (const item of seededItems) {
        await setDoc(doc(db, "items", String(item.id)), item);
      }
      return NextResponse.json(seededItems, { status: 200 });
    }

    const items = snap.docs.map(doc => doc.data());
    return NextResponse.json(items, { status: 200 });

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

    const newItem = {
      ...payload,
      id: itemId,
      stock: Number(payload.stock || 0),
      reviews_count: 0,
      reviews_avg_rating: 0.0,
      sold_count: 0,
      user: {
        id: user.id,
        name: user.name || "",
        avatar: user.avatar || "",
        is_online: true
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
