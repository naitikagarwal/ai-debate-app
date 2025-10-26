import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/backend/firebase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ debateId: string }> }
) {
  const { debateId } = await context.params;

  try {
    // Fetch debate info
    const debateDoc = doc(db, "debates", debateId);
    const debateSnap = await getDoc(debateDoc);

    if (!debateSnap.exists()) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    const debateData = debateSnap.data();
    const mode = debateData?.mode || "individual";

    // Fetch all messages
    const messagesRef = collection(db, `debates/${debateId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const msgByKey: Record<string, string[]> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const { text, uid, team } = data;

      // In team mode, group by team; else by uid
      const key = mode === "team" ? team : uid;
      if (!msgByKey[key]) msgByKey[key] = [];
      msgByKey[key].push(text);
    });

    // In team mode, ensure team A and team B exist
    if (mode === "team") {
      const teamA = msgByKey["A"] || [];
      const teamB = msgByKey["B"] || [];

      return NextResponse.json({
        team1: "Team A",
        team2: "Team B",
        thread_id: debateId,
        query1: teamA.map((msg, i) => `${i + 1}. ${msg}`).join(" "),
        query2: teamB.map((msg, i) => `${i + 1}. ${msg}`).join(" "),
      });
    }

    // Individual mode
    const users = Object.keys(msgByKey);
    if (users.length !== 2) {
      return NextResponse.json(
        { error: "Debate must have exactly 2 users" },
        { status: 400 }
      );
    }

    const [user1Uid, user2Uid] = users;
    const getUserDisplayName = async (uid: string) => {
      const userDoc = doc(db, "users", uid);
      const userSnap = await getDoc(userDoc);
      return userSnap.exists() ? userSnap.data().displayName : uid;
    };

    const [user1DisplayName, user2DisplayName] = await Promise.all([
      getUserDisplayName(user1Uid),
      getUserDisplayName(user2Uid),
    ]);

    const query1 = msgByKey[user1Uid].map((msg, i) => `${i + 1}. ${msg}`).join(" ");
    const query2 = msgByKey[user2Uid].map((msg, i) => `${i + 1}. ${msg}`).join(" ");

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
