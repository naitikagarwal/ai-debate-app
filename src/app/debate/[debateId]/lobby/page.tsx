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

  // teams state derived from teams subcollection
  const [teams, setTeams] = useState<Record<string, any> | null>(null);

  // final team arrays shown in UI (computed)
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

    // participants listener
    const partCol = collection(db, "debates", debateId, "participants");
    const q = query(partCol, orderBy("joinedAt", "asc"));
    const unsubP = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
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
      }
    );

    // teams listener
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

  // merge participants + teams.members into teamA/teamB arrays
  useEffect(() => {
    // map participants by uid
    const partByUid = new Map<string, Participant>();
    participants.forEach((p) => partByUid.set(p.uid, p));

    const a: Participant[] = [];
    const b: Participant[] = [];

    // 1) include participants who have team field set
    participants.forEach((p) => {
      if (p.team === "A") a.push(p);
      else if (p.team === "B") b.push(p);
    });

    // 2) include uids from teams collection (covers host already in teams/A.members)
    const teamAMembers: string[] = teams?.["A"]?.members || [];
    const teamBMembers: string[] = teams?.["B"]?.members || [];

    teamAMembers.forEach((uid) => {
      const p = partByUid.get(uid);
      if (p) {
        // if participant exists but missing team field, ensure included
        if (!a.some((x) => x.uid === uid)) a.push(p);
      } else {
        // participant doc missing — create placeholder so they appear in UI
        a.push({
          id: uid,
          uid,
          displayName: "Anonymous",
        } as Participant);
      }
    });

    teamBMembers.forEach((uid) => {
      const p = partByUid.get(uid);
      if (p) {
        if (!b.some((x) => x.uid === uid)) b.push(p);
      } else {
        b.push({
          id: uid,
          uid,
          displayName: "Anonymous",
        } as Participant);
      }
    });

    // dedupe by uid, keep order first-seen
    const uniqueA = Array.from(new Map(a.map((p) => [p.uid, p])).values());
    const uniqueB = Array.from(new Map(b.map((p) => [p.uid, p])).values());

    setTeamA(uniqueA);
    setTeamB(uniqueB);
  }, [participants, teams]);

  // redirect to live page when status = live
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
    if (!debateId) return;
    const user = auth.currentUser;
    if (!user) {
      alert("Sign in first");
      return;
    }

    if (participants.some((p) => p.uid === user.uid)) {
      alert("You are already in this debate lobby.");
      return;
    }

    setJoining(true);
    try {
      let team: "A" | "B" | undefined = undefined;
      if (debate?.mode === "team") {
        if (!selectedTeam) {
          alert("Please select a team.");
          setJoining(false);
          return;
        }
        team = selectedTeam;
      }

      // 1) Add/update participant doc with team field (so future reads have team)
      await setDoc(
        doc(db, "debates", debateId, "participants", user.uid),
        {
          uid: user.uid,
          displayName: user.displayName || user.email || "Anonymous",
          joinedAt: serverTimestamp(),
          role: "participant",
          ...(team ? { team } : {}),
        }
      );

      // 2) Update teams collection (members array)
      if (team) {
        const teamDoc = doc(db, "debates", debateId, "teams", team);
        await updateDoc(teamDoc, {
          members: arrayUnion(user.uid),
        }).catch(async () => {
          // create if not exists
          await setDoc(teamDoc, { name: team, members: [user.uid], createdAt: serverTimestamp() }, { merge: true });
        });
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Animated background elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                  {debate.mode === "team" ? "Team Debate" : "Individual Debate"}
                </div>
                <div className="px-4 py-1 bg-yellow-400/90 rounded-full text-yellow-900 text-sm font-bold flex items-center">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2 animate-pulse"></span>
                  Waiting to Start
                </div>
              </div>
              <h2 className="text-4xl font-bold text-white mb-3">
                {debate.title || "Untitled Debate"}
              </h2>
              <p className="text-purple-100 text-lg leading-relaxed">
                {debate.topic}
              </p>
            </div>
            <div className="ml-6">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participants Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white">Participants</h3>
                  <span className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-200 text-sm font-semibold">
                    {participants.length}
                  </span>
                </div>
              </div>

              {debate.mode === "team" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team A */}
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                      <h4 className="text-lg font-bold text-emerald-300">Team A</h4>
                      <span className="text-emerald-400 text-sm">({teamA.length})</span>
                    </div>
                    <div className="space-y-2">
                      {teamA.map((p) => (
                        <div key={p.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-3 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                            {p.displayName?.charAt(0) ?? "A"}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{p.displayName}</p>
                            {p.role === "host" && (
                              <span className="text-xs text-emerald-300">Host</span>
                            )}
                          </div>
                          {p.role === "host" && (
                            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
                      <h4 className="text-lg font-bold text-rose-300">Team B</h4>
                      <span className="text-rose-400 text-sm">({teamB.length})</span>
                    </div>
                    <div className="space-y-2">
                      {teamB.map((p) => (
                        <div key={p.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-3 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center text-white font-bold">
                            {p.displayName?.charAt(0) ?? "B"}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{p.displayName}</p>
                            {p.role === "host" && (
                              <span className="text-xs text-rose-300">Host</span>
                            )}
                          </div>
                          {p.role === "host" && (
                            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((p) => (
                    <div key={p.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-4 hover:bg-white/10 transition-all">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {p.displayName?.charAt(0) ?? "U"}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{p.displayName}</p>
                        {p.role === "host" && (
                          <span className="text-sm text-purple-300">Host</span>
                        )}
                      </div>
                      {p.role === "host" && (
                        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-4">
            {/* Join Button */}
            {!isParticipant && (
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-xl">
                <div className="text-center mb-4">
                  <svg className="w-16 h-16 text-purple-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <h4 className="text-white font-bold text-lg mb-2">Join the Debate</h4>
                  <p className="text-purple-200 text-sm">Be part of this discussion</p>
                </div>
                {debate.mode === "team" ? (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleJoin("A")}
                      className={`w-full py-3 rounded-2xl font-bold shadow-lg transition-all bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800}`}
                    >
                      Join Team A
                    </button>
                    <button
                      onClick={() => handleJoin("B")}
                      disabled={joining || !canJoinTeam("B")}
                      className={`w-full py-3 rounded-2xl font-bold shadow-lg transition-all ${
                        canJoinTeam("B")
                          ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800"
                          : "bg-rose-900/30 text-rose-200 cursor-not-allowed"
                      }`}
                    >
                      Join Team B
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoin()}
                    disabled={joining}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-400 disabled:to-indigo-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {joining ? "Joining..." : "Join Debate"}
                  </button>
                )}
              </div>
            )}

            {/* Start Button for Host */}
            {isHost && debate.status === "waiting" && (
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 backdrop-blur-xl rounded-3xl p-6 border-2 border-emerald-500/30 shadow-xl">
                <div className="text-center mb-4">
                  <svg className="w-16 h-16 text-emerald-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-white font-bold text-lg mb-2">Ready to Begin?</h4>
                  <p className="text-emerald-200 text-sm">Start the debate as host</p>
                </div>
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all transform ${
                    canStart
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white hover:shadow-emerald-500/50 hover:scale-105"
                      : "bg-emerald-900/30 text-emerald-200 cursor-not-allowed"
                  }`}
                >
                  Start Debate
                </button>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <h4 className="text-white font-bold mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Room Info
              </h4>
              <div className="space-y-2 text-sm text-purple-200">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span>Status</span>
                  <span className="text-white font-semibold">Waiting</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span>Mode</span>
                  <span className="text-white font-semibold capitalize">{debate.mode}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Participants</span>
                  <span className="text-white font-semibold">{participants.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
