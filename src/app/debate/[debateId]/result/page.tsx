"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/backend/firebase";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "@/utils/constants";
import { keccak256, toUtf8Bytes } from "ethers";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Card, CardHeader, CardTitle, CardContent } from "shadcn"; 

interface AiResult {
  answer: string;
}

interface ParsedAiAnswer {
  user1: { score: string; reason: string };
  user2: { score: string; reason: string };
  winnerId: string;
  winnerReason: string;
}

async function storeOnBlockchain(debateId: string, answer: string) {
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
    const tx = await contract.storeResult(debateId, hashValue);
    await tx.wait();
    console.log("✅ Result stored on blockchain:", hashValue);
  } catch (err) {
    console.error("❌ Blockchain store failed:", err);
  }
}

function parseAiResultText(text: string): ParsedAiAnswer {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  let user1: { score: string; reason: string } = { score: "", reason: "" };
  let user2: { score: string; reason: string } = { score: "", reason: "" };
  let winnerId = "";
  let winnerReason = "";
  let currentTeam = "";

  lines.forEach((line) => {
    if (line.startsWith("score to ")) {
      const parts = line.split(" : ");
      currentTeam = parts[0].replace("score to ", "").trim();
      const score = parts[1].trim();
      if (currentTeam === "Naitlik Agarwal") {
        user1.score = score;
      } else if (currentTeam === "Kavish") {
        user2.score = score;
      }
    } else if (line.startsWith("reason :")) {
      const reasonText = line.split("reason :")[1].trim();
      if (currentTeam === "Naitlik Agarwal") {
        user1.reason = reasonText;
      } else if (currentTeam === "Kavish") {
        user2.reason = reasonText;
      } else if (winnerId) {
        winnerReason = reasonText;
      }
    } else if (line.startsWith("winner :")) {
      winnerId = line.split("winner :")[1].trim();
    }
  });

  return { user1, user2, winnerId, winnerReason };
}

export default function DebateResult() {
  const [aiResult, setAiResult] = useState<ParsedAiAnswer | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const params = useParams();
  const debateId = params?.debateId as string | undefined;

  // --- Fetch AI Judged Result ---
  useEffect(() => {
    if (!debateId) return;

    const fetchAiResult = async () => {
      setIsLoadingApi(true);
      setApiError(null);
      try {
        console.log("🔍 Checking Firebase cache for debate:", debateId);
        const resultRef = doc(db, "results", debateId);
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
        await storeOnBlockchain(debateId, resultData.answer);

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
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Debate Result</h1>
        <p className="text-lg text-gray-600 mb-8">
          Debate ID: {debateId || "Loading..."}
        </p>

        {/* --- AI Judged Result --- */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            AI-Judged Result (Off-chain)
          </h2>
          {isLoadingApi && <p>Loading AI result...</p>}
          {apiError && <p className="text-red-500">Error: {apiError}</p>}
          {aiResult && (
            <div className="space-y-6">
              {/* Display user1's result */}
              <Card className="border p-4 rounded-lg shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-blue-600">
                    User 1 (Naitlik Agarwal) Score: {aiResult.user1.score}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{aiResult.user1.reason}</p>
                </CardContent>
              </Card>

              {/* Display user2's result */}
              <Card className="border p-4 rounded-lg shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-blue-600">
                    User 2 (Kavish) Score: {aiResult.user2.score}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{aiResult.user2.reason}</p>
                </CardContent>
              </Card>

              {/* Display winner */}
              <div className="mt-6 text-center">
                <span className="text-2xl font-bold text-green-600">
                  Winner: {aiResult.winnerId}
                </span>
                <p className="text-sm text-gray-500 mt-2">{aiResult.winnerReason}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
