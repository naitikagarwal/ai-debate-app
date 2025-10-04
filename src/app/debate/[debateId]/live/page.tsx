"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  setDoc,
  deleteDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/backend/firebase";
import { useParams } from "next/navigation";

/**
 * DebateLive
 *
 * - Supports "chat" and "video" debateType.
 * - In video mode:
 *   - Starts local camera & mic.
 *   - Creates a mesh of RTCPeerConnections to other participants.
 *   - Uses Firestore collection: debates/{debateId}/webrtc_signals for signaling (offer/answer/candidate).
 *   - Renders local + remote videos.
 *   - Allows starting/stopping live captions (SpeechRecognition) set to en-IN.
 *   - Stores each caption in debates/{debateId}/captions with createdAt.
 *
 * - In chat mode:
 *   - Existing messages work and chatHistory is saved in meta/chatHistory (kept from your previous code).
 */

type Debate = {
  title?: string;
  topic?: string;
  status?: string;
  settings?: {
    debateType?: "chat" | "video";
    rounds?: number;
    timeLimitSeconds?: number;
  };
};

type Message = {
  id: string;
  uid: string;
  text: string;
  createdAt: any;
};

type Caption = {
  id?: string;
  uid?: string;
  text: string;
  createdAt?: any;
};

type SignalDoc = {
  from: string;
  to: string;
  type: "offer" | "answer" | "candidate";
  sdp?: any;
  candidate?: any;
  createdAt?: any;
};

export default function DebateLive() {
  const params = useParams();
  const debateId = Array.isArray(params?.debateId)
    ? params.debateId[0]
    : params?.debateId;

  const [debate, setDebate] = useState<Debate | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isParticipant, setIsParticipant] = useState(false);

  // video
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ uid: string; stream: MediaStream }[]>([]);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map()); // key = remoteUid
  const signalsUnsubRef = useRef<() => void | null>(null);
  const participantsUnsubRef = useRef<() => void | null>(null);

  // captions
  const [captions, setCaptions] = useState<Caption[]>([]);
  const recognitionRef = useRef<any | null>(null);
  const [captionsRunning, setCaptionsRunning] = useState(false);

  // chat save debounce
  const saveTimer = useRef<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // STUN servers
  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      // add TURN if you have one
    ],
  };

  // ----------------------
  // Firestore listeners
  // ----------------------
  useEffect(() => {
    if (!debateId) return;

    const dRef = doc(db, "debates", debateId);
    const unsubD = onSnapshot(dRef, (snap) => {
      if (snap.exists()) setDebate(snap.data() as Debate);
      else setDebate(null);
    });

    const mRef = collection(db, "debates", debateId, "messages");
    const q = query(mRef, orderBy("createdAt", "asc"));
    const unsubM = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Message[];
      setMessages(docs);
    });

    return () => {
      unsubD();
      unsubM();
    };
  }, [debateId]);

  // participant doc of current user
  useEffect(() => {
    if (!debateId) return;
    const user = auth.currentUser;
    if (!user) {
      setIsParticipant(false);
      return;
    }
    const pDoc = doc(db, "debates", debateId, "participants", user.uid);
    const unsubP = onSnapshot(pDoc, (snap) => {
      setIsParticipant(snap.exists());
    });
    return () => unsubP();
  }, [debateId]);

  // ----------------------
  // WebRTC + signaling
  // ----------------------
  // Start video system when debate becomes live & is video type and user is participant
  useEffect(() => {
    if (!debateId || !debate) return;

    const debateType = debate.settings?.debateType || "chat";

    if (debateType !== "video") {
      // ensure cleanup if switching off video mode
      stopLocalMedia();
      cleanupPeers();
      return;
    }

    if (debate.status !== "live") {
      // not live yet
      return;
    }

    // only participants are allowed to start video peers (you can change to allow viewers)
    const user = auth.currentUser;
    if (!user || !isParticipant) {
      console.log("Not participant or not signed-in — skipping video init.");
      return;
    }

    // 1) start local camera/mic
    startLocalMedia().then(() => {
      // 2) start listening to participants to create peer connections
      startParticipantsListener();
      // 3) start listening to signalling messages for this user
      startSignalsListener();
    });

    // cleanup on unmount or when dependencies change
    return () => {
      // stop listeners and peers
      stopLocalMedia();
      stopSignalsListener();
      stopParticipantsListener();
      cleanupPeers();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId, debate?.status, debate?.settings?.debateType, isParticipant]);

  // ----------------------
  // Signaling helpers
  // ----------------------
  function startSignalsListener() {
    if (!debateId) return;
    const user = auth.currentUser;
    if (!user) return;

    // listen for any signals targeting me
    const col = collection(db, "debates", debateId, "webrtc_signals");
    const q = query(col, where("to", "==", user.uid), orderBy("createdAt", "asc"));

    // unsubscribe previous if any
    stopSignalsListener();

    const unsub = onSnapshot(q, async (snap) => {
      for (const d of snap.docs) {
        const data = d.data() as SignalDoc;
        const docRef = d.ref;
        try {
          await handleSignal(data);
        } catch (err) {
          console.error("handleSignal error:", err);
        } finally {
          // delete processed signal doc
          try {
            await deleteDoc(docRef);
          } catch {}
        }
      }
    });

    signalsUnsubRef.current = unsub;
  }

  function stopSignalsListener() {
    if (signalsUnsubRef.current) {
      signalsUnsubRef.current();
      signalsUnsubRef.current = null;
    }
  }

  function startParticipantsListener() {
    if (!debateId) return;

    // unsubscribe previous
    stopParticipantsListener();

    const col = collection(db, "debates", debateId, "participants");
    const q = query(col, orderBy("joinedAt", "asc"));
    const unsub = onSnapshot(q, async (snap) => {
      // list of participant uids
      const uids = snap.docs.map((d) => (d.data() as any).uid).filter(Boolean) as string[];

      // ensure we have peers for others and remove peers for those who left
      const localUid = auth.currentUser?.uid;
      if (!localUid) return;

      // create peers to all other uids
      for (const remoteUid of uids) {
        if (remoteUid === localUid) continue;
        if (!pcsRef.current.has(remoteUid)) {
          // use lexicographic ordering to decide who creates offer to avoid collisions
          const shouldCreateOffer = localUid < remoteUid;
          await createPeerFor(remoteUid, shouldCreateOffer);
        }
      }

      // remove peers that are no longer present
      const existing = Array.from(pcsRef.current.keys());
      for (const existingUid of existing) {
        if (!uids.includes(existingUid)) {
          // remote left
          closePeer(existingUid);
        }
      }
    });

    participantsUnsubRef.current = unsub;
  }

  function stopParticipantsListener() {
    if (participantsUnsubRef.current) {
      participantsUnsubRef.current();
      participantsUnsubRef.current = null;
    }
  }

  async function createPeerFor(remoteUid: string, makeOffer: boolean) {
    const localUid = auth.currentUser?.uid;
    if (!localUid || !debateId) return;

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // add local tracks
    if (localStream) {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    }

    // ontrack -> remote stream
    const remoteStream = new MediaStream();
    pc.ontrack = (ev) => {
      ev.streams?.forEach((s) => {
        s.getTracks().forEach((t) => remoteStream.addTrack(t));
      });
      // add or replace
      setRemoteStreams((rs) => {
        const exists = rs.find((r) => r.uid === remoteUid);
        if (exists) {
          // replace stream
          return rs.map((r) => (r.uid === remoteUid ? { uid: remoteUid, stream: remoteStream } : r));
        }
        return [...rs, { uid: remoteUid, stream: remoteStream }];
      });
    };

    // ice candidates -> send to remote via firestore
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      const candidatePayload = ev.candidate.toJSON();
      addDoc(collection(db, "debates", debateId, "webrtc_signals"), {
        from: localUid,
        to: remoteUid,
        type: "candidate",
        candidate: candidatePayload,
        createdAt: serverTimestamp(),
      }).catch((err) => console.warn("send candidate err", err));
    };

    pcsRef.current.set(remoteUid, pc);

    // if makeOffer, create offer and send
    if (makeOffer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await addDoc(collection(db, "debates", debateId, "webrtc_signals"), {
          from: localUid,
          to: remoteUid,
          type: "offer",
          sdp: pc.localDescription,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("createOffer err:", err);
      }
    }
  }

  async function handleSignal(data: SignalDoc) {
    const localUid = auth.currentUser?.uid;
    if (!localUid || !debateId) return;
    const remoteUid = data.from;

    // Ensure pc exists
    if (!pcsRef.current.has(remoteUid)) {
      // if no pc created yet, create one but DO NOT create offer (remote is offerer)
      await createPeerFor(remoteUid, false);
    }
    const pc = pcsRef.current.get(remoteUid)!;

    if (data.type === "offer" && data.sdp) {
      // set remote desc and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await addDoc(collection(db, "debates", debateId, "webrtc_signals"), {
        from: localUid,
        to: remoteUid,
        type: "answer",
        sdp: pc.localDescription,
        createdAt: serverTimestamp(),
      });
      return;
    }

    if (data.type === "answer" && data.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      return;
    }

    if (data.type === "candidate" && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn("addIceCandidate failed", err);
      }
      return;
    }
  }

  function closePeer(remoteUid: string) {
    const pc = pcsRef.current.get(remoteUid);
    if (pc) {
      try {
        pc.getSenders().forEach((s) => {
          try {
            pc.removeTrack(s);
          } catch {}
        });
      } catch {}
      try {
        pc.close();
      } catch {}
      pcsRef.current.delete(remoteUid);
    }
    setRemoteStreams((rs) => rs.filter((r) => r.uid !== remoteUid));
  }

  function cleanupPeers() {
    const keys = Array.from(pcsRef.current.keys());
    keys.forEach((k) => closePeer(k));
    pcsRef.current.clear();
    setRemoteStreams([]);
  }

  // ----------------------
  // Local media (camera + mic)
  // ----------------------
  async function startLocalMedia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("getUserMedia not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        try {
          await localVideoRef.current.play();
        } catch {}
      }
    } catch (err) {
      console.error("getUserMedia error", err);
      alert("Could not access camera/microphone. Please allow permissions.");
    }
  }

  function stopLocalMedia() {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = null;
        } catch {}
      }
    }
  }

  // ----------------------
  // Captions (SpeechRecognition)
  // ----------------------
  function startCaptions() {
    if (captionsRunning) return;
    const SpeechRecognition =
      (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
      (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) ||
      null;

    if (!SpeechRecognition) {
      alert("SpeechRecognition API not supported in this browser.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Sign in to enable captions.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-IN"; // Indian English
      rec.continuous = true;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = async (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            if (!transcript) continue;

            // show locally immediately
            setCaptions((c) => [...c, { uid: user.uid, text: transcript }]);

            // store in firestore
            try {
              await addDoc(collection(db, "debates", debateId!, "captions"), {
                uid: user.uid,
                text: transcript,
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              console.error("Failed to store caption:", err);
            }
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("SpeechRecognition error:", e);
      };

      rec.onend = () => {
        // if user didn't stop intentionally, try to restart
        if (recognitionRef.current && recognitionRef.current._shouldRestart) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      (rec as any)._shouldRestart = true;
      recognitionRef.current = rec;
      rec.start();
      setCaptionsRunning(true);
    } catch (err) {
      console.error("startCaptions failed", err);
      alert("Could not start captions. Check microphone permission and browser support.");
    }
  }

  function stopCaptions() {
    const rec = recognitionRef.current;
    if (rec) {
      (rec as any)._shouldRestart = false;
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setCaptionsRunning(false);
  }

  // ----------------------
  // Chat: save history (unchanged behaviour)
  // ----------------------
  useEffect(() => {
    if (!debateId || !debate) return;
    const debateType = debate.settings?.debateType || "chat";
    if (debateType !== "chat") return;
    if (debate.status !== "live") return;
    if (!messages || messages.length === 0) return;

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(async () => {
      try {
        const chatDocRef = doc(db, "debates", debateId, "meta", "chatHistory");
        await setDoc(
          chatDocRef,
          {
            history: messages.map((m) => ({
              id: m.id,
              uid: m.uid,
              text: m.text,
              createdAt: m.createdAt ?? serverTimestamp(),
            })),
            savedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        console.error("Failed to save chat history:", err);
      }
    }, 2000);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [messages, debate, debateId]);

  // send chat message
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!debateId || !text.trim()) return;
    const user = auth.currentUser;
    if (!user) {
      alert("Sign in first");
      return;
    }
    try {
      await addDoc(collection(db, "debates", debateId, "messages"), {
        uid: user.uid,
        text,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  // cleanup helpers on unmount
  useEffect(() => {
    return () => {
      stopCaptions();
      stopLocalMedia();
      stopSignalsListener();
      stopParticipantsListener();
      cleanupPeers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------
  // UI
  // ----------------------
  if (!debate) return <div>Loading debate...</div>;

  const debateType = debate.settings?.debateType || "chat";
  const rounds = debate.settings?.rounds ?? null;
  const timeLimitSeconds = debate.settings?.timeLimitSeconds ?? null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>
        {debate.title} {debate.status === "live" ? "(Live)" : `(${debate.status})`}
      </h2>
      <p style={{ marginBottom: 12 }}>{debate.topic}</p>

      <div style={{ marginBottom: 12 }}>
        <strong>Type:</strong> {debateType} &nbsp;{" "}
        {rounds !== null && <span>• Rounds: {rounds}</span>}{" "}
        {timeLimitSeconds !== null && <span>• Time limit: {timeLimitSeconds}s</span>}
      </div>

      {/* VIDEO: local + remote */}
      {debateType === "video" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ minWidth: 280 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Your camera</div>
              <video
                ref={localVideoRef}
                style={{ width: 280, height: 210, background: "#000" }}
                autoPlay
                playsInline
                muted
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {!localStream ? (
                  <button onClick={() => startLocalMedia()}>Start Camera</button>
                ) : (
                  <button onClick={() => stopLocalMedia()}>Stop Camera</button>
                )}
                {!captionsRunning ? (
                  <button onClick={() => startCaptions()}>Start Captions (en-IN)</button>
                ) : (
                  <button onClick={() => stopCaptions()}>Stop Captions</button>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Participants' cameras</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                {remoteStreams.length === 0 ? (
                  <div style={{ color: "#666" }}>No remote streams yet.</div>
                ) : (
                  remoteStreams.map((r) => <RemoteVideo key={r.uid} uid={r.uid} stream={r.stream} />)
                )}
              </div>
            </div>
          </div>

          {/* captions viewer */}
          <div style={{ border: "1px solid #ddd", padding: 12, marginTop: 12 }}>
            <h4 style={{ marginTop: 0 }}>Live Captions</h4>
            <div style={{ maxHeight: 180, overflow: "auto" }}>
              {captions.length === 0 ? (
                <div style={{ color: "#999" }}>No captions yet.</div>
              ) : (
                captions.map((c, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <small style={{ color: "#888" }}>{c.uid ? c.uid.slice(0, 6) : "user"}:</small>{" "}
                    <span>{c.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 12 }}>
        <div style={{ maxHeight: 320, overflow: "auto", marginBottom: 8 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 6 }}>
              <strong>{m.uid.slice(0, 6)}:</strong> {m.text}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say something..."
            style={{ padding: 8, flex: 1 }}
            disabled={debate.status !== "live"}
          />
          <button type="submit" disabled={debate.status !== "live"}>
            Send
          </button>
        </form>
      </div>

      {debateType === "chat" && (
        <div style={{ fontSize: 13, color: "#666" }}>
          Chat history auto-saves to <code>debates/{debateId}/meta/chatHistory</code>{" "}
          {lastSavedAt && <span>• last saved: {lastSavedAt}</span>}
        </div>
      )}

      {debateType === "video" && (
        <div style={{ fontSize: 13, color: "#666" }}>
          Live captions are saved to <code>debates/{debateId}/captions</code> (one doc per caption).
        </div>
      )}
    </div>
  );
}

/** RemoteVideo component ensures video element gets assigned stream to srcObject */
function RemoteVideo({ uid, stream }: { uid: string; stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        ref.current.srcObject = stream;
        ref.current.play().catch(() => {});
      } catch {}
    }
  }, [stream]);
  return (
    <div style={{ border: "1px solid #ccc", padding: 8 }}>
      <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>{uid}</div>
      <video ref={ref} style={{ width: "100%", height: 160, background: "#000" }} autoPlay playsInline />
    </div>
  );
}
