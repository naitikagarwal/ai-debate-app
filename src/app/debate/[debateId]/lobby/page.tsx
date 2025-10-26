"use client";

import React, { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  DocumentData,
  QuerySnapshot,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "@/backend/firebase";
import { User } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Users, Video, Star, Info, Play, Wallet } from "lucide-react";

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
  team?: "A" | "B";
};

export default function DebateLobby() {
  const params = useParams();
  const debateId = Array.isArray(params?.debateId)
    ? params.debateId[0]
    : params?.debateId;

  const router = useRouter();

  const [debate, setDebate] = useState<Debate | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [joining, setJoining] = useState(false);

  const [teams, setTeams] = useState<Record<string, any> | null>(null);
  const [teamA, setTeamA] = useState<Participant[]>([]);
  const [teamB, setTeamB] = useState<Participant[]>([]);

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

    const partCol = collection(db, "debates", debateId, "participants");
    const q = query(partCol, orderBy("joinedAt", "asc"));
    const unsubP = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const docs = snap.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          uid: raw.uid,
          displayName: raw.displayName ?? "Anonymous",
          joinedAt: raw.joinedAt,
          role: raw.role,
          team: raw.team,
        } as Participant;
      });
      setParticipants(docs);
    });

    const teamsCol = collection(db, "debates", debateId, "teams");
    const unsubT = onSnapshot(teamsCol, (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setTeams(map);
    });

    return () => {
      unsubD();
      unsubP();
      unsubT();
    };
  }, [debateId]);

  useEffect(() => {
    const partByUid = new Map<string, Participant>();
    participants.forEach((p) => partByUid.set(p.uid, p));

    const a: Participant[] = [];
    const b: Participant[] = [];

    participants.forEach((p) => {
      if (p.team === "A") a.push(p);
      else if (p.team === "B") b.push(p);
    });

    const teamAMembers: string[] = teams?.["A"]?.members || [];
    const teamBMembers: string[] = teams?.["B"]?.members || [];

    teamAMembers.forEach((uid) => {
      const p = partByUid.get(uid);
      if (p && !a.some((x) => x.uid === uid)) a.push(p);
      else if (!p) a.push({ id: uid, uid, displayName: "Anonymous" });
    });

    teamBMembers.forEach((uid) => {
      const p = partByUid.get(uid);
      if (p && !b.some((x) => x.uid === uid)) b.push(p);
      else if (!p) b.push({ id: uid, uid, displayName: "Anonymous" });
    });

    setTeamA(Array.from(new Map(a.map((p) => [p.uid, p])).values()));
    setTeamB(Array.from(new Map(b.map((p) => [p.uid, p])).values()));
  }, [participants, teams]);

  useEffect(() => {
    if (!debateId || !debate) return;
    if (debate.status === "live") {
      router.replace(`/debate/${debateId}/live`);
    }
  }, [debateId, debate, router]);

  const canStart =
    debate?.mode === "individual"
      ? participants.length > 1
      : teamA.length > 0 && teamB.length > 0;

  const isParticipant =
    auth.currentUser &&
    participants.some((p) => p.uid === auth.currentUser!.uid);

  function canJoinTeam(team: "A" | "B") {
    if (team === "A") {
      return teamB.length > 0 || (teamA.length === 0 && teamB.length === 0);
    }
    if (team === "B") {
      return teamA.length > 0 || (teamA.length === 0 && teamB.length === 0);
    }
    return false;
  }

  async function handleJoin(selectedTeam?: "A" | "B") {
    if (!debateId || !debate) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to join.");
      return;
    }

    if (participants.some((p) => p.uid === user.uid)) {
      alert("You are already in this debate lobby.");
      return;
    }

    let team: "A" | "B" | undefined = undefined;
    if (debate?.mode === "team") {
      if (!selectedTeam) {
        alert("Please select a team.");
        return;
      }
      team = selectedTeam;
    } else {
      if (teamA.length > 0) team = "B";
      else team = "A";
    }

    setJoining(true);
    try {
      await setDoc(doc(db, "debates", debateId, "participants", user.uid), {
        uid: user.uid,
        displayName: user.displayName || user.email || "Anonymous",
        joinedAt: serverTimestamp(),
        role: "participant",
        ...(team ? { team } : {}),
      });

      if (team) {
        const teamDoc = doc(db, "debates", debateId, "teams", team);
        await updateDoc(teamDoc, {
          members: arrayUnion(user.uid),
        }).catch(async (err) => {
          if (err.code === "not-found") {
            await setDoc(
              teamDoc,
              { name: team, members: [user.uid], createdAt: serverTimestamp() },
              { merge: true }
            );
          } else {
            throw err;
          }
        });
      }
    } catch (err: any) {
      console.error("[HandleJoin] error:", err);
      alert(`Failed to join debate: ${err.message}`);
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    if (!debateId) return;
    const user = auth.currentUser;
    if (!user) return;

    if (debate?.createdBy !== user.uid) {
      alert("Only host can start the debate.");
      return;
    }

    await updateDoc(doc(db, "debates", debateId), {
      status: "live",
      startedAt: serverTimestamp(),
    });
  }

  if (!debateId) return <div>Invalid debate ID</div>;
  if (!debate) return <div>Loading...</div>;

  const isLoading = joining;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <Card className="border shadow-md">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {debate.mode === "team" ? "Team Debate" : "Individual Debate"}
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Waiting to Start
                </Badge>
              </div>
              <CardTitle className="text-3xl">
                {debate.title || "Untitled Debate"}
              </CardTitle>
              <p className="text-muted-foreground">{debate.topic}</p>
            </div>
            <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-purple-100">
              <Video className="w-10 h-10 text-purple-600" />
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participants */}
          <Card className="lg:col-span-2 border shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-500" />
                  <CardTitle>Participants</CardTitle>
                  <Badge variant="outline">{participants.length}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {debate.mode === "team" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team A */}
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-emerald-600 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      Team A ({teamA.length})
                    </h4>
                    <div className="space-y-2">
                      {teamA.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-md border p-2 hover:bg-gray-50 transition"
                        >
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-200 text-emerald-800 font-bold">
                            {p.displayName?.charAt(0) ?? "A"}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{p.displayName}</p>
                            {p.role === "host" && (
                              <span className="text-xs text-muted-foreground">
                                Host
                              </span>
                            )}
                          </div>
                          {p.role === "host" && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-rose-600 flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                      Team B ({teamB.length})
                    </h4>
                    <div className="space-y-2">
                      {teamB.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-md border p-2 hover:bg-gray-50 transition"
                        >
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-200 text-rose-800 font-bold">
                            {p.displayName?.charAt(0) ?? "B"}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{p.displayName}</p>
                            {p.role === "host" && (
                              <span className="text-xs text-muted-foreground">
                                Host
                              </span>
                            )}
                          </div>
                          {p.role === "host" && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-md border p-3 hover:bg-gray-50 transition"
                    >
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-200 text-purple-800 font-bold">
                        {p.displayName?.charAt(0) ?? "U"}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.displayName}</p>
                        {p.role === "host" && (
                          <span className="text-xs text-muted-foreground">
                            Host
                          </span>
                        )}
                      </div>
                      {p.role === "host" && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-4">
            {/* Join Button */}
            {!isParticipant && (
              <Card className="border shadow-md">
                <CardContent className="p-6 space-y-4">
                  <h4 className="font-semibold text-center">Join the Debate</h4>
                  {debate.mode === "team" ? (
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => handleJoin("A")}
                        disabled={isLoading} 
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isLoading ? "Joining..." : "Join Team A"}
                      </Button>
                      <Button
                        onClick={() => handleJoin("B")}
                        disabled={isLoading || !canJoinTeam("B")}
                        className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
                      >
                        {isLoading ? "Joining..." : "Join Team B"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleJoin()}
                      disabled={isLoading} 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? "Joining..." : "Join Debate"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Start Button for Host */}
            {isHost && debate.status === "waiting" && (
              <Card className="border shadow-md">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-center mb-3">
                    Ready to Begin?
                  </h4>
                  <Button
                    onClick={handleStart}
                    disabled={!canStart}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Debate
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Room Info */}
            <Card className="border shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-base">Room Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-semibold">{debate.status}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Mode</span>
                    <span className="font-semibold capitalize">{debate.mode}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Participants</span>
                    <span className="font-semibold">{participants.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
