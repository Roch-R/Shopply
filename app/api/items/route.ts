import { NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuthUser } from "@/lib/db";

// Safe helper to upload a File to Firebase Storage with base64 data URL fallback if storage is locked
async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const fileRef = ref(storage, `${folder}/${filename}`);
    
    await uploadBytes(fileRef, new Uint8Array(bytes), {
      contentType: file.type || "application/octet-stream"
    });
    return await getDownloadURL(fileRef);
  } catch (err: any) {
    console.warn(`[uploadFile] Firebase Storage upload failed (${err?.message}), converting to inline Data URL fallback.`);
    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mime = file.type || "image/png";
      return `data:${mime};base64,${base64}`;
    } catch (fallbackErr) {
      console.error("[uploadFile] Data URL fallback failed:", fallbackErr);
      return "";
    }
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const itemsRef = collection(db, "items");
    const q = query(itemsRef, where("user.id", "==", Number(user.id)));
    const snap = await getDocs(q);

    const items = snap.docs.map(doc => doc.data());
    return NextResponse.json({ items }, { status: 200 });

  } catch (err: any) {
    console.error("[api/items] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string || "";
    const price = formData.get("price") as string;
    const stock = Number(formData.get("stock") || 0);
    const category = formData.get("category") as string || "General";
    const attributesStr = formData.get("attributes") as string || "{}";
    
    if (!name || !price) {
      return NextResponse.json({ message: "Item name and price are required." }, { status: 422 });
    }

    let attributes: any = {};
    try {
      attributes = JSON.parse(attributesStr);
    } catch (e) {
      attributes = {};
    }

    // 1. Upload main images
    const mainFiles = formData.getAll("images[]") as File[];
    const existingMain = attributes.existing_main_images || [];
    const finalMainPaths = [...existingMain];

    for (const file of mainFiles) {
      if (file && typeof file === "object" && file.size > 0) {
        const url = await uploadFile(file, "item-images");
        if (url) finalMainPaths.push(url);
      }
    }
    attributes.main_images = finalMainPaths;
    delete attributes.existing_main_images;

    const mainImageUrl = finalMainPaths.length > 0 ? finalMainPaths[0] : "";

    // 2. Upload showcase video
    const videoFile = formData.get("video") as File;
    if (videoFile && typeof videoFile === "object" && videoFile.size > 0) {
      attributes.video_path = await uploadFile(videoFile, "item-videos");
    } else {
      attributes.video_path = attributes.existing_video_path || null;
    }
    delete attributes.existing_video_path;

    // 3. Upload description images
    const descFiles = formData.getAll("description_images[]") as File[];
    const existingDesc = attributes.existing_description_images || [];
    const finalDescPaths = [...existingDesc];

    for (const file of descFiles) {
      if (file && typeof file === "object" && file.size > 0) {
        const url = await uploadFile(file, "item-images");
        if (url) finalDescPaths.push(url);
      }
    }
    attributes.description_images = finalDescPaths;
    delete attributes.existing_description_images;

    // 4. Upload variant images
    const variantFiles = formData.getAll("variant_images[]") as File[];
    const existingVariantPaths = attributes.existing_variant_paths || [];
    const finalVariantPaths: (string | null)[] = [];
    let fileIndex = 0;

    for (const color of attributes.colors || []) {
      const idx = attributes.colors.indexOf(color);
      if (existingVariantPaths[idx]) {
        finalVariantPaths.push(existingVariantPaths[idx]);
      } else {
        const file = variantFiles[fileIndex];
        if (file && typeof file === "object" && file.size > 0) {
          const url = await uploadFile(file, "item-images");
          finalVariantPaths.push(url || null);
          fileIndex++;
        } else {
          finalVariantPaths.push(null);
        }
      }
    }
    attributes.variant_image_paths = finalVariantPaths;
    delete attributes.existing_variant_paths;

    // Create item doc
    const itemId = Date.now();
    const itemDocRef = doc(db, "items", String(itemId));

    const newItem = {
      id: itemId,
      name,
      description,
      price,
      stock,
      category,
      image: mainImageUrl,
      is_published: true,
      attributes,
      reviews_count: 0,
      reviews_avg_rating: 0.0,
      sold_count: 0,
      user: {
        id: Number(user.id),
        name: user.name || "",
        avatar: user.avatar || "",
        is_online: true
      },
      created_at: new Date().toISOString()
    };

    await setDoc(itemDocRef, newItem);

    return NextResponse.json({
      message: "Item created successfully.",
      item: newItem
    }, { status: 201 });

  } catch (err: any) {
    console.error("[api/items] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
