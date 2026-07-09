import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const messagesRef = collection(db, "messages");
    
    // Find all distinct users the current user has chatted with
    // For simple serverless implementation, query where sender is user or receiver is user
    const qSender = query(messagesRef, where("sender_id", "==", user.id));
    const qReceiver = query(messagesRef, where("receiver_id", "==", user.id));
    
    const [snapSender, snapReceiver] = await Promise.all([
      getDocs(qSender),
      getDocs(qReceiver)
    ]);

    const allMessages = [
      ...snapSender.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)),
      ...snapReceiver.docs.map(doc => ({ ...doc.data(), id: doc.id } as any))
    ];

    // Sort by created_at desc
    allMessages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const conversations: any[] = [];
    const seenUsers: number[] = [];

    for (const msg of allMessages) {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

      if (!seenUsers.includes(otherUserId)) {
        seenUsers.push(otherUserId);

        const otherUserDoc = await getDoc(doc(db, "users", String(otherUserId)));
        if (otherUserDoc.exists()) {
          const otherUser = otherUserDoc.data();
          
          // Calculate unread count
          const unreadMessages = allMessages.filter(m => 
            m.sender_id === otherUserId && 
            m.receiver_id === user.id && 
            !m.is_read
          );

          conversations.push({
            user: {
              id: otherUser.id,
              name: otherUser.name,
              avatar: otherUser.avatar || null,
              is_online: true // simple default
            },
            last_message: {
              id: msg.id,
              message: msg.message || "",
              image: msg.image || null,
              sender_id: msg.sender_id,
              receiver_id: msg.receiver_id,
              is_read: msg.is_read,
              created_at: msg.created_at
            },
            unread_count: unreadMessages.length
          });
        }
      }
    }

    return NextResponse.json({ conversations }, { status: 200 });

  } catch (err: any) {
    console.error("[chat] GET conversations error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}
