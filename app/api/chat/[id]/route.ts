import { NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { id } = await params;
    const authUserId = Number(user.id);
    const otherUserId = Number(id);

    let otherUser: any = null;
    const otherUserDoc = await getDoc(doc(db, "users", String(otherUserId)));
    if (otherUserDoc.exists()) {
      otherUser = otherUserDoc.data();
    } else {
      otherUser = {
        id: otherUserId,
        name: `Seller ${otherUserId}`,
        avatar: null,
        is_online: true
      };
    }

    // Fetch messages using single field queries to avoid index errors in Firestore
    const messagesRef = collection(db, "messages");
    
    const [snap1, snap2, snap3, snap4] = await Promise.all([
      getDocs(query(messagesRef, where("sender_id", "==", authUserId))),
      getDocs(query(messagesRef, where("receiver_id", "==", authUserId))),
      getDocs(query(messagesRef, where("sender_id", "==", String(authUserId)))),
      getDocs(query(messagesRef, where("receiver_id", "==", String(authUserId))))
    ]);

    const allDocs = [
      ...snap1.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ...snap2.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ...snap3.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ...snap4.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    ];

    const uniqueDocsMap = new Map();
    for (const msg of allDocs) {
      if (!uniqueDocsMap.has(msg.id)) {
        uniqueDocsMap.set(msg.id, msg);
      }
    }

    const messages = Array.from(uniqueDocsMap.values()).filter((msg: any) => {
      const sId = Number(msg.sender_id);
      const rId = Number(msg.receiver_id);
      return (sId === authUserId && rId === otherUserId) || (sId === otherUserId && rId === authUserId);
    });

    // Sort by created_at asc
    messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Mark unread messages as read
    for (const msg of messages) {
      if (Number(msg.sender_id) === otherUserId && !msg.is_read) {
        try {
          await updateDoc(doc(db, "messages", msg.id), { is_read: true });
          msg.is_read = true;
        } catch (e) {
          console.warn("[chat/[id]] Failed to mark message read:", e);
        }
      }
    }

    // Check typing status
    const chatId = authUserId < otherUserId ? `${authUserId}_${otherUserId}` : `${otherUserId}_${authUserId}`;
    const typingDocRef = doc(db, "typing", `${chatId}_${otherUserId}`);
    let isTyping = false;
    try {
      const typingDoc = await getDoc(typingDocRef);
      if (typingDoc.exists()) {
        const typingData = typingDoc.data();
        if (Date.now() - typingData.last_typed_at < 3500) {
          isTyping = true;
        }
      }
    } catch (e) {
      console.warn("[chat/[id]] Failed to fetch typing status:", e);
    }

    return NextResponse.json({
      user: {
        id: otherUser.id,
        name: otherUser.name,
        avatar: otherUser.avatar || null,
        is_online: true
      },
      messages,
      is_typing: isTyping
    }, { status: 200 });

  } catch (err: any) {
    console.error("[chat/[id]] GET error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const { id } = await params;
    const authUserId = Number(user.id);
    const otherUserId = Number(id);

    let text: string | null = null;
    const imageUrls: string[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      text = formData.get("message") as string | null;
      
      const imageFiles = formData.getAll("images[]") as File[];
      const singleImage = formData.get("image") as File | null;
      
      const filesToUpload = imageFiles.length > 0 ? imageFiles : (singleImage ? [singleImage] : []);

      for (const file of filesToUpload) {
        if (file && typeof file === "object" && file.size > 0) {
          const url = await uploadFile(file, "chat-images");
          if (url) imageUrls.push(url);
        }
      }
    } else {
      const body = await req.json();
      text = body.message || null;
      if (body.images && Array.isArray(body.images)) {
        imageUrls.push(...body.images);
      } else if (body.image) {
        imageUrls.push(body.image);
      }
    }

    if (!text && imageUrls.length === 0) {
      return NextResponse.json({ message: "Message or at least one image is required." }, { status: 422 });
    }

    // Check if recipient user document exists in Firestore; if not, create a fallback stub doc so messages never fail
    const otherUserDocRef = doc(db, "users", String(otherUserId));
    const otherUserDoc = await getDoc(otherUserDocRef);
    if (!otherUserDoc.exists()) {
      await setDoc(otherUserDocRef, {
        id: otherUserId,
        name: `Seller ${otherUserId}`,
        username: `user_${otherUserId}`,
        avatar: null,
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const messageId = String(Date.now());
    const messageDocRef = doc(db, "messages", messageId);

    const newMessage = {
      id: messageId,
      sender_id: authUserId,
      receiver_id: otherUserId,
      message: text || null,
      image: imageUrls.length > 0 ? imageUrls[0] : null,
      images: imageUrls,
      is_read: false,
      created_at: new Date().toISOString()
    };

    await setDoc(messageDocRef, newMessage);

    return NextResponse.json({ message: newMessage }, { status: 201 });

  } catch (err: any) {
    console.error("[chat/[id]] POST error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}


