import { db } from "@/backend/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export async function getDebateQueries(debateId: string) {
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
    throw new Error("This debate does not involve exactly 2 users.");
  }

  const user1_id = users[0];
  const user2_id = users[1];

  const query1 = msgByUser[user1_id].join(" ");
  const query2 = msgByUser[user2_id].join(" ");

  return { user1_id, user2_id, debateId, query1, query2 };
}
