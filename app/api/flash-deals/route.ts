import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export interface FlashDealItem {
  item_id: number;
  flash_price: number;
  discount_pct: number;
  claimed_pct: number;
  stock: number;
}

export interface FlashDealConfig {
  is_active: boolean;
  end_time: string;
  badge_text: string;
  items: FlashDealItem[];
  updated_at?: string;
}

const DEFAULT_CONFIG: FlashDealConfig = {
  is_active: true,
  end_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  badge_text: "🔥 Up to 50% OFF Limited Time",
  items: [
    { item_id: 1, flash_price: 89.00, discount_pct: 26, claimed_pct: 45, stock: 34 },
    { item_id: 2, flash_price: 139.00, discount_pct: 30, claimed_pct: 52, stock: 18 }
  ]
};

export async function GET() {
  try {
    const flashDocRef = doc(db, "settings", "flash_deals");
    const snapshot = await getDoc(flashDocRef);

    if (snapshot.exists()) {
      return NextResponse.json({ success: true, data: snapshot.data() as FlashDealConfig });
    }

    // Auto-initialize if not yet created
    await setDoc(flashDocRef, { ...DEFAULT_CONFIG, updated_at: new Date().toISOString() });
    return NextResponse.json({ success: true, data: DEFAULT_CONFIG });
  } catch (error: any) {
    console.warn("Failed to fetch flash deals from Firestore:", error);
    return NextResponse.json({ success: true, data: DEFAULT_CONFIG, fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const flashDocRef = doc(db, "settings", "flash_deals");

    const payload: FlashDealConfig = {
      is_active: body.is_active !== false,
      end_time: body.end_time || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      badge_text: body.badge_text || "🔥 Up to 50% OFF Limited Time",
      items: Array.isArray(body.items) ? body.items : [],
      updated_at: new Date().toISOString()
    };

    await setDoc(flashDocRef, payload);
    return NextResponse.json({ success: true, data: payload });
  } catch (error: any) {
    console.error("Failed to update flash deals in Firestore:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update flash deals" }, { status: 500 });
  }
}
