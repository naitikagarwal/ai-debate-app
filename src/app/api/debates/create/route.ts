import { NextResponse } from "next/server";
import admin from "@/backend/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { 
      title, 
      topic, 
      mode, 
      uid, 
      displayName, 
      settings = {} 
    } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing user id" }, { status: 401 });
    }

    const debateId = Date.now().toString();
    const meetingToken = Math.floor(10000000 + Math.random() * 90000000).toString();  

    const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/debate/${debateId}?t=${meetingToken}`;

    const db = admin.firestore();

    const mergedSettings = {
      rounds: typeof settings.rounds === "number" ? settings.rounds : 3,
      timeLimitSeconds: typeof settings.timeLimitSeconds === "number" ? settings.timeLimitSeconds : 180,
      debateType: "chat",
    };

    const debateData = {
      title: title || "Untitled Debate",
      topic: topic || "",
      mode: mode || "individual",
      createdBy: uid,
      meetingToken,
      meetingLink,
      status: "waiting",
      settings: mergedSettings,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("debates").doc(debateId).set(debateData);

    await db
      .collection("debates")
      .doc(debateId)
      .collection("participants")
      .doc(uid)
      .set({
        uid,
        displayName: displayName || "Anonymous",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: "host",
      });

    // Team mode: create teams and add creator to Team A
    if (mode === "team") {
      await db.collection("debates").doc(debateId).collection("teams").doc("A").set({ 
        name: "A", 
        members: [uid] 
      });
      await db.collection("debates").doc(debateId).collection("teams").doc("B").set({ 
        name: "B", 
        members: [] 
      });
    }

    return NextResponse.json({ success: true, debateId, meetingLink });
  } catch (err: any) {
    console.error("[API /debates/create] error:", err);
    return NextResponse.json({ error: "Failed to create debate" }, { status: 500 });
  }
}