import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuthUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const authUserId = Number(user.id);
    const messagesRef = collection(db, "messages");
    
    // Find all distinct users the current user has chatted with (checking both number & string types)
    const [snapSenderNum, snapReceiverNum, snapSenderStr, snapReceiverStr] = await Promise.all([
      getDocs(query(messagesRef, where("sender_id", "==", authUserId))),
      getDocs(query(messagesRef, where("receiver_id", "==", authUserId))),
      getDocs(query(messagesRef, where("sender_id", "==", String(authUserId)))),
      getDocs(query(messagesRef, where("receiver_id", "==", String(authUserId))))
    ]);

    const rawMessages = [
      ...snapSenderNum.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ...snapReceiverNum.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ...snapSenderStr.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      ...snapReceiverStr.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    ];

    // Deduplicate by message id
    const uniqueMap = new Map();
    for (const msg of rawMessages) {
      if (!uniqueMap.has(msg.id)) {
        uniqueMap.set(msg.id, msg);
      }
    }
    const allMessages = Array.from(uniqueMap.values());

    // Sort by created_at desc
    allMessages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const conversations: any[] = [];
    const seenUsers: number[] = [];

    for (const msg of allMessages) {
      const senderIdNum = Number(msg.sender_id);
      const receiverIdNum = Number(msg.receiver_id);
      const otherUserId = senderIdNum === authUserId ? receiverIdNum : senderIdNum;

      if (!seenUsers.includes(otherUserId)) {
        seenUsers.push(otherUserId);

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

        // Calculate unread count
        const unreadMessages = allMessages.filter(m => 
          Number(m.sender_id) === otherUserId && 
          Number(m.receiver_id) === authUserId && 
          !m.is_read
        );

        conversations.push({
          user: {
            id: otherUser.id,
            name: otherUser.name,
            avatar: otherUser.avatar || null,
            is_online: true
          },
          last_message: {
            id: msg.id,
            message: msg.message || "",
            image: msg.image || null,
            sender_id: senderIdNum,
            receiver_id: receiverIdNum,
            is_read: msg.is_read,
            created_at: msg.created_at
          },
          unread_count: unreadMessages.length
        });
      }
    }

    return NextResponse.json({ conversations }, { status: 200 });

  } catch (err: any) {
    console.error("[chat/conversations] GET conversations error:", err);
    return NextResponse.json({ message: err?.message || "Internal server error." }, { status: 500 });
  }
}

