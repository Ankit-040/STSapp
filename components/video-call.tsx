"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  useRTCClient, 
  AgoraRTCProvider, 
  LocalVideoTrack, 
  RemoteUser, 
  useRemoteUsers,
  useLocalMicrophoneTrack,
  useLocalCameraTrack 
} from "agora-rtc-react";
import AgoraRTM from "agora-rtm-sdk";
import { MediaPipeHandsManager } from "@/lib/mediapipe-hands";
import { recognizeGesture, GestureDebouncer, GestureLetter } from "@/lib/gesture-recognition";
import { SpeechSynthesisManager } from "@/lib/speech-synthesis";
import { AGORA_CONFIG, validateAgoraConfig } from "@/lib/agora-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VideoCallProps {
  channelName: string;
  onLeave?: () => void;
}

function VideoCallContent({ channelName, onLeave }: VideoCallProps) {
  const rtcClient = useRTCClient();
  const remoteUsers = useRemoteUsers();
  
  const rtmClientRef = useRef<any>(null);
  const rtmChannelRef = useRef<any>(null);
  const { localMicrophoneTrack, isLoading: micLoading } = useLocalMicrophoneTrack();
  const { localCameraTrack, isLoading: camLoading } = useLocalCameraTrack();
  
  const [isJoined, setIsJoined] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [detectedLetter, setDetectedLetter] = useState<GestureLetter>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [receivedText, setReceivedText] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const handsManagerRef = useRef<MediaPipeHandsManager | null>(null);
  const gestureDebouncerRef = useRef<GestureDebouncer>(new GestureDebouncer(1000));
  const speechManagerRef = useRef<SpeechSynthesisManager | null>(null);

  // Initialize MediaPipe Hands
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const manager = new MediaPipeHandsManager();
        await manager.initialize();
        handsManagerRef.current = manager;
        setStatus("MediaPipe initialized");
      } catch (error) {
        console.error("Failed to initialize MediaPipe:", error);
        setStatus("MediaPipe initialization failed");
      }
    };

    initMediaPipe();

    // Initialize speech synthesis
    if (SpeechSynthesisManager.isSupported()) {
      speechManagerRef.current = new SpeechSynthesisManager();
    }

    return () => {
      handsManagerRef.current?.dispose();
      speechManagerRef.current?.stop();
    };
  }, []);

  // Set up local video element for MediaPipe processing
  useEffect(() => {
    if (localCameraTrack && localVideoRef.current && handsManagerRef.current && isJoined) {
      const video = localVideoRef.current;
      const stream = new MediaStream([localCameraTrack.getMediaStreamTrack()]);
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      const startProcessing = async () => {
        try {
          await video.play();
          if (handsManagerRef.current) {
            handsManagerRef.current.startProcessing(video, (results) => {
              if (results.landmarks && results.landmarks.length > 0) {
                setHandDetected(true);
                const landmarks = results.landmarks[0];
                const letter = recognizeGesture(landmarks);
                
                if (letter) {
                  const confirmedLetter = gestureDebouncerRef.current.process(letter);
                  if (confirmedLetter && confirmedLetter !== detectedLetter) {
                    setDetectedLetter(confirmedLetter);
                    // Send via RTM
                    sendMessage(confirmedLetter);
                  }
                } else {
                  gestureDebouncerRef.current.reset();
                  setDetectedLetter(null);
                }
              } else {
                setHandDetected(false);
                gestureDebouncerRef.current.reset();
                setDetectedLetter(null);
              }
            });
          }
        } catch (error) {
          console.error("Failed to start video processing:", error);
        }
      };

      startProcessing();
    }

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (!isJoined) {
        handsManagerRef.current?.stopProcessing();
      }
    };
  }, [localCameraTrack, isJoined, detectedLetter, sendMessage]);

  // Join RTC channel
  const joinRTCChannel = useCallback(async () => {
    try {
      setStatus("Joining RTC channel...");
      const uid = await rtcClient.join(AGORA_CONFIG.appId, channelName, AGORA_CONFIG.token || null);
      setIsJoined(true);
      setStatus("RTC channel joined");

      // Publish local tracks
      if (localCameraTrack && localMicrophoneTrack) {
        await rtcClient.publish([localCameraTrack, localMicrophoneTrack]);
        setIsPublishing(true);
        setStatus("Publishing local stream");
      }
    } catch (error: any) {
      console.error("Failed to join RTC channel:", error);
      setStatus(`Error: ${error.message || error}`);
    }
  }, [rtcClient, channelName, localCameraTrack, localMicrophoneTrack]);

  // Join RTM channel and set up message listener
  const joinRTMChannel = useCallback(async () => {
    try {
      const client = AgoraRTM.createInstance(AGORA_CONFIG.rtmAppId);
      await client.login({ uid: Math.floor(Math.random() * 100000).toString() });
      rtmClientRef.current = client;

      const channel = client.createChannel(channelName);
      await channel.join();
      rtmChannelRef.current = channel;

      // Listen for messages
      channel.on("ChannelMessage", (message: any, memberId: string) => {
        const text = message.text;
        setReceivedText(text);
        
        // Speak the received text
        if (speechManagerRef.current) {
          speechManagerRef.current.speak(`Letter ${text}`);
        }
      });

      setStatus("RTM channel joined");
    } catch (error: any) {
      console.error("Failed to join RTM channel:", error);
      setStatus(`RTM Error: ${error.message || error}`);
    }
  }, [channelName]);

  // Send message via RTM
  const sendMessage = useCallback(async (letter: string) => {
    try {
      if (rtmChannelRef.current) {
        const message = rtmClientRef.current.createMessage({ text: letter, messageType: "TEXT" });
        await rtmChannelRef.current.sendMessage(message);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, []);

  // Join both channels
  const handleJoin = useCallback(async () => {
    if (micLoading || camLoading) {
      setStatus("Waiting for camera/microphone...");
      return;
    }
    await joinRTMChannel();
    await joinRTCChannel();
  }, [joinRTMChannel, joinRTCChannel, micLoading, camLoading]);

  // Leave channels
  const handleLeave = useCallback(async () => {
    try {
      handsManagerRef.current?.stopProcessing();
      speechManagerRef.current?.stop();
      
      if (isPublishing) {
        await rtcClient.unpublish();
        setIsPublishing(false);
      }
      
      if (isJoined) {
        await rtcClient.leave();
        setIsJoined(false);
      }

      if (rtmChannelRef.current) {
        await rtmChannelRef.current.leave();
      }
      if (rtmClientRef.current) {
        await rtmClientRef.current.logout();
      }
      
      setStatus("Left channels");
      setDetectedLetter(null);
      setReceivedText("");
      onLeave?.();
    } catch (error) {
      console.error("Error leaving channels:", error);
    }
  }, [rtcClient, isJoined, isPublishing, onLeave]);

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isJoined ? "bg-green-500" : "bg-gray-400"}`} />
              <CardTitle className="text-lg">Status: {status}</CardTitle>
            </div>
            <Badge variant={handDetected ? "default" : "secondary"}>
              {handDetected ? "Hand Detected" : "No Hand"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Local Video */}
        <Card>
          <CardHeader>
            <CardTitle>Local Stream</CardTitle>
            <CardDescription>Your video with gesture detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {isJoined && localCameraTrack && (
                <LocalVideoTrack track={localCameraTrack} play className="hidden" />
              )}
              {detectedLetter && (
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-7xl font-bold px-8 py-6 rounded-lg shadow-2xl z-10">
                  {detectedLetter}
                </div>
              )}
              {!isJoined && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <p>Click Join to start</p>
                </div>
              )}
            </div>
            {detectedLetter && (
              <p className="mt-2 text-sm text-muted-foreground">
                Detected: <span className="font-bold">{detectedLetter}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Remote Video */}
        <Card>
          <CardHeader>
            <CardTitle>Remote Stream</CardTitle>
            <CardDescription>Other participant&apos;s video</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {remoteUsers.length > 0 ? (
                remoteUsers.map((user) => (
                  <RemoteUser key={user.uid} user={user} />
                ))
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <p>Waiting for remote user...</p>
                </div>
              )}
              {receivedText && (
                <div className="absolute bottom-4 left-4 right-4 bg-green-600 text-white text-2xl font-bold px-4 py-3 rounded-lg shadow-xl text-center">
                  Received: {receivedText}
                </div>
              )}
            </div>
            {receivedText && (
              <p className="mt-2 text-sm text-muted-foreground">
                Last received: <span className="font-bold">{receivedText}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            {!isJoined ? (
              <Button 
                onClick={handleJoin} 
                className="flex-1"
                disabled={micLoading || camLoading}
              >
                {micLoading || camLoading ? "Loading..." : "Join Call"}
              </Button>
            ) : (
              <Button onClick={handleLeave} variant="destructive" className="flex-1">
                Leave Call
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function VideoCall({ channelName, onLeave }: VideoCallProps) {
  const config = validateAgoraConfig();
  
  if (!config.valid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Configuration Error</CardTitle>
          <CardDescription>{config.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rtcClient = useRTCClient(
    { codec: "vp8", mode: "rtc" }
  );

  return (
    <AgoraRTCProvider client={rtcClient}>
      <VideoCallContent channelName={channelName} onLeave={onLeave} />
    </AgoraRTCProvider>
  );
}
