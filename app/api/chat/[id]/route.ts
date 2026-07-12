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
    const otherUserId = Number(id);

    const otherUserDoc = await getDoc(doc(db, "users", String(otherUserId)));
    if (!otherUserDoc.exists()) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const otherUser = otherUserDoc.data();

    // Fetch messages between auth user and this user
    const messagesRef = collection(db, "messages");
    
    const q1 = query(messagesRef, where("sender_id", "==", user.id), where("receiver_id", "==", otherUserId));
    const q2 = query(messagesRef, where("sender_id", "==", otherUserId), where("receiver_id", "==", user.id));

    const [snap1, snap2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);

    const messages = [
      ...snap1.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)),
      ...snap2.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))
    ];

    // Sort by created_at asc
    messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Mark unread messages as read
    for (const msg of messages) {
      if (msg.sender_id === otherUserId && !msg.is_read) {
        await updateDoc(doc(db, "messages", msg.id), { is_read: true });
        msg.is_read = true;
      }
    }

    // Check if the other user has typed recently in this chat
    const userId = Number(user.id);
    const chatId = userId < otherUserId ? `${userId}_${otherUserId}` : `${otherUserId}_${userId}`;
    const typingDocRef = doc(db, "typing", `${chatId}_${otherUserId}`);
    let isTyping = false;
    try {
      const typingDoc = await getDoc(typingDocRef);
      if (typingDoc.exists()) {
        const typingData = typingDoc.data();
        if (Date.now() - typingData.last_typed_at < 3500) { // Active typing timeout threshold: 3.5 seconds
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
    const otherUserId = Number(id);

    let text: string | null = null;
    let imageUrl: string | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Parse request body as FormData for modern/image-enabled client calls
      const formData = await req.formData();
      text = formData.get("message") as string | null;
      const imageFile = formData.get("image") as File | null;
      
      if (imageFile && imageFile.size > 0) {
        imageUrl = await uploadFile(imageFile, "chat-images");
      }
    } else {
      // Fallback parsing as JSON for older cached clients on user browsers
      const body = await req.json();
      text = body.message || null;
      imageUrl = body.image || null;
    }

    if (!text && !imageUrl) {
      return NextResponse.json({ message: "Message or image is required." }, { status: 422 });
    }

    const otherUserDoc = await getDoc(doc(db, "users", String(otherUserId)));
    if (!otherUserDoc.exists()) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const messageId = String(Date.now());
    const messageDocRef = doc(db, "messages", messageId);

    const newMessage = {
      id: messageId,
      sender_id: user.id,
      receiver_id: otherUserId,
      message: text || null,
      image: imageUrl,
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
