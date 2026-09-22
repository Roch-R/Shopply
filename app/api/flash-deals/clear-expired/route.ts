import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const flashDocRef = doc(db, "settings", "flash_deals");
    const snapshot = await getDoc(flashDocRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const isExpired = new Date(data.end_time).getTime() <= Date.now();
      
      // Clear items if expired or if items exist after end_time
      if (isExpired && Array.isArray(data.items) && data.items.length > 0) {
        await updateDoc(flashDocRef, {
          items: [],
          updated_at: new Date().toISOString()
        });
        return NextResponse.json({ success: true, message: "Expired flash deals emptied successfully.", emptied: true });
      }
      return NextResponse.json({ success: true, message: "Flash deals are either active or already empty.", emptied: false });
    }

    return NextResponse.json({ success: false, message: "Settings not found." }, { status: 404 });
  } catch (error: any) {
    console.error("Failed to clear expired flash deals:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
