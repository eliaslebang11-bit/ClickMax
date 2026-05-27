import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Video,
  Camera,
  Radio,
  Settings2,
  Lock,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useUser } from "../context/UserContext";

export default function LiveStreamSetup() {
  const navigate = useNavigate();
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
    const followers = Number(user.followers || 0);
    if (followers < 1000) {
      navigate('/add-content');
      return;
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleGoStreaming = () => {
    navigate("/live-stream");
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col text-white overflow-hidden font-sans">
      {/* Camera Preview Background */}
      <div className="absolute inset-0 z-0">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900 z-20">
            <Camera className="w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-xl font-bold mb-2">Camera Blocked</h3>
            <p className="text-sm text-white/60 mb-8 max-w-[240px]">
              Please allow camera access to preview your broadcast.
            </p>
            <button 
              onClick={startCamera}
              className="px-8 py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
            
            {/* Ambient Purple Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-purple-500/5 mix-blend-overlay pointer-events-none" />
          </>
        )}
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 bg-purple-600/20 backdrop-blur-xl px-4 py-2 rounded-full border border-purple-500/30">
          <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Streaming Setup</span>
        </div>
        <button className="p-2.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
          <Settings2 className="w-6 h-6" />
        </button>
      </div>

      {/* Center Layout for Title etc */}
      <div className="flex-1 relative z-10 flex flex-col justify-end px-6 pb-12">
        <div className="max-w-xs mx-auto w-full">
          {/* Stream Settings Card */}
          <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-5 shadow-2xl flex flex-col items-center">
            <button 
              onClick={handleGoStreaming}
              className="w-full relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-[0_10px_25px_rgba(147,51,234,0.3)] transition-transform group-hover:scale-[1.02]" />
              <div className="relative py-4 px-6 flex items-center justify-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Go Streaming</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
