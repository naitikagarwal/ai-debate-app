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
} from "firebase/firestore";
import { auth, db } from "@/backend/firebase"; 

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Timer, Layers } from "lucide-react";
import { useParams } from "next/navigation";

type Debate = {
  title?: string;
  topic?: string;
  status?: string;
  startedAt?: any; // Firestore timestamp
  settings?: {
    debateType?: "chat";
    rounds?: number;
    timeLimitSeconds?: number;
  };
};

type Message = {
  id: string;
  uid: string;
  displayName?: string;
  text: string;
  createdAt: any;
};

export default function DebateLive() {
  const params = useParams();
  const debateId = Array.isArray(params?.debateId) ? params.debateId[0] : params?.debateId;


  const [debate, setDebate] = useState<Debate | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const saveTimer = useRef<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);

  // sentinel ref for auto-scroll
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ----------------------
  // Firestore listeners
  // ----------------------
  useEffect(() => {
    if (!debateId) return; // Now depends on state variable

    const dRef = doc(db, "debates", debateId);
    const unsubD = onSnapshot(dRef, (snap) => {
      if (snap.exists()) setDebate(snap.data() as Debate);
      else setDebate(null);
    });

    const mRef = collection(db, "debates", debateId, "messages");
    const q = query(mRef, orderBy("createdAt", "asc"));
    const unsubM = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Message[];
      setMessages(docs);
    });

    return () => {
      unsubD();
      unsubM();
    };
  }, [debateId]); // Runs when debateId is found

  // ----------------------
  // Timer based on startedAt
  // ----------------------
  useEffect(() => {
    if (!debate || !debate.settings?.timeLimitSeconds || !debate.startedAt || debate.status !== "live") {
      setTimeLeft(null);
      return;
    }

    const roundTime = debate.settings.timeLimitSeconds;
    const totalRounds = debate.settings.rounds ?? 1;

    const tick = () => {
      // handle Firestore timestamp objects or ISO/date string
      const startedAtMs =
        typeof debate.startedAt?.toDate === "function"
          ? debate.startedAt.toDate().getTime()
          : new Date(debate.startedAt).getTime();

      const elapsedSec = Math.floor((Date.now() - startedAtMs) / 1000);
      const roundNumber = Math.min(Math.floor(elapsedSec / roundTime) + 1, totalRounds);
      const timeInCurrentRound = elapsedSec % roundTime;
      const left = Math.max(roundTime - timeInCurrentRound, 0);

      setCurrentRound(roundNumber);
      setTimeLeft(left);

      // If elapsed covers all rounds, optionally mark debate ended (once)
      if (elapsedSec >= roundTime * totalRounds) {
        // End debate if still live
        const dRef = doc(db, "debates", debateId!);
        setTimeout(async () => {
          try {
            // Update only if still live (to avoid spamming writes)
            if (debate?.status === "live") {
              await setDoc(dRef, { status: "ended" }, { merge: true });
            }
          } catch (e) {
            console.error("Failed to set debate ended:", e);
          }
        }, 0);
      }
    };

    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [debate, debateId]);

  useEffect(() => {
    if (!debateId || !debate) return;
    const debateType = debate.settings?.debateType || "chat";
    if (debateType !== "chat") return;
    if (debate.status !== "live") return;
    if (!messages || messages.length === 0) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const chatDocRef = doc(db, "debates", debateId, "meta", "chatHistory");
        await setDoc(
          chatDocRef,
          {
            history: messages.map((m) => ({
              id: m.id,
              uid: m.uid,
              displayName: m.displayName,
              text: m.text,
              createdAt: m.createdAt ?? serverTimestamp(),
            })),
            savedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setLastSavedAt(new Date().toLocaleString("en-IN"));
      } catch (err) {
        console.error("Failed to save chat history:", err);
      }
    }, 2000);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [messages, debate, debateId]);

  // ----------------------
  // Send chat message
  // ----------------------
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
        displayName: user.displayName || user.email || user.uid,
        text,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  // ----------------------
  // Auto-scroll: scroll sentinel into view whenever messages change
  // ----------------------
  useEffect(() => {
    if (!bottomRef.current) return;
    // ensure DOM updated, then scroll
    requestAnimationFrame(() => {
      try {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch (e) {
        // fallback: set scrollTop on nearest scrollable ancestor
        let el: HTMLElement | null = bottomRef.current;
        while (el) {
          if (el.scrollHeight > el.clientHeight) {
            el.scrollTop = el.scrollHeight;
            break;
          }
          el = el.parentElement;
        }
      }
    });
  }, [messages]);

  // --- ADDED: Redirect when debate ends ---
  useEffect(() => {
    if (debate?.status === "ended" && debateId) {
      // Redirect to the result page, passing the debateId as a query param
      // This matches the logic in DebateResultPage.tsx
      // Assumes your result page is at the route `/debate/result`
      window.location.href = `/debate/${debateId}/result`;
    }
  }, [debate?.status, debateId]);
  // --- END OF ADDITION ---

  if (!debateId) {
    return <div>Loading debate ID... Make sure it's in the URL (e.g., ?debateId=123)</div>;
  }
  
  if (!debate) return <div>Loading debate data...</div>;

  const debateType = debate.settings?.debateType || "chat";
  const totalRounds = debate.settings?.rounds ?? 1;
  const chatDisabled = debate.status !== "live" || (currentRound > totalRounds && debate.status !== "live");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{debate.title}</h2>
          <Badge
            variant={debate.status === "live" ? "default" : "secondary"}
            className="capitalize"
          >
            {debate.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">{debate.topic}</p>
      </div>

      {/* Debate Info */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" /> Type:{" "}
          <span className="font-medium text-foreground">{debateType}</span>
        </div>
        {totalRounds && (
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" /> Round:{" "}
            <Badge variant="secondary">
              {currentRound > totalRounds ? totalRounds : currentRound} / {totalRounds}
            </Badge>
          </div>
        )}
        {timeLeft !== null && (
          <div className="flex items-center gap-1">
            <Timer className="w-4 h-4" /> Time left:{" "}
            <span className={`font-medium ${timeLeft <= 10 ? "text-red-500" : "text-foreground"}`}>
              {timeLeft}s
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Chat Card */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Debate Chat
          </h3>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-80 pr-3">
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold text-foreground/90">{m.displayName}:</span>{" "}
                  <span className="text-muted-foreground">{m.text}</span>
                </div>
              ))}

              {/* sentinel element to scroll into view */}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter>
          {chatDisabled && <p className="text-sm text-red-500 font-medium">Debate is over. Chat disabled.</p>}
          <form onSubmit={sendMessage} className="flex w-full items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={chatDisabled ? "Debate over..." : "Say something..."}
              disabled={chatDisabled}
            />
            <Button type="submit" disabled={chatDisabled} className="flex items-center gap-1">
              <Send className="w-4 h-4" /> Send
            </Button>
          </form>
        </CardFooter>
      </Card>

      <p className="text-sm text-muted-foreground">
        {lastSavedAt && <span>• last saved: {lastSavedAt}</span>}
      </p>
    </div>
  );
}

