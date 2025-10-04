"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/backend/firebase";

export default function CreateDebate() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [debateType, setDebateType] = useState<"chat" | "video">("chat");
  const [rounds, setRounds] = useState(3);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(180);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
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
          debateType,
          settings: {
            rounds,
            timeLimitSeconds,
          },
          uid: user.uid,
          displayName: user.displayName || user.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      // Redirect to lobby
      router.push(`/debate/${data.debateId}/lobby`);
    } catch (err) {
      console.error("[CreateDebate] error:", err);
      alert("Failed to create debate. Check console.");
    } finally {
      setCreating(false);
    }
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6">
    <div className="w-full max-w-2xl">
      {/* Card Container */}
      <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">
            Create a Debate
          </h3>
          <p className="text-gray-500">
            Start a new conversation and share your link
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleCreate}>
          {/* Title Input */}
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

          {/* Topic Input */}
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

          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Debate Mode
            </label>
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

          {/* Settings: Rounds & Time Limit */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Debate Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Debate Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDebateType("chat")}
                className={`px-6 py-4 rounded-xl border-2 transition-all ${
                  debateType === "chat"
                    ? "bg-indigo-50 border-indigo-400 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:border-indigo-300"
                }`}
              >
                <span className="text-gray-800 font-semibold text-lg">
                  Chat
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDebateType("video")}
                className={`px-6 py-4 rounded-xl border-2 transition-all ${
                  debateType === "video"
                    ? "bg-indigo-50 border-indigo-400 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:border-indigo-300"
                }`}
              >
                <span className="text-gray-800 font-semibold text-lg">
                  Video
                </span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={creating}
            className="w-full py-5 px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-lg rounded-xl shadow-md disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] disabled:scale-100"
          >
            {creating ? "Creating Your Debate..." : "Create & Get Link"}
          </button>

          {/* Info */}
          <p className="text-center text-gray-500 text-sm">
            You'll receive a shareable link once created
          </p>
        </form>
      </div>
    </div>
  </div>
);
}