import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Video, 
  Radio, 
  Music2, 
  RefreshCw, 
  Zap, 
  Clock, 
  Layout as LayoutIcon, 
  ChevronDown, 
  UserPlus2, 
  Maximize2,
  Image as ImageIcon,
  Camera,
  ArrowLeft,
  Play,
  Check,
  Type as TypeIcon,
  Pencil,
  Plus
} from "lucide-react";
import { cn } from "../lib/utils";
import { useVideoStats } from "../context/VideoContext";
import { useUser } from "../context/UserContext";
import { supabaseService } from "../services/supabaseService";
import { motion, AnimatePresence } from "motion/react";
import { formatDuration } from "../lib/utils";

const TABS = ["Video", "Short", "Live", "Stream"];

const GALLERY_VIDEOS: any[] = [];

function VideoPreviewOverlay({ 
  video, 
  onClose, 
  onNext 
}: { 
  video: typeof GALLERY_VIDEOS[0], 
  onClose: () => void, 
  onNext: (v: typeof GALLERY_VIDEOS[0]) => void 
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onLoadedMetadata = () => setDuration(v.duration);

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 bg-black z-[120] flex flex-col"
    >
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-50">
        <button 
          onClick={onClose}
          className="p-3 active:scale-95 transition-transform"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video 
          ref={videoRef}
          src={video.videoUrl}
          autoPlay
          loop
          playsInline
          className="w-full h-auto max-h-[75vh] object-contain"
        />
      </div>

      {/* Bottom Controls */}
      <div className="px-6 pb-4 flex flex-col gap-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        {/* Seeker */}
        <div className="space-y-3">
          <div className="relative h-6 flex items-center group cursor-pointer">
            {/* Background Line */}
            <div className="absolute left-0 right-0 h-[1px] bg-white/20 rounded-full overflow-hidden">
               <div 
                className="absolute h-full bg-white transition-all duration-100" 
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
              />
            </div>
            
            {/* Invisible Range Input for scrubbing */}
            <input 
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={(e) => {
                const time = parseFloat(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = time;
                setCurrentTime(time);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {/* Draggable Dot */}
            <div 
              className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white] pointer-events-none"
              style={{ left: `${(currentTime / (duration || 1)) * 100}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-white/50 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{video.duration}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pb-4">
          <button 
            onClick={() => onNext(video)}
            className="px-8 py-2.5 bg-white text-black rounded-full font-black text-[13px] hover:bg-white/90 active:scale-95 transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PostDetailsOverlay({ 
  video, 
  onClose, 
  onPost 
}: { 
  video: typeof GALLERY_VIDEOS[0], 
  onClose: () => void, 
  onPost: () => void 
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [thumbnail, setThumbnail] = useState(video.thumbnail);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const { user, session } = useUser();
  const { refreshData } = useVideoStats();

  const handlePost = async () => {
    if (!session) {
      alert("Please sign in to post content");
      return;
    }

    if (!title && video.type !== "Short") {
      alert("Please enter a title");
      return;
    }

    setIsPosting(true);
    
    try {
      const isShort = video.type === "Short";
      let finalVideoUrl = video.videoUrl;
      let finalThumbnailUrl = thumbnail;

      console.log(`[POST] Starting post process for ${isShort ? 'Short' : 'Video'}`);

      // 1. Prepare uploads
      const uploadTasks: Promise<void>[] = [];

      if (finalVideoUrl.startsWith('blob:')) {
        uploadTasks.push((async () => {
          console.log("[POST] Uploading video blob...");
          const response = await fetch(video.videoUrl);
          const blob = await response.blob();
          const file = new File([blob], `${isShort ? 'short' : 'video'}-${Date.now()}.mp4`, { type: 'video/mp4' });
          
          const url = await supabaseService.uploadFile(file, 'video', (p) => {
            console.log(`[UPLOAD] Video: ${p}%`);
          });
          
          if (!url) throw new Error("Video upload failed");
          finalVideoUrl = url;
          console.log("[POST] Video upload success");
        })());
      }

      if (finalThumbnailUrl.startsWith('blob:')) {
        uploadTasks.push((async () => {
          console.log("[POST] Uploading thumbnail blob...");
          const response = await fetch(thumbnail);
          const blob = await response.blob();
          const file = new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const url = await supabaseService.uploadFile(file, 'image', (p) => {
            console.log(`[UPLOAD] Thumbnail: ${p}%`);
          });
          
          if (url) {
            finalThumbnailUrl = url;
            console.log("[POST] Thumbnail upload success");
          }
        })());
      }

      // 2. Wait for all uploads to finish
      await Promise.all(uploadTasks);

      // 3. Save to Supabase via backend
      let success = false;
      console.log("[POST] Saving metadata to Supabase...");

      if (isShort) {
        success = await supabaseService.insertShort({
          videoUrl: finalVideoUrl,
          creator: user.username,
          avatar: user.avatar,
          description: description || title,
          isLive: false
        });
      } else {
        success = await supabaseService.insertVideo({
          title: title || "Untitled Video",
          thumbnail: finalThumbnailUrl,
          videoUrl: finalVideoUrl,
          channelName: user.username,
          channelAvatar: user.avatar,
          description: description,
          duration: video.duration,
          isLive: false
        });
      }

      if (success) {
        console.log("[POST] Post successful! Refreshing data...");
        await refreshData();
        onPost();
      } else {
        throw new Error("Failed to save metadata to Supabase");
      }
    } catch (error: any) {
      console.error("Error posting:", error);
      alert("An error occurred while posting: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-black z-[130] flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-base font-black uppercase tracking-tight">Create Post</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Thumbnail and Title Section */}
        <div className="flex gap-4 items-start">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Thumbnail</label>
            <div 
              onClick={() => thumbInputRef.current?.click()}
              className="w-32 aspect-[3/4] rounded-xl overflow-hidden bg-white/5 relative group cursor-pointer border border-white/10"
            >
              <img 
                src={thumbnail} 
                alt="Thumbnail" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Persistent Edit Indicator */}
              <div className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-lg group-hover:bg-white group-hover:text-black transition-all">
                <Pencil className="w-3 h-3" />
              </div>

              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="w-6 h-6 text-white mb-1" />
                <span className="text-[10px] font-bold uppercase">Change</span>
              </div>
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold">
                {video.duration}
              </div>
            </div>
          </div>
          <input 
            type="file" 
            ref={thumbInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setThumbnail(URL.createObjectURL(file));
            }}
          />

          <div className="flex-1 space-y-3">
             <div className="space-y-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Title</label>
               <input 
                 type="text"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="Main title of your video"
                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
               />
             </div>
          </div>
        </div>

        {/* Caption Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Caption</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell your viewers more about this video..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20 resize-none"
          />
        </div>
      </div>

      {/* Post Button */}
      <div className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/5">
        <button 
          onClick={handlePost}
          disabled={isPosting}
          className={cn(
            "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3",
            isPosting 
              ? "bg-white/10 text-white/40 cursor-not-allowed" 
              : "bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
          )}
        >
          {isPosting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Post Video
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function AddContent() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { setIsLive } = useVideoStats();
  const [activeTab, setActiveTab] = useState("Video");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isSwitching, setIsSwitching] = useState(false);
  const [localVideos, setLocalVideos] = useState<any[]>([]);
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<any | null>(null);
  const [showPostDetails, setShowPostDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initCamera = async () => {
      if (activeTab === "Short") {
        setCameraError(null);
        if (isMounted) await startCamera();
      } else {
        stopCamera();
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [activeTab, facingMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 600) { // 10 minutes limit
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    
    try {
      // Try with both audio and video first
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode }, 
        audio: true 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      console.warn("Camera + Audio failed, trying video only:", err);
      try {
        // Fallback to video only
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode } 
        });
        setStream(videoStream);
        if (videoRef.current) videoRef.current.srcObject = videoStream;
      } catch (videoErr: any) {
        console.error("Camera access failed:", videoErr);
        setCameraError("Permission denied");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (isRecording) stopRecording();
  };

  const startRecording = () => {
    if (!stream) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      console.log("Recording finished:", url);
      navigate('/video-editor', { state: { video: { thumbnail: url, duration: formatTime(recordingTime) } } });
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFlipCamera = () => {
    if (isSwitching) return;
    setIsSwitching(true);
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newVids = await Promise.all(Array.from(files).map(async (file, idx) => {
        const url = URL.createObjectURL(file);
        const isImage = file.type.startsWith('image/');
        let durationStr = isImage ? "IMAGE" : "0:00";

        if (!isImage) {
          durationStr = await new Promise<string>((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
              URL.revokeObjectURL(video.src);
              resolve(formatDuration(video.duration));
            };
            video.onerror = () => resolve("0:00");
            video.src = url;
          });
        }

        return {
          id: `local-${Date.now()}-${idx}`,
          thumbnail: url,
          videoUrl: url,
          duration: durationStr,
          type: activeTab === "Short" ? "Short" : "Video",
          isLocal: true,
          isImage,
          name: file.name
        };
      }));
      setLocalVideos(prev => [...newVids, ...prev]);
    }
  };

  const filteredGallery = localVideos.filter(v => {
    if (activeTab === "Live" || activeTab === "Short") return true;
    return v.type === activeTab;
  });

  const canGoLive = Number(user.followers || 0) >= 1000;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-4 px-4 py-4 border-b border-white/10 z-50",
        activeTab === "Short" && "border-none bg-transparent absolute top-0 left-0 right-0"
      )}>
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors group"
        >
          <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>
        {activeTab !== "Short" && <h1 className="text-xl font-bold tracking-tight">Add content</h1>}
        
        {/* Recording timer near X button */}
        {activeTab === "Short" && isRecording && (
          <div className="bg-blue-500 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/20 animate-in fade-in zoom-in duration-300">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-white tracking-widest uppercase">
              {formatTime(recordingTime)} / 10:00
            </span>
          </div>
        )}
      </div>

      {/* Gallery Content */}
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === "Short" ? (
          <div className="absolute inset-0 bg-black flex flex-col overflow-hidden">
            {/* Camera Preview */}
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-brand-bg z-20">
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
              <div className="absolute inset-0 bg-black">
                {isSwitching && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <RefreshCw className="w-12 h-12 text-white animate-spin" />
                  </div>
                )}
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                    isSwitching ? "opacity-0" : "opacity-100",
                    facingMode === "user" && "scale-x-[-1]"
                  )}
                />
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-6 flex flex-col items-center gap-8 bg-gradient-to-t from-black/60 to-transparent">
              {/* Record Button Area */}
              <div className="flex items-center justify-between w-full max-w-xs">
                <button 
                  onClick={handleFlipCamera}
                  className="w-12 h-12 rounded-full border-2 border-white/30 bg-black/20 backdrop-blur-md flex items-center justify-center group active:scale-90 transition-transform"
                >
                  <RefreshCw className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500" />
                </button>

                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className="relative w-20 h-20 flex items-center justify-center group"
                >
                  <div className={cn(
                    "absolute inset-0 rounded-full border-4 border-white transition-all duration-300",
                    isRecording ? "scale-125 border-blue-500" : "group-hover:scale-110"
                  )} />
                  <div className={cn(
                    "rounded-full transition-all duration-300",
                    isRecording 
                      ? "w-8 h-8 bg-blue-500 rounded-sm" 
                      : "w-16 h-16 bg-white"
                  )} />
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-xl border-2 border-white/30 overflow-hidden bg-black/20 backdrop-blur-md flex items-center justify-center group active:scale-90 transition-transform"
                >
                  <ImageIcon className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "Live" ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-[100px] -z-10 animate-pulse delay-700" />

            <div className="space-y-3 max-w-xs">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">Go Live</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed">
                Connect with your audience in real-time
              </p>
            </div>

            <div className="w-full pt-4">
              <button 
                onClick={() => {
                  if (canGoLive) {
                    navigate('/live-setup');
                  }
                }}
                disabled={!canGoLive}
                className={cn(
                  "w-full group relative overflow-hidden py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)]",
                  canGoLive 
                    ? "bg-white text-black hover:scale-[1.02] active:scale-95" 
                    : "bg-white/10 text-white/20 cursor-not-allowed"
                )}
              >
                {canGoLive && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                <div className="flex items-center justify-center gap-3">
                  <Video className="w-4 h-4" />
                  {canGoLive ? "Go Live Now" : "1,000 Followers Required"}
                </div>
              </button>
              {!canGoLive && (
                <p className="mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  You need {1000 - Number(user.followers || 0)} more followers to unlock live features
                </p>
              )}
            </div>
          </div>
        ) : activeTab === "Stream" ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -z-10 animate-pulse delay-700" />

            <div className="space-y-3 max-w-xs">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">Broadcasting</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed">
                Start your professional streaming session
              </p>
            </div>

            <div className="w-full pt-4">
              <button 
                onClick={() => {
                  if (canGoLive) {
                    navigate('/live-stream-setup');
                  }
                }}
                disabled={!canGoLive}
                className={cn(
                  "w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3",
                  canGoLive
                    ? "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-95"
                    : "bg-white/5 border border-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                <Radio className={cn("w-4 h-4", canGoLive ? "text-white/60" : "text-white/10")} />
                {canGoLive ? "Live Stream" : "1,000 Followers Required"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[1px]">
            {/* User Requested: Browse for your files button */}
            <div className="p-4 bg-zinc-900 border-b border-white/5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-3 border border-white/10 group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Plus className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black uppercase tracking-widest text-white">Browse for your files</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase">Videos and images • 100MB Max</p>
                </div>
              </button>
            </div>

            {filteredGallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-[1px]">
                {/* Add More Cell */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer border-r border-b border-white/5 group"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                  </div>
                  <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40">Add</span>
                </div>

                {filteredGallery.map((video) => (
                  <div 
                    key={video.id} 
                    onClick={() => {
                      setSelectedGalleryVideo(video);
                    }}
                    className="aspect-[3/4] relative group cursor-pointer overflow-hidden bg-white/5"
                  >
                      {video.isImage ? (
                        <img 
                          src={video.thumbnail} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <video 
                          src={video.videoUrl} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {video.duration}
                      </span>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="py-20 flex flex-col items-center justify-center text-white/20 select-none cursor-pointer hover:bg-white/5 active:scale-95 transition-all"
              >
                <Video className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">No videos found</p>
                <p className="text-[10px] mt-2 font-bold opacity-50">Tap here to select from your phone</p>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedGalleryVideo && (
            <VideoPreviewOverlay 
              video={selectedGalleryVideo} 
              onClose={() => setSelectedGalleryVideo(null)} 
              onNext={(v) => setShowPostDetails(true)}
            />
          )}

          {showPostDetails && selectedGalleryVideo && (
            <PostDetailsOverlay 
              video={selectedGalleryVideo}
              onClose={() => setShowPostDetails(false)}
              onPost={() => navigate('/me', { state: { posted: true } })}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Shared Hidden File Input for browsing gallery */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
        accept="video/*,image/*"
        multiple
      />

      {/* Bottom Tabs */}
      <div className="pb-6 pt-3 px-4 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar bg-black/95 backdrop-blur-2xl border-t border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              // Stop camera when leaving camera-intensive tabs if we had them
            }}
            className={cn(
              "px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap rounded-full border",
              activeTab === tab 
                ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                : "text-white/50 border-transparent hover:text-white hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
