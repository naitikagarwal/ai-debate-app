"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/backend/firebase";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "@/utils/constants";
import { keccak256, toUtf8Bytes } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, User2, BarChart2 } from "lucide-react";

interface AiResult {
  answer: string;
}

interface ParsedAiAnswer {
  user1: {name:string; score: string; reason: string };
  user2: {name:string; score: string; reason: string };
  winnerId: string;
  winnerReason: string;
}
function ScoreBar({ score, maxScore, label }: { score: number; maxScore: number; label: string }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold">{Number.isFinite(score) ? score : "-"}</span>
      </div>

      <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transform transition-all duration-800 ease-out"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4f46e5, #06b6d4)" }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}
async function storeOnBlockchain(debateId: number, answer: string) {
  if (typeof window === "undefined" || !window.ethereum) {
    console.warn("MetaMask not found!");
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  // Generate a hash of the result
  const hashValue = keccak256(toUtf8Bytes(answer));

  try {
    const tx = await contract.storeResult(Number(debateId), hashValue);
    await tx.wait();
    console.log("✅ Result stored on blockchain:", hashValue);
  } catch (err) {
    console.error("❌ Blockchain store failed:", err);
  }
}

function parseAiResultText(text: string): ParsedAiAnswer {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const user1 = { name: "", score: "", reason: "" };
  const user2 = { name: "", score: "", reason: "" };
  let winnerId = "";
  let winnerReason = "";

  let current = ""; // "user1" | "user2" | "winner"

  for (const line of lines) {

    // SCORE LINES
    if (line.startsWith("score to")) {
      const match = line.match(/^score to (.+?) : (.+)$/);
      if (match) {
        const name = match[1].trim();
        const score = match[2].trim();

        if (!user1.name) {
          user1.name = name;
          user1.score = score;
          current = "user1";
        } else {
          user2.name = name;
          user2.score = score;
          current = "user2";
        }
      }
    }

    // WINNER LINE
    else if (line.startsWith("winner :")) {
      const match = line.match(/^winner : (.+)$/);
      if (match) {
        winnerId = match[1].trim();
        current = "winner";
      }
    }

    // REASON LINES
    else if (line.startsWith("reason :")) {
      const reasonText = line.replace("reason :", "").trim();

      if (current === "user1") {
        user1.reason = reasonText;
      } else if (current === "user2") {
        user2.reason = reasonText;
      } else if (current === "winner") {
        winnerReason = reasonText;
      }
    }
  }

  return { user1, user2, winnerId, winnerReason };
}

export default function DebateResult() {
  const [aiResult, setAiResult] = useState<ParsedAiAnswer | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const params = useParams();
  const debateId = params?.debateId as number | undefined;

  // --- Fetch AI Judged Result ---
  useEffect(() => {
    if (!debateId) return;

    const fetchAiResult = async () => {
      setIsLoadingApi(true);
      setApiError(null);
      try {
        console.log("🔍 Checking Firebase cache for debate:", debateId);
        const resultRef = doc(db, "results", String(debateId));
        const existing = await getDoc(resultRef);

        if (existing.exists()) {
          console.log("✅ Using cached AI result from Firebase");
          const data = existing.data();
          const parsedAnswer = parseAiResultText(data.answer);
          setAiResult(parsedAnswer);
          return;
        }

        // 🚀 Otherwise, fetch new result
        console.log(`⚡ Fetching /api/debates/${debateId}/check`);
        const resCheck = await fetch(`/api/debates/${debateId}/check`);
        if (!resCheck.ok) {
          throw new Error(`Failed to fetch check data: ${resCheck.statusText}`);
        }
        const checkData = await resCheck.json();

        console.log("🧠 Calling /api/test for AI result");
        const resTest = await fetch("/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkData),
        });

        if (!resTest.ok) {
          throw new Error(`Failed to fetch AI result: ${resTest.statusText}`);
        }

        const resultData: AiResult = await resTest.json();
        await setDoc(resultRef, {
          ...resultData,
          createdAt: serverTimestamp(),
        });
        await storeOnBlockchain(Number(debateId), resultData.answer);

        console.log("Saved AI result in Firebase");
        const parsedAnswer = parseAiResultText(resultData.answer);
        setAiResult(parsedAnswer);
      } catch (err: any) {
        console.error("Failed to fetch AI result:", err);
        setApiError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoadingApi(false);
      }
    };

    fetchAiResult();
  }, [debateId]);

 return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Debate Result</h1>
            <p className="mt-2 text-sm text-gray-500">Debate ID: <span className="font-medium text-gray-700">{debateId ?? "Loading..."}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-gray-500">AI Judgement</span>
              <span className="text-sm font-medium text-gray-700">Result page</span>
            </div>
            <div className="p-2 bg-white/60 backdrop-blur rounded-lg shadow">
              <BarChart2 size={20} />
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Competitor Cards */}
          <Card className="p-6 border-0 shadow-lg rounded-2xl bg-white">
            <CardHeader className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold">{aiResult?.user1.name?.[0] ?? "U"}</div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">{aiResult?.user1.name ?? "-"}</CardTitle>
                  {/* <p className="text-xs text-gray-500">Speaker</p> */}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Score</div>
                <div className="text-2xl font-bold text-indigo-600">{aiResult?.user1.score ?? "-"}</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{aiResult?.user1.reason ?? "No result available."}</p>

              <div className="mt-3">
                <ScoreBar score={Number(aiResult?.user1.score ?? 0)} maxScore={100} label={`Performance (${aiResult?.user1.name ?? "User 1"})`} />
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 border-0 shadow-lg rounded-2xl bg-white">
            <CardHeader className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center text-white font-bold">{aiResult?.user2.name?.[0] ?? "U"}</div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">{aiResult?.user2.name ?? "-"}</CardTitle>
                  {/* <p className="text-xs text-gray-500">Speaker</p> */}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Score</div>
                <div className="text-2xl font-bold text-rose-600">{aiResult?.user2.score ?? "-"}</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{aiResult?.user2.reason ?? "No result available."}</p>

              <div className="mt-3">
                <ScoreBar score={Number(aiResult?.user2.score ?? 0)} maxScore={100} label={`Performance (${aiResult?.user2.name ?? "User 2"})`} />
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Winner Banner */}
        <section className="mt-8">
          <div className="rounded-2xl bg-gradient-to-r from-white via-slate-50 to-white p-6 shadow-inner border">
            {isLoadingApi ? (
              <div className="text-center py-8 text-gray-500">Loading AI result...</div>
            ) : apiError ? (
              <div className="text-center py-8 text-red-500">Error: {apiError}</div>
            ) : aiResult ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 shadow-md">
                    <Trophy size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Winner</div>
                    <div className="text-2xl font-extrabold text-gray-900">{aiResult.winnerId || "—"}</div>
                    <div className="text-sm text-gray-500 mt-1">{aiResult.winnerReason}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No AI result available yet.</div>
            )}
          </div>
        </section>

        <footer className="mt-6 text-xs text-gray-400 text-center">Powered by AI judge</footer>
      </div>
    </div>
  );
}

