"use client";

import React, { JSX, useEffect, useState } from "react";
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/backend/firebase";

// const db = getFirestore();
const auth = getAuth();

type Debate = {
  title?: string;
  topic?: string;
  mode?: "individual" | "team";
  meetingLink?: string;
  meetingToken?: string;
  createdBy?: string;
  status?: string;
  settings?: { rounds?: number; timeLimitSeconds?: number };
  createdAt?: any;
  startedAt?: any;
  [k: string]: any;
};

type Participant = {
  id: string;
  uid: string;
  displayName?: string | null;
  joinedAt?: any;
  role?: string;
  [k: string]: any;
};

export default function DebateLobby(): JSX.Element {
  const params = useParams();
  const debateId = Array.isArray(params?.debateId) ? params?.debateId[0] : params?.debateId;
  const router = useRouter();

  const [debate, setDebate] = useState<Debate | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [joining, setJoining] = useState<boolean>(false);

  useEffect(() => {
    if (!debateId) return;

    const dRef = doc(db, "debates", debateId);
    const unsubD = onSnapshot(dRef, (snap) => {
      const data = snap.exists() ? (snap.data() as Debate) : null;
      setDebate(data);

      const user: User | null = auth.currentUser;
      if (snap.exists() && user) {
        setIsHost(Boolean(data?.createdBy === user.uid));
      } else {
        setIsHost(false);
      }
    });

    // participants listener
    const partCol = collection(db, "debates", debateId, "participants");
    const q = query(partCol, orderBy("joinedAt", "asc"));
    const unsubP = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const docs = snap.docs.map((d) => {
        const raw = d.data();
        const p: Participant = {
          id: d.id,
          uid: raw.uid,
          displayName: raw.displayName ?? raw.email ?? "Anonymous",
          joinedAt: raw.joinedAt,
          role: raw.role,
          ...raw,
        };
        return p;
      });
      setParticipants(docs);
    });

    return () => {
      unsubD();
      unsubP();
    };
  }, [debateId]);

  // redirect to live page when debate goes live
  useEffect(() => {
    if (!debateId || !debate) return;
    if (debate.status === "live") {
      // Replace to avoid stacking history
      router.replace(`/debate/${debateId}/live`);
    }
  }, [debateId, debate, router]);

  async function handleJoin() {
  if (!debateId) return;
  const user = auth.currentUser;
  if (!user) return alert("Sign in first");

  if (participants.some((p) => p.uid === user.uid)) {
    return alert("Already joined");
  }

  setJoining(true);
  try {
    const res = await fetch(`/api/debates/${debateId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: user.uid,
        displayName: user.displayName || user.email,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Join failed");
  } catch (err) {
    console.error("Join error:", err);
    alert("Failed to join debate");
  } finally {
    setJoining(false);
  }
}

async function handleStart() {
  if (!debateId) return;
  const user = auth.currentUser;
  if (!user) return alert("Sign in first");

  try {
    const res = await fetch(`/api/debates/${debateId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Start failed");
  } catch (err) {
    console.error("Start error:", err);
    alert("Failed to start debate");
  }
}


  if (!debateId) return <div>Invalid debate ID.</div>;
  if (!debate) return <div>Loading...</div>;

  const isParticipant = auth.currentUser ? participants.some((p) => p.uid === auth.currentUser!.uid) : false;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <h2>{debate.title ?? "Untitled Debate"}</h2>
      <p>{debate.topic}</p>
      <p>Mode: {debate.mode ?? "individual"}</p>

      <div style={{ margin: "12px 0" }}>
        <label style={{ display: "block", marginBottom: 6 }}>Meeting link</label>
        <input
          value={debate.meetingLink ?? ""}
          readOnly
          style={{ width: "70%", padding: 8, marginRight: 8 }}
        />
        <button
          onClick={() => {
            if (debate.meetingLink) navigator.clipboard.writeText(debate.meetingLink);
          }}
        >
          Copy
        </button>
      </div>

      <h3>
        Participants ({participants.length})
      </h3>
      <ul>
        {participants.map((p) => (
          <li key={p.id}>
            {p.displayName} {p.role === "host" ? "(host)" : ""}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 16 }}>
        {!isParticipant && (
          <button onClick={handleJoin} disabled={joining}>
            {joining ? "Joining..." : "Join"}
          </button>
        )}

        {isHost && debate.status === "waiting" && (
          <button onClick={handleStart} style={{ marginLeft: 12 }}>
            Start Debate (host)
          </button>
        )}
      </div>
    </div>
  );
}
