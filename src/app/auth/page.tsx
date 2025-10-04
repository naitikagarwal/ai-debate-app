"use client"; // if using App Router

import { useState } from "react";
import { auth } from "@/backend/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";

export default function AuthPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  // Signup
  const handleSignup = async (): Promise<void> => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCred.user);
      alert("Signup successful!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Login
  const handleLogin = async (): Promise<void> => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCred.user);
      alert("Login successful!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Logout
  const handleLogout = async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {user ? (
        <div className="bg-white p-6 rounded shadow-md text-center">
          <h2 className="text-xl font-bold mb-4">Welcome, {user.email}</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow-md">
          <h2 className="text-xl font-bold mb-4">Login / Signup</h2>
          <input
            type="email"
            placeholder="Email"
            className="border p-2 mb-2 w-full"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 mb-2 w-full"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
          />
          <div className="flex gap-2">
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Login
            </button>
            <button
              onClick={handleSignup}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Signup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
