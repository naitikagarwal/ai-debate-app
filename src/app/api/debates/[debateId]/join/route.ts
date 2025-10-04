import { NextResponse } from "next/server";
import admin from "@/backend/firebaseAdmin";

export async function POST(
  req: Request,
  { params }: { params: { debateId: string } }
) {
  try {
    const { uid, displayName } = await req.json();
    const { debateId } = params;

    if (!uid) return NextResponse.json({ error: "Missing user id" }, { status: 401 });

    const db = admin.firestore();

    // check if participant already exists
    const partRef = db.collection("debates").doc(debateId).collection("participants").doc(uid);
    const existing = await partRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: "Already joined" }, { status: 400 });
    }

    await partRef.set({
      uid,
      displayName: displayName || "Anonymous",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      role: "participant",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /debates/:id/join] error:", err);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
