import { NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuthUser } from "@/lib/db";

// Helper to upload a File to Firebase Storage
async function uploadFile(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const fileRef = ref(storage, `${folder}/${filename}`);
  await uploadBytes(fileRef, new Uint8Array(bytes), {
    contentType: file.type
  });
  return getDownloadURL(fileRef);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const itemDocRef = doc(db, "items", id);
    const itemSnap = await getDoc(itemDocRef);
    if (!itemSnap.exists()) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    const itemData = itemSnap.data();
    if (itemData.user.id !== Number(user.id)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string || "";
    const price = formData.get("price") as string;
    const stock = Number(formData.get("stock") || 0);
    const category = formData.get("category") as string;
    const attributesStr = formData.get("attributes") as string || "{}";

    let newAttrs: any = {};
    try {
      newAttrs = JSON.parse(attributesStr);
    } catch (e) {
      newAttrs = {};
    }

    const oldAttributes = itemData.attributes || {};
    const attributes = { ...oldAttributes, ...newAttrs };

    // 1. Upload main images
    const mainFiles = formData.getAll("images[]") as File[];
    const existingMain = attributes.existing_main_images || [];
    const finalMainPaths = [...existingMain];

    for (const file of mainFiles) {
      if (file && file.size > 0) {
        const url = await uploadFile(file, "item-images");
        finalMainPaths.push(url);
      }
    }
    attributes.main_images = finalMainPaths;
    delete attributes.existing_main_images;

    const mainImageUrl = finalMainPaths.length > 0 ? finalMainPaths[0] : (itemData.image || "");

    // 2. Upload showcase video
    const videoFile = formData.get("video") as File;
    if (videoFile && videoFile.size > 0) {
      attributes.video_path = await uploadFile(videoFile, "item-videos");
    } else {
      attributes.video_path = attributes.existing_video_path || oldAttributes.video_path || null;
    }
    delete attributes.existing_video_path;

    // 3. Upload description images
    const descFiles = formData.getAll("description_images[]") as File[];
    const existingDesc = attributes.existing_description_images || [];
    const finalDescPaths = [...existingDesc];

    for (const file of descFiles) {
      if (file && file.size > 0) {
        const url = await uploadFile(file, "item-images");
        finalDescPaths.push(url);
      }
    }
    attributes.description_images = finalDescPaths;
    delete attributes.existing_description_images;

    // 4. Upload variant images
    const variantFiles = formData.getAll("variant_images[]") as File[];
    const existingVariantPaths = attributes.existing_variant_paths || oldAttributes.variant_image_paths || [];
    const finalVariantPaths: (string | null)[] = [];
    let fileIndex = 0;

    for (const color of attributes.colors || []) {
      const idx = attributes.colors.indexOf(color);
      if (existingVariantPaths[idx]) {
        finalVariantPaths.push(existingVariantPaths[idx]);
      } else {
        const file = variantFiles[fileIndex];
        if (file && file.size > 0) {
          const url = await uploadFile(file, "item-images");
          finalVariantPaths.push(url);
          fileIndex++;
        } else {
          finalVariantPaths.push(null);
        }
      }
    }
    attributes.variant_image_paths = finalVariantPaths;
    delete attributes.existing_variant_paths;

    const updatedItem = {
      ...itemData,
      name,
      description,
      price,
      stock,
      category,
      image: mainImageUrl,
      attributes
    };

    await updateDoc(itemDocRef, updatedItem);

    return NextResponse.json({
      message: "Item updated successfully.",
      item: updatedItem
    }, { status: 200 });

  } catch (err: any) {
    console.error("[api/items/[id]] POST update error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const itemDocRef = doc(db, "items", id);
    const itemSnap = await getDoc(itemDocRef);
    if (!itemSnap.exists()) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    const itemData = itemSnap.data();
    if (itemData.user.id !== Number(user.id)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }

    await deleteDoc(itemDocRef);
    return NextResponse.json({ message: "Item deleted successfully." }, { status: 200 });

  } catch (err: any) {
    console.error("[api/items/[id]] DELETE error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
