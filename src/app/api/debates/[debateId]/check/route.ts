import { NextResponse } from "next/server";
// import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/backend/firebase";

export async function GET(
  request: Request,
  { params }: { params: { debateId: string } }
) {
  const { debateId } = params;

  try {
    // Reference to the messages collection for this specific debate
    const messagesRef = collection(db, `debates/${debateId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const msgByUser: Record<string, string[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const { text, uid } = data;
      if (!msgByUser[uid]) msgByUser[uid] = [];
      msgByUser[uid].push(text);
    });

    const users = Object.keys(msgByUser);
    if (users.length !== 2) {
      return NextResponse.json(
        { error: "Debate must have exactly 2 users" },
        { status: 400 }
      );
    }

    // Fetch the displayName for both users
    const [user1Uid, user2Uid] = users;

    const getUserDisplayName = async (uid: string) => {
      const userDoc = doc(db, "users", uid);
      const userSnapshot = await getDoc(userDoc);
      return userSnapshot.exists() ? userSnapshot.data().displayName : uid; // Fallback to uid if no displayName
    };

    const [user1DisplayName, user2DisplayName] = await Promise.all([
      getUserDisplayName(user1Uid),
      getUserDisplayName(user2Uid),
    ]);

    // Format the messages by each user
    const query1 = msgByUser[user1Uid]
      .map((msg, i) => `${i + 1}. ${msg}`)
      .join(" ");

    const query2 = msgByUser[user2Uid]
      .map((msg, i) => `${i + 1}. ${msg}`)
      .join(" ");

    // Return the response with display names
    return NextResponse.json({
      user1: user1DisplayName,
      user2: user2DisplayName,
      thread_id: debateId,
      query1,
      query2,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
