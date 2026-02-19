import { useState, useEffect, useRef } from 'react'

function App() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [peerId, setPeerId] = useState('')
  const [friendId, setFriendId] = useState('')
  const [status, setStatus] = useState('Ready')
  const [detectedLetter, setDetectedLetter] = useState('')
  const [handDetected, setHandDetected] = useState(false)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const canvasRef = useRef(null)
  const localStreamRef = useRef(null)
  const peerRef = useRef(null)
  const dataChannelRef = useRef(null)
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const lastDetectedLetterRef = useRef('')
  const lastSpeechTimeRef = useRef(0)

  useEffect(() => {
    // Wait for scripts to load
    const initMediaPipe = () => {
      if (window.Hands) {
        const hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469404/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onHandResults);
        handsRef.current = hands;
        return true;
      }
      return false;
    };

    // Initialize MediaPipe Hands
    if (!initMediaPipe()) {
      // Retry after a short delay if scripts aren't loaded yet
      const timer = setTimeout(() => {
        initMediaPipe();
      }, 100);
      return () => clearTimeout(timer);
    }

    // Initialize PeerJS
    const initPeer = () => {
      if (window.Peer) {
        const peer = new window.Peer();
        
        peer.on('open', (id) => {
          setPeerId(id);
          setStatus('Connected - Ready to call');
        });

        peer.on('call', (call) => {
          if (localStreamRef.current) {
            call.answer(localStreamRef.current);
          }
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });
        });

        peer.on('connection', (conn) => {
          conn.on('data', (data) => {
            handleReceivedLetter(data);
          });
          dataChannelRef.current = conn;
        });

        peerRef.current = peer;
        return true;
      }
      return false;
    };

    if (!initPeer()) {
      const timer = setTimeout(() => {
        initPeer();
      }, 100);
      return () => clearTimeout(timer);
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const onHandResults = (results) => {
    const canvas = canvasRef.current;
    const video = localVideoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandDetected(true);
      setStatus('Hand Detected');
      
      const landmarks = results.multiHandLandmarks[0];
      const letter = recognizeGesture(landmarks);
      
      if (letter && letter !== lastDetectedLetterRef.current) {
        setDetectedLetter(letter);
        lastDetectedLetterRef.current = letter;
        
        // Send letter via data channel
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          dataChannelRef.current.send(letter);
        }
      }

      // Draw hand landmarks
      if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        });
        window.drawLandmarks(ctx, landmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3
        });
      }
    } else {
      setHandDetected(false);
      setStatus('No Hand Detected');
      setDetectedLetter('');
    }

    ctx.restore();
  };

  const recognizeGesture = (landmarks) => {
    // Simple heuristic-based gesture recognition
    // Using finger tip positions relative to PIP joints
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const thumbIP = landmarks[3];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];
    const middlePIP = landmarks[10];
    const middleMCP = landmarks[9];
    const ringPIP = landmarks[14];
    const ringMCP = landmarks[13];
    const pinkyPIP = landmarks[18];
    const pinkyMCP = landmarks[17];

    // Check if finger is extended (tip is above PIP joint)
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    // Thumb is extended if it's away from the hand (check x position for thumb)
    const thumbExtended = Math.abs(thumbTip.x - thumbIP.x) > 0.05 || thumbTip.y < thumbIP.y;

    // Letter A: Fist (all fingers closed, thumb may be inside)
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'A';
    }

    // Letter B: All four fingers extended, thumb closed or inside
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return 'B';
    }

    // Letter L: Index and thumb extended, others closed
    if (indexExtended && thumbExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'L';
    }

    // Victory sign (V): Index and middle extended, others closed
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'V';
    }

    // Letter I: Pinky extended, others closed
    if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && !thumbExtended) {
      return 'I';
    }

    // Letter Y: Thumb and pinky extended, others closed
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
      return 'Y';
    }

    // Letter C: Thumb and fingers curved (thumb and index/middle extended but curved)
    const thumbIndexDistance = Math.abs(thumbTip.x - indexTip.x);
    const thumbMiddleDistance = Math.abs(thumbTip.x - middleTip.x);
    if (thumbExtended && indexExtended && middleExtended && 
        thumbIndexDistance > 0.08 && thumbMiddleDistance > 0.08) {
      return 'C';
    }

    return null;
  };

  const handleReceivedLetter = (letter) => {
    // Use Web Speech API to speak the letter
    const now = Date.now();
    // Throttle speech to avoid rapid repetition (1 second minimum between speeches)
    if (now - lastSpeechTimeRef.current > 1000) {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(letter);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
          lastSpeechTimeRef.current = Date.now();
        };
        
        window.speechSynthesis.speak(utterance);
        lastSpeechTimeRef.current = now;
      }
    }
  };

  const startCall = async () => {
    try {
      setStatus('Starting call...');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Start MediaPipe Hands processing
      if (handsRef.current && window.Camera) {
        const camera = new window.Camera(localVideoRef.current, {
          onFrame: async () => {
            if (handsRef.current && localVideoRef.current) {
              await handsRef.current.send({ image: localVideoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        camera.start();
        cameraRef.current = camera;
      } else if (!handsRef.current) {
        // Retry initialization if MediaPipe wasn't ready
        setTimeout(() => {
          if (window.Hands && localVideoRef.current) {
            const hands = new window.Hands({
              locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469404/${file}`;
              }
            });
            hands.setOptions({
              maxNumHands: 1,
              modelComplexity: 1,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });
            hands.onResults(onHandResults);
            handsRef.current = hands;

            const camera = new window.Camera(localVideoRef.current, {
              onFrame: async () => {
                await hands.send({ image: localVideoRef.current });
              },
              width: 640,
              height: 480
            });
            camera.start();
            cameraRef.current = camera;
          }
        }, 500);
      }

      // Connect to peer
      if (friendId && peerRef.current) {
        const conn = peerRef.current.connect(friendId);
        conn.on('open', () => {
          dataChannelRef.current = conn;
          setStatus('Connected - Hand detection active');
        });
        conn.on('data', (data) => {
          handleReceivedLetter(data);
        });

        // Make the call
        const call = peerRef.current.call(friendId, stream);
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      }

      setIsCallActive(true);
    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('Error: ' + error.message);
    }
  };

  const endCall = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    setIsCallActive(false);
    setStatus('Call ended');
    setDetectedLetter('');
    setHandDetected(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sign Language to Speech Video Call
          </h1>
          <p className="text-gray-600">Real-time gesture recognition with voice output</p>
        </div>

        {/* Status Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isCallActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="font-semibold text-gray-700">Status: {status}</span>
            </div>
            <div className="text-sm text-gray-600">
              Your ID: <span className="font-mono font-bold text-blue-600">{peerId || 'Connecting...'}</span>
            </div>
          </div>
        </div>

        {/* Video Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Local Video */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Local Stream</h2>
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg bg-black"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ 
                  transform: 'scaleX(-1)',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              {detectedLetter && (
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-6xl font-bold px-6 py-4 rounded-lg shadow-xl">
                  {detectedLetter}
                </div>
              )}
            </div>
            {handDetected && (
              <div className="mt-2 text-sm text-green-600 font-semibold">
                ✓ Hand Detected
              </div>
            )}
          </div>

          {/* Remote Video */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Remote Stream</h2>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
            <div className="mt-2 text-sm text-gray-500">
              Waiting for remote connection...
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {!isCallActive ? (
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input
                type="text"
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
                placeholder="Enter Friend's Peer ID"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={startCall}
                disabled={!friendId || !peerId}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Start Call
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={endCall}
                className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                End Call
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Share your Peer ID with your friend</li>
            <li>Enter your friend's Peer ID and click "Start Call"</li>
            <li>Show hand gestures to the camera (A, B, L, V, I, Y, C)</li>
            <li>Detected letters will be spoken automatically on the remote side</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
