"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/backend/firebase";
import { useEffect, useState } from "react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  if (loading) {
    return null; // or a spinner if you like
  }
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          AI Debate Judge
        </motion.h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-8">
          Participate in or observe debates, powered by <span className="font-semibold">AI</span> and <span className="font-semibold">Blockchain</span>.  
          Transparent. Fair. Decentralized.
        </p>
        <div className="flex gap-4">
      {user ? (
        <>
          <Link href="/debate">
            <Button size="lg" className="rounded-2xl px-6">
              Join a Debate
            </Button>
          </Link>
          <Link href="/createDebate">
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-6 border-2"
            >
              Create Debate
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Link href="/signup">
            <Button size="lg" className="rounded-2xl px-6">
              SignUp
            </Button>
          </Link>
          <Link href="/signin">
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-6 border-2"
            >
              SignIn
            </Button>
          </Link>
        </>
      )}
    </div>

      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-gray-100">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Platform Features
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: "Real-time Debates",
              desc: "Engage in structured 1v1 or team debates with time-limited rounds.",
            },
            {
              title: "AI Judge",
              desc: "AI evaluates persuasiveness and fairness, providing unbiased scoring.",
            },
            {
              title: "Blockchain Records",
              desc: "Results are stored on-chain for transparency and immutability.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="rounded-2xl shadow-md hover:shadow-lg transition">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">About the Project</h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            Built for the <span className="font-semibold">KodeinKGP IntraSoc Hackathon</span>,  
            this platform combines <span className="font-semibold">AI</span> and <span className="font-semibold">Web3</span>  
            to redefine how debates are judged — ensuring fairness, transparency, and innovation.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Debate?
        </h2>
        <p className="text-lg mb-8">
          Create your debate, invite participants, and let AI be the judge.
        </p>
        <Link href="/create">
          <Button size="lg" variant="secondary" className="rounded-2xl px-6">
            Get Started
          </Button>
        </Link>
      </section>

      <footer className="py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} AI Debate Judge. Built with ❤️ at KodeinKGP.
      </footer>
    </main>
  );
}
