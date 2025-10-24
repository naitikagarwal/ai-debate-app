"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/backend/firebase";
import { useDebateContext } from "../../context/DebateContext";
// import { useDebateContext } from "@/context/DebateContext"; // Import your context

export default function CreateDebate() {
  // --- Original State (for API) ---
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [rounds, setRounds] = useState(3);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(180);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // --- Blockchain Context Integration ---
  const {
    currentAccount,
    connectWallet,
    handleChange: handleBlockchainChange, // Renamed to avoid conflicts
    formData: blockchainFormData,
    createDebate: createBlockchainDebate,
    isLoading: isBlockchainLoading,
  } = useDebateContext();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    // 1. Firebase Auth Check
    const user = auth.currentUser;
    if (!user) return alert("You must be signed in to create a debate.");

    // 2. Wallet Connection Check
    if (!currentAccount)
      return alert("Please connect your wallet to create a debate.");

    // 3. Blockchain Form Validation
    const { opponentAddress, stakeAmount } = blockchainFormData;
    if (!opponentAddress || !stakeAmount || !title || !topic) {
      return alert(
        "Please fill out all fields, including opponent address and stake."
      );
    }

    setCreating(true);
    try {
      // --- STEP 1: CREATE BLOCKCHAIN DEBATE ---
      // This will use the values from blockchainFormData
      // and trigger the MetaMask popup for staking.
      // We wait for this to complete *before* creating the server record.
      await createBlockchainDebate();

      // --- STEP 2: CREATE DATABASE DEBATE (Original Function) ---
      // This runs only if the blockchain transaction was successful
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
          // You might want to include blockchain data here
          stake: stakeAmount,
          participantA: currentAccount,
          participantB: opponentAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      // --- STEP 3: REDIRECT TO LOBBY ---
      router.push(`/debate/${data.debateId}/lobby`);
    } catch (err: any) {
      console.error("[CreateDebate] error:", err);
      // Check for common MetaMask errors
      if (err.code === 4001) {
        alert("Transaction rejected. You must approve the stake in MetaMask.");
      } else {
        alert(`Failed to create debate: ${err.message}`);
      }
    } finally {
      setCreating(false);
    }
  }

  // Determine the overall loading state
  const isPageLoading = creating || isBlockchainLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
          {/* --- Connect Wallet Button --- */}
          {!currentAccount && (
            <div className="mb-6">
              <button
                type="button"
                onClick={connectWallet}
                className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-md transition-all"
              >
                Connect Wallet to Get Started
              </button>
            </div>
          )}

          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-800 mb-2">
              Create a Debate
            </h3>
            <p className="text-gray-500">
              Start a new chat debate and share your link
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleCreate}>
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Debate Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title..."
                className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
              />
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Debate Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's the main question or subject?"
                className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
              />
            </div>

            {/* --- Blockchain Fields --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opponent's Wallet Address
                </label>
                <input
                  type="text"
                  name="opponentAddress" // Name must match context's formData key
                  value={blockchainFormData.opponentAddress}
                  onChange={(e) => handleBlockchainChange(e, "opponentAddress")}
                  placeholder="0x..."
                  className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stake Amount (ETH)
                </label>
                <input
                  type="number"
                  name="stakeAmount" // Name must match context's formData key
                  step="0.001"
                  min="0"
                  value={blockchainFormData.stakeAmount}
                  onChange={(e) => handleBlockchainChange(e, "stakeAmount")}
                  placeholder="e.g., 0.01"
                  className="w-full px-5 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                />
              </div>
            </div>
            {/* --- End Blockchain Fields --- */}

            {/* Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Debate Mode
              </label>
              {/* ... (Your existing button logic for mode - no changes needed) ... */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode("individual")}
                  className={`relative px-6 py-5 rounded-xl border-2 transition-all ${
                    mode === "individual"
                      ? "bg-indigo-50 border-indigo-400 shadow-sm"
                      : "bg-gray-50 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {/* ... (Icon and text) ... */}
                  <div className="flex flex-col items-center space-y-2">
                    <svg
                      className="w-10 h-10 text-indigo-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-gray-800 font-semibold text-lg">
                      Individual
                    </span>
                    <span className="text-gray-500 text-xs">
                      One-on-one debate
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("team")}
                  className={`relative px-6 py-5 rounded-xl border-2 transition-all ${
                    mode === "team"
                      ? "bg-indigo-50 border-indigo-400 shadow-sm"
                      : "bg-gray-50 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {/* ... (Icon and text) ... */}
                  <div className="flex flex-col items-center space-y-2">
                    <svg
                      className="w-10 h-10 text-indigo-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span className="text-gray-800 font-semibold text-lg">
                      Team
                    </span>
                    <span className="text-gray-500 text-xs">
                      Group debate format
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              {/* ... (Your existing inputs for Rounds and Time Limit - no changes needed) ... */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rounds
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  min={30}
                  max={1800}
                  value={timeLimitSeconds}
                  onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPageLoading || !currentAccount} // Disable if loading OR wallet not connected
              className="w-full py-5 px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-lg rounded-xl shadow-md disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] disabled:scale-100"
            >
              {isBlockchainLoading
                ? "Waiting for Blockchain..."
                : creating
                ? "Creating Your Debate..."
                : !currentAccount
                ? "Please Connect Wallet"
                : "Create & Get Link"}
            </button>

            <p className="text-center text-gray-500 text-sm">
              You'll be asked to approve the stake in your wallet.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
