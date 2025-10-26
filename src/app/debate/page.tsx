"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VideoIcon } from "lucide-react";

export default function JoinDebatePage() {
  const [meetingId, setMeetingId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    // if (/^\d{10}$/.test(meetingId)) {
    //   setError("");
      router.push(`/debate/${meetingId}/lobby`);
    // } else {
    //   setError("Meeting ID must be exactly 10 digits.");
    // }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <VideoIcon className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Join a Debate
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Enter your 10-digit meeting ID below
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="Enter 10-digit Meeting ID"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="text-center text-lg tracking-widest"
            maxLength={10}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleJoin}
            className="w-full text-lg font-medium"
          >
            Join
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
