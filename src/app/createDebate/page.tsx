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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header with icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-4xl font-bold text-white mb-2">Create a Debate</h3>
            <p className="text-purple-200">Start a new conversation and share your link</p>
          </div>

          <form className="space-y-6" onSubmit={handleCreate}>
            {/* Title Input */}
            <div className="relative">
              <label className="block text-sm font-semibold text-purple-100 mb-2 ml-1">
                Debate Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a compelling title..."
                  className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-purple-300/60 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl pointer-events-none"></div>
              </div>
            </div>

            {/* Topic Input */}
            <div className="relative">
              <label className="block text-sm font-semibold text-purple-100 mb-2 ml-1">
                Debate Topic
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's the main question or subject?"
                  className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-purple-300/60 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none"></div>
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-semibold text-purple-100 mb-3 ml-1">
                Debate Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('individual')}
                  className={`relative px-6 py-5 rounded-2xl border-2 transition-all ${
                    mode === 'individual'
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 border-white/20 hover:border-purple-400/50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-white font-bold text-lg">Individual</span>
                    <span className="text-purple-200 text-xs">One-on-one debate</span>
                  </div>
                  {mode === 'individual' && (
                    <div className="absolute top-3 right-3">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('team')}
                  className={`relative px-6 py-5 rounded-2xl border-2 transition-all ${
                    mode === 'team'
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 border-white/20 hover:border-purple-400/50'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-white font-bold text-lg">Team</span>
                    <span className="text-purple-200 text-xs">Group debate format</span>
                  </div>
                  {mode === 'team' && (
                    <div className="absolute top-3 right-3">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Settings: Rounds and Time Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-purple-100 mb-2 ml-1">
                  Rounds
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rounds}
                  onChange={e => setRounds(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-purple-300/60 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-100 mb-2 ml-1">
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  min={30}
                  max={1800}
                  value={timeLimitSeconds}
                  onChange={e => setTimeLimitSeconds(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-purple-300/60 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all"
                />
              </div>
            </div>

            {/* Debate Type: Chat or Video */}
            <div>
              <label className="block text-sm font-semibold text-purple-100 mb-3 ml-1">
                Debate Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDebateType("chat")}
                  className={`relative px-6 py-4 rounded-2xl border-2 transition-all ${
                    debateType === "chat"
                      ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 shadow-lg shadow-purple-500/50"
                      : "bg-white/10 border-white/20 hover:border-purple-400/50"
                  }`}
                >
                  <span className="text-white font-bold text-lg">Chat</span>
                  {debateType === "chat" && (
                    <div className="absolute top-3 right-3">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDebateType("video")}
                  className={`relative px-6 py-4 rounded-2xl border-2 transition-all ${
                    debateType === "video"
                      ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 shadow-lg shadow-purple-500/50"
                      : "bg-white/10 border-white/20 hover:border-purple-400/50"
                  }`}
                >
                  <span className="text-white font-bold text-lg">Video</span>
                  {debateType === "video" && (
                    <div className="absolute top-3 right-3">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={creating}
              className="relative w-full py-5 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-400 disabled:to-indigo-400 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-purple-500/50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:scale-100 overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center">
                {creating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Your Debate...
                  </>
                ) : (
                  <>
                    Create & Get Link
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </button>

            {/* Info text */}
            <p className="text-center text-purple-200 text-sm">
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              You'll receive a shareable link once created
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}