import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  X, 
  Music, 
  Sticker, 
  Type, 
  Edit3, 
  Volume2, 
  Play, 
  Pause,
  Image as ImageIcon,
  AtSign,
  Send,
  Globe
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function VideoEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoData = location.state?.video || { 
    thumbnail: "https://picsum.photos/seed/edit/1080/1920", 
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: "1:30" 
  };
  
  const [caption, setCaption] = useState("");
  const [trimStart, setTrimStart] = useState(10); // percentage 0-100
  const [trimEnd, setTrimEnd] = useState(90); // percentage 0-100
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Parse total duration to seconds
  const totalSeconds = (() => {
    if (!videoData.duration || typeof videoData.duration !== 'string' || videoData.duration === 'STREAMING') {
      return 90; // Default to 1:30 for streaming or missing durations
    }
    const parts = videoData.duration.split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : (parts[0] || 90);
  })();

  // Generate real frames from the video for the timeline
  useEffect(() => {
    if (!videoData.videoUrl || !totalSeconds || totalSeconds <= 0) return;

    const generateFrames = async () => {
      const frames: string[] = [];
      const frameCount = 12;
      const tempVideo = document.createElement("video");
      tempVideo.src = videoData.videoUrl;
      tempVideo.crossOrigin = "anonymous";
      tempVideo.muted = true;
      
      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 160;
      canvas.height = 90;

      for (let i = 0; i < frameCount; i++) {
        const time = (totalSeconds / frameCount) * i;
        tempVideo.currentTime = time;
        await new Promise((resolve) => {
          tempVideo.onseeked = resolve;
        });
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL("image/jpeg", 0.7));
        }
      }
      setVideoFrames(frames);
    };

    generateFrames().catch(err => console.error("Error generating frames:", err));
  }, [videoData.videoUrl, totalSeconds]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startSeconds = (totalSeconds * trimStart) / 100;
  const endSeconds = (totalSeconds * trimEnd) / 100;

  useEffect(() => {
    if (videoRef.current && isMetadataLoaded) {
      videoRef.current.currentTime = startSeconds;
    }
  }, [trimStart, isMetadataLoaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isMetadataLoaded) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= endSeconds) {
        video.currentTime = startSeconds;
        if (isPlaying) video.play().catch(() => {});
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [startSeconds, endSeconds, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const MOCK_FRAMES = videoFrames.length > 0 ? videoFrames : Array.from({ length: 12 }).map((_, i) => (
    `https://picsum.photos/seed/thumb${i}/100/100`
  ));

  const handlePan = (event: any, info: any, type: 'start' | 'end') => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((info.point.x - rect.left) / rect.width) * 100));

    if (type === 'start') {
      setTrimStart(Math.min(percentage, trimEnd - 2));
    } else {
      setTrimEnd(Math.max(percentage, trimStart + 2));
    }
  };

  const handlePost = () => {
    navigate('/me', { state: { posted: true } });
  };

  // Calculate progress within the CURRENT cut (0 to 1)
  const currentProgress = (currentTime - startSeconds) / (endSeconds - startSeconds || 1);

  return (
    <div className="fixed inset-0 bg-black z-[120] flex flex-col text-white font-sans overflow-hidden">
      {/* Background Video Preview */}
      <div className="absolute inset-0 z-0 bg-neutral-900">
        <video 
          key={videoData.videoUrl || "default"}
          ref={videoRef}
          src={videoData.videoUrl || "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
          poster={videoData.thumbnail}
          className="w-full h-full object-cover opacity-80"
          playsInline
          muted
          loop
          onLoadedMetadata={() => setIsMetadataLoaded(true)}
          onError={(e) => console.error("Video loading error:", e)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />
      </div>

      {/* Top Controls Overlay */}
      <div className="relative z-10 flex flex-col gap-3 px-4 pt-4 pb-2">
        {/* Buttons & Timeline Row */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex-shrink-0 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Thumbnail Strip / Timeline Container */}
          <div 
            ref={timelineRef}
            className="relative flex-1 h-12 bg-black/40 backdrop-blur-md rounded-xl select-none"
          >
            {/* Visual Background Thumbnails (Colored) */}
            <div className="absolute inset-0 flex gap-[0.5px] rounded-xl overflow-hidden opacity-40">
              {MOCK_FRAMES.map((url, i) => (
                <div key={i} className="flex-1 h-full">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            {/* The "White Thing" (Selected Range Box) */}
            <div 
              className="absolute top-0 bottom-0 border-y-[2.5px] border-white z-20 pointer-events-none"
              style={{ 
                left: `${trimStart}%`, 
                right: `${100 - trimEnd}%`,
              }}
            >
              {/* Internal frames for the selected area */}
              <div className="absolute inset-0 flex gap-[0.5px] overflow-hidden">
                 {MOCK_FRAMES.map((url, i) => (
                  <div 
                    key={i} 
                    className="h-full flex-shrink-0"
                    style={{ width: `${100 / MOCK_FRAMES.length}%` }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-white/5" />
            </div>

            {/* Draggable Handles (OnPan only to prevent displacement) */}
            <motion.div 
              onPan={(e, info) => handlePan(e, info, 'start')}
              className="absolute top-[-2px] bottom-[-2px] w-5 -ml-2.5 z-40 cursor-ew-resize flex items-center justify-center pointer-events-auto"
              style={{ left: `${trimStart}%` }}
            >
              <div className="w-full h-full bg-white rounded-l-lg shadow-2xl flex items-center justify-center border-y border-l border-white/30">
                <div className="w-[1.5px] h-4 bg-black/20 rounded-full" />
              </div>
            </motion.div>

            <motion.div 
              onPan={(e, info) => handlePan(e, info, 'end')}
              className="absolute top-[-2px] bottom-[-2px] w-5 -mr-2.5 z-40 cursor-ew-resize flex items-center justify-center pointer-events-auto"
              style={{ left: `${trimEnd}%` }}
            >
              <div className="w-full h-full bg-white rounded-r-lg shadow-2xl flex items-center justify-center border-y border-r border-white/30">
                <div className="w-[1.5px] h-4 bg-black/20 rounded-full" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Info Area Row */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10">
            <Volume2 className="w-3.5 h-3.5 text-white/80" />
          </div>
          <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
            <span className="text-[10px] font-bold tracking-tight text-white/90">0:00 • 3.0 MB</span>
          </div>
        </div>
      </div>

      {/* Center Play Button Overlay */}
      <div className="flex-1 flex items-center justify-center relative z-10 pointer-events-none">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="w-20 h-20 bg-black/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group pointer-events-auto"
        >
          {isPlaying ? (
            <Pause className="w-10 h-10 text-white fill-white group-hover:scale-110 transition-transform" />
          ) : (
            <Play className="w-10 h-10 text-white fill-white group-hover:scale-110 transition-transform ml-1" />
          )}
        </motion.button>
      </div>

      {/* Bottom Interface: Progress Line & Controls */}
      <div className="relative z-30 mt-auto bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
        {/* Active Cut Progress Line */}
        <div className="px-6 mb-4">
          <div className="h-[2px] w-full bg-white/20 rounded-full relative">
            <div className="absolute inset-0 bg-white/10 rounded-full" />
            
            {/* Playhead indicator dot moving across the cut */}
            <div 
              className="absolute top-[-4px] w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-30 transition-all duration-100 ease-linear"
              style={{ 
                left: `${Math.min(100, Math.max(0, currentProgress * 100))}%`,
                transform: 'translateX(-50%)' 
              }}
            />

            {/* Actual progress fill */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-white/40 rounded-full transition-all duration-100 ease-linear" 
              style={{ width: `${Math.min(100, Math.max(0, currentProgress * 100))}%` }}
            />
          </div>

          <div className="flex justify-between mt-2 px-0.5">
            <span className="text-[10px] font-bold text-white/90">
              {formatTime(startSeconds)}
            </span>
            <span className="text-[10px] font-bold text-white/90">
              {formatTime(endSeconds)}
            </span>
          </div>
        </div>

        {/* Caption & Upload Row */}
        <div className="px-4 pb-8 flex items-center gap-3 w-full">
          <div className="flex-1 min-w-0 bg-white/10 backdrop-blur-3xl rounded-full border border-white/30 px-5 py-3.5 flex items-center gap-4 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)] relative group overflow-hidden">
            {/* Flashy animated glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            
            <AtSign className="w-5 h-5 text-white flex-shrink-0 drop-shadow-[0_0_8px_white]" />
            <input 
              type="text" 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add Caption"
              className="flex-1 min-w-0 bg-transparent text-[15px] font-black focus:outline-none placeholder:text-white text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] placeholder:opacity-100"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255,255,255,0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePost}
            className="flex-shrink-0 px-6 h-12 bg-white text-black font-bold text-sm rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.2)] transition-colors hover:bg-white/90"
          >
            Upload
          </motion.button>
        </div>
      </div>
    </div>
  );
}
