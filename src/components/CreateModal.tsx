import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Upload as UploadIcon, 
  X, 
  FileVideo, 
  CheckCircle2, 
  Loader2, 
  Image as ImageIcon, 
  Plus, 
  Radio, 
  Camera, 
  Video as VideoIcon,
  RefreshCw,
  Sparkles,
  Wand2,
  Settings,
  Heart,
  Trophy,
  Star,
  Home as HomeIcon,
  Mic,
  Gamepad2,
  Target,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabaseService } from "../services/supabaseService";
import { useUser } from "../context/UserContext";
import { compressVideo } from "../lib/videoCompressor";

const MOCK_CAMERA_ROLL = [
  "https://picsum.photos/seed/vid1/400/300",
  "https://picsum.photos/seed/vid2/400/300",
  "https://picsum.photos/seed/vid3/400/300",
  "https://picsum.photos/seed/vid4/400/300",
  "https://picsum.photos/seed/vid5/400/300",
  "https://picsum.photos/seed/vid6/400/300",
];

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateModal({ isOpen, onClose }: CreateModalProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'live' | 'short'>('video');
  const [file, setFile] = useState<File | null>(null);
  const [selectedMockVideo, setSelectedMockVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("Analyzing and re-encoding video...");
  const [step, setStep] = useState<'select' | 'details' | 'uploading' | 'complete'>('select');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  
  // Live stream state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [liveMode, setLiveMode] = useState<'camera' | 'voice' | 'gaming'>('camera');
  const [liveTitle, setLiveTitle] = useState("");
  const [cameraError, setCameraError] = useState("");

  const navigate = useNavigate();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setActiveTab('video');
      setFile(null);
      setSelectedMockVideo(null);
      setTitle("");
      setDescription("");
      setThumbnail(null);
      setThumbnailPreview(null);
      setIsLive(false);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Handle camera for Live tab
  useEffect(() => {
    if ((!isOpen || activeTab !== 'live') && stream) {
      stopCamera();
    }
    return () => {
      if (stream) stopCamera();
    };
  }, [activeTab, isOpen]);

  const startCamera = async () => {
    try {
      setCameraError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  const handleTabSwitch = (tab: 'video' | 'live' | 'short') => {
    setActiveTab(tab);
    if (tab === 'live' && !stream) {
      startCamera();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsLive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      setStep('details');
    } else {
      alert("Please select a valid video file.");
    }
  };

  const handleMockVideoSelect = (url: string, index: number) => {
    setSelectedMockVideo(url);
    setTitle(`My Awesome Video ${index + 1}`);
    setStep('details');
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setThumbnail(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const startUpload = async () => {
    if (!file && !selectedMockVideo) return;
    
    setStep('uploading');
    setUploading(true);
    setProgress(0);
    setUploadMessage("Initializing re-encoder engine...");

    try {
      let finalVideoUrl = "";
      let finalThumbnail = thumbnailPreview || "";
      const isShort = activeTab === 'short';

      if (file) {
        // 1. Compress video file prior to uploading
        let compressedFile = file;
        try {
          compressedFile = await compressVideo(file, (compPct) => {
            setProgress(compPct);
            setUploadMessage(`Compressing & Re-encoding: ${compPct}%`);
          });
        } catch (comError) {
          console.warn('[CREATE-MODAL] Compression error - using original file:', comError);
        }

        setProgress(0);
        setUploadMessage("Readying cloud storage pipeline...");

        // 2. Real upload to Supabase Storage of compressed file
        const fileUrl = await supabaseService.uploadFile(compressedFile, isShort ? 'short' : 'video', (p) => {
          setProgress(p);
          setUploadMessage(`Uploading to Supabase Storage: ${p}%`);
        });
        
        if (!fileUrl) throw new Error("Upload failed to store file in Supabase Storage.");
        finalVideoUrl = fileUrl;
        
        if (!finalThumbnail) {
          finalThumbnail = "https://picsum.photos/seed/thumb/800/450";
        }
      } else if (selectedMockVideo) {
        // Fallback or Mock handling
        finalVideoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
        finalThumbnail = selectedMockVideo;
        setProgress(100);
      }

      // Save to Supabase (Either as Video or Short)
      let success = false;
      if (isShort) {
        success = await supabaseService.insertShort({
          videoUrl: finalVideoUrl,
          description: description || title || "",
          creator: "", // Backend will populate
          avatar: ""   // Backend will populate
        });
      } else {
        success = await supabaseService.insertVideo({
          title: title || "Untitled Video",
          description: description || "",
          videoUrl: finalVideoUrl,
          thumbnail: finalThumbnail,
          duration: "0:00",
          category: "Entertainment",
          isLive: false
        });
      }

      if (!success) throw new Error("Database failed to save video record. Are you logged in?");

      setUploading(false);
      setStep('complete');
      
      setTimeout(() => {
        onClose();
        if (isShort) navigate('/shorts');
        else navigate('/');
      }, 1500);
    } catch (error: any) {
      console.error("[CREATE-UPLOAD] Detailed error:", error);
      alert("Upload failed. Please try again.");
      setStep('details');
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-brand-surface border border-brand-border sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header & Tabs */}
        <div className="border-b border-brand-border flex-shrink-0">
          <div className="p-4 md:p-6 flex items-center justify-between">
            <h1 className="text-xl font-bold">Create</h1>
            <button onClick={onClose} className="p-2 hover:bg-brand-text/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {step === 'select' && (
            <div className="flex px-6 gap-6">
              <button 
                onClick={() => handleTabSwitch('video')}
                className={cn(
                  "pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                  activeTab === 'video' 
                    ? "border-brand-text text-brand-text" 
                    : "border-transparent text-brand-muted hover:text-brand-text"
                )}
              >
                <VideoIcon className="w-4 h-4" />
                Video
              </button>
              <button 
                onClick={() => handleTabSwitch('short')}
                className={cn(
                  "pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                  activeTab === 'short' 
                    ? "border-[#FF0050] text-[#FF0050]" 
                    : "border-transparent text-brand-muted hover:text-brand-text"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Short
              </button>
              <button 
                onClick={() => handleTabSwitch('live')}
                className={cn(
                  "pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors",
                  activeTab === 'live' 
                    ? "border-blue-500 text-blue-500" 
                    : "border-transparent text-brand-muted hover:text-brand-text"
                )}
              >
                <Radio className="w-4 h-4" />
                Live
              </button>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1 no-scrollbar">
          <AnimatePresence mode="wait">
            {/* VIDEO/SHORT TAB - SELECT STEP */}
            {step === 'select' && (activeTab === 'video' || activeTab === 'short') && (
              <motion.div 
                key="video-select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{activeTab === 'video' ? 'Your Videos' : 'Your Shorts'}</h2>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-brand-text text-brand-bg rounded-full font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <UploadIcon className="w-4 h-4" />
                    Browse Files
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="video/*" 
                    className="hidden" 
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                  {MOCK_CAMERA_ROLL.map((url, i) => (
                    <div 
                      key={i}
                      onClick={() => handleMockVideoSelect(url, i)}
                      className="aspect-[3/4] md:aspect-video bg-brand-bg rounded-xl overflow-hidden relative group cursor-pointer border border-brand-border"
                    >
                      <img src={url} alt={`Video ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold text-white">
                        0:{15 + i * 12}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* LIVE TAB */}
            {step === 'select' && activeTab === 'live' && (
              <motion.div 
                key="live-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative -m-6 md:-m-8 h-[70vh] md:h-[75vh] bg-black overflow-hidden"
              >
                {/* Camera Preview Background */}
                <div className="absolute inset-0">
                  {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-muted space-y-4 p-6 text-center bg-brand-bg z-20">
                      <Camera className="w-12 h-12 text-white/20 mb-2" />
                      <h3 className="text-lg font-bold">Camera Blocked</h3>
                      <p className="text-[11px] text-white/50 max-w-[200px]">
                        Please click "Allow" in your browser or open in a new tab to fix.
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-[180px]">
                        <button 
                          onClick={startCamera}
                          className="w-full py-2 bg-white text-black rounded-full font-bold text-xs hover:scale-105 transition-transform"
                        >
                          Try Again
                        </button>
                        <button 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="w-full py-2 bg-white/10 text-white rounded-full font-bold text-xs hover:bg-white/20 transition-colors"
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  ) : (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  )}
                  {/* Dark Overlay for UI readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                </div>

                {/* Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/10">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white/90">LIVE Rewards: Complete missions!</span>
                      <ChevronRight className="w-3 h-3 text-white/50" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white/20 transition-colors">
                      <HomeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Center Content - Live Status */}
                {isLive && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-blue-500 px-4 py-1 rounded-full flex items-center gap-2 animate-pulse shadow-lg shadow-blue-500/20">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live</span>
                    </div>
                  </div>
                )}

                {/* Setup Controls - Only visible when NOT live */}
                {!isLive && (
                  <div className="absolute inset-x-0 bottom-0 p-6 space-y-6 z-10">
                    {/* Quick Actions Grid removed */}

                    {/* Setup Panel */}
                    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 relative">
                      <div className="absolute top-4 right-4">
                      </div>
                      
                      <div className="pt-2">
                        {Number(user.followers || 0) < 1000 ? (
                          <div className="space-y-4">
                            <button 
                              disabled
                              className="w-full py-4 bg-white/10 text-white/20 rounded-2xl font-bold text-lg cursor-not-allowed border border-white/5"
                            >
                              1,000 Followers Required
                            </button>
                            <p className="text-[11px] text-center font-bold text-white/20 uppercase tracking-widest">
                              You need {1000 - Number(user.followers || 0)} more followers to go live
                            </p>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              onClose();
                              navigate('/live-talk', { state: { title: "Live Stream", mode: liveMode, isStarting: true } });
                            }}
                            disabled={!!cameraError || !stream}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                          >
                            Go LIVE
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex items-center justify-center gap-8 pb-2">
                      {[
                        { id: 'voice', icon: Mic, label: "Voice chat" },
                        { id: 'camera', icon: Camera, label: "Device camera" },
                        { id: 'gaming', icon: Gamepad2, label: "Mobile gaming" },
                      ].map((mode) => (
                        <button 
                          key={mode.id}
                          onClick={() => setLiveMode(mode.id as any)}
                          className={cn(
                            "flex items-center gap-2 transition-all",
                            liveMode === mode.id ? "text-white scale-110" : "text-white/40 hover:text-white/60"
                          )}
                        >
                          <mode.icon className="w-4 h-4" />
                          <span className="text-[11px] font-bold whitespace-nowrap">{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Controls - Only visible when LIVE */}
                {isLive && (
                  <div className="absolute inset-x-0 bottom-10 p-6 flex justify-center z-10">
                    <button 
                      onClick={() => setShowEndConfirm(true)}
                      className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold hover:bg-blue-500 transition-all"
                    >
                      End Stream
                    </button>
                  </div>
                )}
                
                {/* End Confirmation Overlay */}
                <AnimatePresence>
                  {showEndConfirm && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowEndConfirm(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-xs bg-zinc-900 border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-6 text-center"
                      >
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold">End stream?</h3>
                          <p className="text-sm text-white/40">Are you sure you want to end your broadcast?</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              setIsLive(false);
                              setShowEndConfirm(false);
                            }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                          >
                            End Stream
                          </button>
                          <button 
                            onClick={() => setShowEndConfirm(false)}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* DETAILS STEP */}
            {step === 'details' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-brand-muted font-bold uppercase tracking-wider">Video Preview</label>
                    <div className="aspect-video bg-brand-bg rounded-2xl flex flex-col items-center justify-center border border-brand-border relative overflow-hidden">
                      {selectedMockVideo ? (
                        <img src={selectedMockVideo} alt="Preview" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <>
                          <FileVideo className="w-12 h-12 text-brand-muted mb-2" />
                          <p className="text-xs text-brand-muted">{file?.name}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-brand-muted font-bold uppercase tracking-wider">Thumbnail</label>
                      <span className="text-[10px] text-brand-muted">Optional</span>
                    </div>
                    <div 
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="aspect-video bg-brand-bg rounded-2xl flex flex-col items-center justify-center border border-brand-border hover:border-brand-text/30 transition-colors cursor-pointer relative group overflow-hidden"
                    >
                      {thumbnailPreview ? (
                        <>
                          <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-brand-muted mb-2" />
                          <p className="text-xs text-brand-muted">Upload a frame or cover</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={thumbnailInputRef} 
                      onChange={handleThumbnailSelect} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-brand-muted font-bold uppercase tracking-wider">Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your masterpiece a name"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-text/30 transition-all text-brand-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-brand-muted font-bold uppercase tracking-wider">Description</label>
                    <textarea 
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell the story behind the frames..."
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-text/30 transition-all resize-none text-brand-text"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        setStep('select');
                        setFile(null);
                        setSelectedMockVideo(null);
                      }}
                      className="flex-1 py-3 border border-brand-border rounded-full font-bold text-sm hover:bg-brand-text/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={startUpload}
                      className="flex-[2] py-3 bg-brand-text text-brand-bg rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      Publish Video
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* UPLOADING STEP */}
            {step === 'uploading' && (
              <motion.div 
                key="uploading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-12 space-y-8"
              >
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      className="text-brand-border stroke-current" 
                      strokeWidth="8" 
                      fill="transparent" 
                      r="40" 
                      cx="50" 
                      cy="50" 
                    />
                    <circle 
                      className="text-brand-text stroke-current transition-all duration-300" 
                      strokeWidth="8" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * progress) / 100}
                      strokeLinecap="round" 
                      fill="transparent" 
                      r="40" 
                      cx="50" 
                      cy="50" 
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">{Math.round(progress)}%</span>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">{uploadMessage}</h2>
                  <p className="text-sm text-brand-muted">Please keep this window open while we compress and publish your content.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-muted font-bold">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Optimal mobile codec encoding</span>
                </div>
              </motion.div>
            )}

            {/* COMPLETE STEP */}
            {step === 'complete' && (
              <motion.div 
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Upload Complete!</h2>
                  <p className="text-sm text-brand-muted">Your video is now live. Redirecting to your dashboard...</p>
                </div>
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/me');
                  }}
                  className="px-8 py-3 bg-brand-text text-brand-bg rounded-full font-bold text-sm"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
