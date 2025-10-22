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
import { useParams } from "next/navigation";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Timer, Layers } from "lucide-react";

type Debate = {
  title?: string;
  topic?: string;
  status?: string;
  settings?: {
    debateType?: "chat";
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

export default function DebateLive() {
  const params = useParams();
  const debateId = Array.isArray(params?.debateId)
    ? params.debateId[0]
    : params?.debateId;

  const [debate, setDebate] = useState<Debate | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const saveTimer = useRef<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

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
  }, [debateId]);

  // ----------------------
  // Auto-save chat history
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
        setLastSavedAt(
          new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date())
        );

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
  // UI
  // ----------------------
  if (!debate) return <div>Loading debate...</div>;

  const debateType = debate.settings?.debateType || "chat";
  const rounds = debate.settings?.rounds ?? null;
  const timeLimitSeconds = debate.settings?.timeLimitSeconds ?? null;

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
        {rounds !== null && (
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" /> Rounds:{" "}
            <span className="font-medium text-foreground">{rounds}</span>
          </div>
        )}
        {timeLimitSeconds !== null && (
          <div className="flex items-center gap-1">
            <Timer className="w-4 h-4" /> Time limit:{" "}
            <span className="font-medium text-foreground">
              {timeLimitSeconds}s
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
              {messages.map((m: any) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold text-foreground/90">
                    {m.displayName}:
                  </span>{" "}
                  <span className="text-muted-foreground">{m.text}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter>
          <form
            onSubmit={sendMessage}
            className="flex w-full items-center gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something..."
              disabled={debate.status !== "live"}
            />
            <Button
              type="submit"
              disabled={debate.status !== "live"}
              className="flex items-center gap-1"
            >
              <Send className="w-4 h-4" /> Send
            </Button>
          </form>
        </CardFooter>
      </Card>

      {/* Footer Info */}
      <p className="text-sm text-muted-foreground">
        
        {lastSavedAt && <span>• last saved: {lastSavedAt}</span>}
      </p>
    </div>
  );
}