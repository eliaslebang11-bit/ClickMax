import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Wand2, 
  Sparkles,
  Video,
  Camera
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

import { useVideoStats } from "../context/VideoContext";
import { useUser } from "../context/UserContext";

export default function LiveSetup() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { setIsLive } = useVideoStats();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

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

  const handleGoLive = () => {
    setIsLive(true);
    navigate("/live-talk", { state: { isLive: true, title: "Live Stream" } });
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
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </>
        )}
      </div>

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Center Content - Removed text */}
      <div className="flex-1 relative z-10" />

      {/* Action Buttons (Right Side) removed */}

      {/* Bottom Controls */}
      <div className="relative z-10 px-4 pb-8">
        {/* Title Card */}
        <div className="max-w-sm mx-auto w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[24px] p-4 space-y-4 relative">
          <div className="absolute top-4 right-4">
          </div>
          
          <div className="pt-2">
            <button 
              onClick={handleGoLive}
              className="w-full py-3.5 bg-gradient-to-r from-[#ff0050] to-[#ff2d55] rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-[0_8px_20px_rgba(255,0,80,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Go LIVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
