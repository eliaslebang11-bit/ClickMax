import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Mic, 
  MoreVertical, 
  Users,
  ExternalLink,
  Camera,
  LogOut,
  AlertTriangle,
  Send,
  MicOff,
  Video,
  VideoOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const MOCK_CHAT = [
  { id: 1, user: "Elena", avatar: "https://picsum.photos/seed/elena/100/100", comment: "This stream is fire! 🔥" },
  { id: 2, user: "Markus", avatar: "https://picsum.photos/seed/markus/100/100", comment: "Loving the vibes today" },
  { id: 3, user: "Sarah J.", avatar: "https://picsum.photos/seed/sarah/100/100", comment: "Can you show the setup?" },
  { id: 4, user: "Deepak", avatar: "https://picsum.photos/seed/deepak/100/100", comment: "Hello from India! 🇮🇳" },
  { id: 5, user: "Chloe", avatar: "https://picsum.photos/seed/chloe/100/100", comment: "Amazing quality" },
];

export default function LiveStream() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [seconds, setSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [messages, setMessages] = useState(MOCK_CHAT);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Simulate real-time chat
    const interval = setInterval(() => {
      const randomMsg = {
        id: Date.now(),
        user: ["Alex", "Jordan", "Kim", "Taylor", "Morgan"][Math.floor(Math.random() * 5)],
        avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
        comment: ["Wow!", "Nice!", "LFG!", "Heart eyes", "Subscribe!", "Great job!"][Math.floor(Math.random() * 6)]
      };
      setMessages(prev => [...prev.slice(-15), randomMsg]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" }, 
        audio: true 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      console.warn("Camera + Audio failed, trying video only:", err);
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(videoStream);
        if (videoRef.current) videoRef.current.srcObject = videoStream;
      } catch (videoErr: any) {
        console.error("Camera access failed:", videoErr);
        setCameraError("Permission denied");
      }
    }
  };

  useEffect(() => {
    startCamera();

    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col text-white font-sans">
      {/* Camera Background */}
      <div className="absolute inset-0 z-0">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900 z-20">
            <Camera className="w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-xl font-bold mb-2">Camera Blocked</h3>
            <p className="text-sm text-white/60 mb-8 max-w-[240px]">
              Please click "Allow" in your browser or open in a new tab to fix.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              <button 
                onClick={startCamera}
                className="w-full py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-3 bg-white/10 text-white rounded-full font-bold text-sm hover:bg-white/20 transition-colors"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
          </>
        )}
      </div>

      {/* Top Stats Bar */}
      <div className="relative z-10 grid grid-cols-3 px-4 py-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="bg-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
            LIVE
          </div>
          <span className="text-[10px] text-white/60 font-medium">Stream</span>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold tracking-tight">{formatTime(seconds)}</span>
          <span className="text-[10px] text-white/60 font-medium">Time</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold tracking-tight">0</span>
          <Users className="w-3 h-3 text-white/60" />
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 relative z-10" />

      {/* Bottom Section */}
      <div className="relative z-10 px-4 pb-3 flex flex-col gap-4">
        {/* Chat Section */}
        <div className="max-h-[160px] overflow-y-auto no-scrollbar space-y-3 flex flex-col justify-end">
          <div className="space-y-2">
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={msg.id} 
                className="flex items-start gap-2 w-fit max-w-[85%]"
              >
                <img 
                  src={msg.avatar} 
                  alt={msg.user} 
                  className="w-5 h-5 rounded-full border border-white/20"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black tracking-tight text-white/60">{msg.user}</span>
                  <p className="text-[10px] font-medium leading-tight">{msg.comment}</p>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex items-center justify-between gap-4 max-w-sm mx-auto w-full relative">
          {/* More Menu */}
          <AnimatePresence>
            {showMoreMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full right-0 mb-4 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              >
                <button 
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
                  onClick={() => navigate('/external-stream')}
                >
                  <ExternalLink className="w-4 h-4 mt-0.5 text-white/60" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">External Stream</span>
                    <span className="text-[9px] text-white/40 font-medium leading-tight">Connect OBS or Twitch</span>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowConfirmEnd(true)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            End Stream
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleCamera}
              className={cn(
                "p-3 rounded-full transition-colors",
                isCameraOff ? "bg-blue-500/20 text-blue-500" : "hover:bg-white/10"
              )}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button 
              onClick={toggleMic}
              className={cn(
                "p-3 rounded-full transition-colors",
                isMicMuted ? "bg-blue-500/20 text-blue-500" : "hover:bg-white/10"
              )}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                "p-3 rounded-full transition-colors",
                showMoreMenu ? 'bg-white/20' : 'hover:bg-white/10'
              )}
            >
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmEnd && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmEnd(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl space-y-8 flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                <AlertTriangle className="w-8 h-8 text-blue-500" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">End Stream?</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed">
                  Are you sure you want to end your broadcast? Your audience will be disconnected.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => navigate(-1)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Confirm End
                </button>
                <button 
                  onClick={() => setShowConfirmEnd(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                >
                  Keep Streaming
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
