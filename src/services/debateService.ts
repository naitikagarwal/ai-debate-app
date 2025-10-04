import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
// import { db } from "@/firebase";
import { User } from "firebase/auth";
import { db } from "@/backend/firebase";

export type Debate = {
  title?: string;
  topic?: string;
  mode?: "individual" | "team";
  meetingLink?: string;
  createdBy?: string;
  status?: string;
  settings?: { rounds?: number; timeLimitSeconds?: number };
  createdAt?: any;
  startedAt?: any;
};

export type Participant = {
  id: string;
  uid: string;
  displayName?: string | null;
  joinedAt?: any;
  role?: string;
};

// subscribe to debate doc
export function subscribeDebate(
  debateId: string,
  cb: (debate: Debate | null) => void
) {
  const dRef = doc(db, "debates", debateId);
  return onSnapshot(dRef, (snap) => {
    cb(snap.exists() ? (snap.data() as Debate) : null);
  });
}

// subscribe to participants
export function subscribeParticipants(
  debateId: string,
  cb: (participants: Participant[]) => void
) {
  const partCol = collection(db, "debates", debateId, "participants");
  const q = query(partCol, orderBy("joinedAt", "asc"));
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const docs = snap.docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        uid: raw.uid,
        displayName: raw.displayName ?? raw.email ?? "Anonymous",
        joinedAt: raw.joinedAt,
        role: raw.role,
        ...raw,
      } as Participant;
    });
    cb(docs);
  });
}

export async function joinDebate(debateId: string, user: User) {
  const partCol = collection(db, "debates", debateId, "participants");
  await addDoc(partCol, {
    uid: user.uid,
    displayName: user.displayName || user.email || "Anonymous",
    joinedAt: serverTimestamp(),
    role: "participant",
  });
}

export async function startDebate(debateId: string) {
  const dRef = doc(db, "debates", debateId);
  await updateDoc(dRef, {
    status: "live",
    startedAt: serverTimestamp(),
  });
}
