"use client";

import { useState } from "react";
import { VideoCall } from "@/components/video-call";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [channelName, setChannelName] = useState("");
  const [isInCall, setIsInCall] = useState(false);

  const handleJoin = () => {
    if (channelName.trim()) {
      setIsInCall(true);
    }
  };

  const handleLeave = () => {
    setIsInCall(false);
    setChannelName("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sign Language to Speech Video Call
          </h1>
          <p className="text-gray-600">
            Real-time gesture recognition with voice output using Agora RTC & MediaPipe
          </p>
        </div>

        {!isInCall ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Join a Call</CardTitle>
              <CardDescription>
                Enter a channel name to start or join a video call. Both users need to use the same channel name.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="channel" className="text-sm font-medium">
                  Channel Name
                </label>
                <Input
                  id="channel"
                  placeholder="e.g., room-123"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && channelName.trim()) {
                      handleJoin();
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleJoin} 
                className="w-full"
                disabled={!channelName.trim()}
              >
                Join Call
              </Button>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Share the channel name with your friend</li>
                  <li>Both users join the same channel</li>
                  <li>Show hand gestures to the camera (A, B, L, V, I, Y, C)</li>
                  <li>Hold the gesture for 1 second to confirm</li>
                  <li>Detected letters will be spoken automatically on the remote side</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-gray-800 mb-2">Setup Required:</h3>
                <p className="text-sm text-gray-700">
                  Make sure to set <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_AGORA_APP_ID</code> in your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file.
                  Get your App ID from{" "}
                  <a 
                    href="https://console.agora.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Agora Console
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <VideoCall channelName={channelName} onLeave={handleLeave} />
        )}
      </div>
    </main>
  );
}
