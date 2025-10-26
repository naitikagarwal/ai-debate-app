"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/backend/firebase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Loader2 } from "lucide-react";

export default function CreateDebate() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("individual");
  const [rounds, setRounds] = useState(2);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(180);
  const [creating, setCreating] = useState(false);

  const router = useRouter();

  async function handleCreate(e:any) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("You must be signed in to create a debate.");

    setCreating(true);

    try {
      const res = await fetch("/api/debates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          mode,
          settings: { rounds, timeLimitSeconds },
          uid: user.uid,
          displayName: user.displayName || user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      router.push(`/debate/${data.debateId}/lobby`);
    } catch (err:any) {
      alert(`Failed to create debate: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8f9fc] to-white flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800 text-center">
            Create a Debate
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            Start a new debate and share your unique link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>Debate Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title..."
              />
            </div>

            <div className="space-y-2">
              <Label>Debate Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's the question?"
              />
            </div>

            <div className="space-y-2">
              <Label>Debate Mode</Label>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v)}
                className="grid grid-cols-2 gap-2"
              >
                <ToggleGroupItem
                  value="individual"
                  className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white"
                >
                  Individual
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="team"
                  className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white"
                >
                  Team
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rounds</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time Limit (seconds)</Label>
                <Input
                  type="number"
                  min={30}
                  max={1800}
                  value={timeLimitSeconds}
                  onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={creating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {creating ? <Loader2 className="animate-spin" /> : "Create & Get Link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}