import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import admin from "@/backend/firebaseAdmin"; // your server-only admin SDK wrapper

export async function POST(req: Request) {
  try {
    const { 
      title, 
      topic, 
      mode, 
      uid, 
      displayName, 
      settings = {}, 
      debateType = "chat" // "chat" or "video"
    } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing user id" }, { status: 401 });
    }

    const debateId = nanoid(10);
    const meetingToken = nanoid(8);
    const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/debate/${debateId}?t=${meetingToken}`;

    const db = admin.firestore();

    // Merge provided settings with defaults
    const mergedSettings = {
      rounds: typeof settings.rounds === "number" ? settings.rounds : 3,
      timeLimitSeconds: typeof settings.timeLimitSeconds === "number" ? settings.timeLimitSeconds : 180,
      debateType: debateType === "video" ? "video" : "chat",
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

    // Create debate
    await db.collection("debates").doc(debateId).set(debateData);

    // Add participant
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