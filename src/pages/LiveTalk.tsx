import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  X,
  ArrowLeft,
  Users, 
  Music2,
  ChevronRight,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShoppingBag,
  LogOut,
  Clock,
  Pin,
  Send,
  Type,
  UserMinus,
  Ban,
  MoreHorizontal,
  Heart,
  Gift,
  TrendingUp,
  History,
  Calendar,
  Trophy,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface Message {
  id: string;
  user: string;
  text: string;
  isSystem?: boolean;
  isHost?: boolean;
}

const FlipCameraIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Circular arrows */}
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export default function LiveTalk() {
  const navigate = useNavigate();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isGiftsSheetOpen, setIsGiftsSheetOpen] = useState(false);
  const [isEndConfirmationOpen, setIsEndConfirmationOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [hostInput, setHostInput] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const blockedUsersRef = useRef<string[]>([]);

  useEffect(() => {
    blockedUsersRef.current = blockedUsers;
  }, [blockedUsers]);
  
  // Stream Settings States
  const [slowMode, setSlowMode] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      user: "System",
      text: "Welcome to the live chat! Remember to be respectful.",
      isSystem: true
    },
    {
      id: "2",
      user: "Tony Faraday",
      text: "massive growth,join the family let's grow",
      isHost: true
    },
    {
      id: "3",
      user: "Sarah Jenkins",
      text: "Love the energy in here! 🔥"
    },
    {
      id: "4",
      user: "Mike Ross",
      text: "How do I join the growth program?"
    },
    {
      id: "5",
      user: "Elena Rodriguez",
      text: "Just joined! Hello everyone 👋"
    },
    {
      id: "6",
      user: "David Chen",
      text: "The tips from last session were amazing."
    },
    {
      id: "7",
      user: "Tony Faraday",
      text: "Glad you liked them David! More coming today.",
      isHost: true
    }
  ]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    isMounted.current = true;
    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Media devices not supported");
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode }, 
          audio: true 
        });
        if (!isMounted.current) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraError(null);
      } catch (err) {
        if (!isMounted.current) return;
        console.error("Camera access failed:", err);
        setCameraError(err instanceof Error ? err.message : "Permission denied");
      }
    }

    if (!isCameraOff) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      isMounted.current = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOff, facingMode]);

  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMicMuted;
      });
    }
  }, [isMicMuted, stream]);

  useEffect(() => {
    const simulatedMessages = [
      "This is so helpful! 🙌",
      "Can you explain that last part again?",
      "Checking in from London! 🇬🇧",
      "Let's goooo! 🚀",
      "Best live stream of the week.",
      "I've been waiting for this all day!",
      "Who else is new here?"
    ];

    const users = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley"];

    const interval = setInterval(() => {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      if (blockedUsersRef.current.includes(randomUser)) return;

      const randomText = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];
      
      const newMessage: Message = {
        id: Date.now().toString(),
        user: randomUser,
        text: randomText
      };

      setMessages(prev => [...prev.slice(-20), newMessage]); // Keep last 20 messages
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const creatorOptions = [
    { 
      icon: LogOut, 
      label: "End Live Stream", 
      color: "text-blue-500",
      action: () => navigate("/")
    },
    { 
      icon: Clock, 
      label: slowMode ? "Disable Slow Mode" : "Enable Slow Mode",
      action: () => {
        setSlowMode(!slowMode);
        showToast(slowMode ? "Slow Mode Disabled" : "Slow Mode Enabled");
      }
    },
    { 
      icon: FlipCameraIcon, 
      label: "Flip Camera", 
      action: () => {
        setFacingMode(prev => prev === "user" ? "environment" : "user");
        showToast(`Switched to ${facingMode === "user" ? "back" : "front"} camera`);
      }
    },
  ];

  const viewerOptions = [
    { 
      icon: UserMinus, 
      label: "Remove Viewer", 
      color: "text-red-500",
      action: () => showToast(`${selectedUser} removed from stream`)
    },
    { 
      icon: Ban, 
      label: "Block User", 
      color: "text-red-500",
      action: () => {
        if (selectedUser) {
          setBlockedUsers(prev => [...prev, selectedUser]);
          setMessages(prev => prev.filter(m => m.user !== selectedUser));
          showToast(`${selectedUser} has been blocked`);
        }
      }
    },
    { 
      icon: Pin, 
      label: "Pin Message",
      action: () => {
        const msg = messages.find(m => m.id === selectedMessageId);
        if (msg) {
          setPinnedMessage(msg);
          showToast("Message Pinned");
        }
      }
    },
  ];

  return (
    <div className="fixed inset-0 bg-[#0f0f0f] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Image/Video Placeholder */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          {cameraError ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-10 px-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                <VideoOff className="w-10 h-10 text-blue-500/50" />
              </div>
              <h4 className="text-white font-bold mb-1">Camera Access Failed</h4>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                {cameraError === "Permission denied" 
                  ? "Please enable camera permissions in your browser to start the live stream." 
                  : cameraError}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors"
              >
                Retry
              </button>
            </motion.div>
          ) : isCameraOff ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-10"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                <VideoOff className="w-10 h-10 text-white/20" />
              </div>
              <p className="text-white/40 font-medium tracking-tight">Camera is paused</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              {!stream && (
                <img 
                  src="https://picsum.photos/seed/livebg/1080/1920" 
                  alt="Background" 
                  className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
                  referrerPolicy="no-referrer"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-20" />
      </div>

      {/* Top Header */}
      <div className="absolute top-3 inset-x-0 px-4 z-30 pointer-events-none flex flex-col gap-2.5">
        {/* Row 1: Host & Stats */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Host Info */}
          <div className="bg-black/40 backdrop-blur-xl rounded-full pl-0.5 pr-3 py-0.5 flex items-center gap-2 border border-white/10 shadow-lg shrink-0 overflow-hidden max-w-[140px]">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 shrink-0">
              <img 
                src="https://picsum.photos/seed/tony/100/100" 
                alt="Host" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold leading-none tracking-tight truncate">Tony Faraday</span>
            </div>
            <ChevronRight className="w-3 h-3 text-white/30 ml-1 shrink-0" />
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-1.5">
            {/* Viewer Count */}
            <div className="bg-black/40 backdrop-blur-xl rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10 shadow-lg h-7.5">
              <Users className="w-3 h-3 text-white" />
              <span className="text-[11px] font-bold tracking-tight">1.2K</span>
            </div>
            
            {/* Likes Count */}
            <div className="bg-black/40 backdrop-blur-xl rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10 shadow-lg h-7.5">
              <Heart className="w-3 h-3 text-white fill-white/20" />
              <span className="text-[11px] font-bold tracking-tight">0</span>
            </div>
          </div>
        </div>

        {/* Row 2: Pinned Message (On its own row below) */}
        <div className="pointer-events-auto">
          <AnimatePresence>
            {pinnedMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-2 flex items-center gap-2 shadow-xl relative group max-w-[85%] overflow-hidden"
              >
                <Pin className="w-3 h-3 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[10px] text-white font-bold leading-tight truncate">{pinnedMessage.text}</p>
                </div>
                <button 
                  onClick={() => setPinnedMessage(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
                >
                  <X className="w-2.5 h-2.5 text-white/60" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Overlay Section */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-none">
        {/* Chat Area */}
        <div className="px-4 pb-1 flex flex-col pointer-events-auto">
          {/* Chat Area */}
          <div className="max-h-[25vh] overflow-y-auto no-scrollbar space-y-2 pb-2">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className="flex items-start gap-2 max-w-[85%] cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => {
                  if (!msg.isSystem && !msg.isHost) {
                    setSelectedUser(msg.user);
                    setSelectedMessageId(msg.id);
                    setIsMoreMenuOpen(true);
                  }
                }}
              >
                {msg.isSystem ? (
                  <div className="flex items-start gap-2 bg-black/30 backdrop-blur-md rounded-xl p-2 border border-white/10 shadow-lg">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                      <Music2 className="w-2.5 h-2.5 text-white/80" />
                    </div>
                    <p className="text-[11px] text-white/90 leading-relaxed font-medium">
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img 
                        src={msg.isHost ? "https://picsum.photos/seed/tony/100/100" : `https://picsum.photos/seed/${msg.user}/100/100`} 
                        alt="User" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
                        <span className={cn(
                          "text-[11px] font-bold tracking-tight truncate max-w-[120px]",
                          msg.isHost ? "text-yellow-400" : "text-white/60"
                        )}>
                          {msg.user}
                        </span>
                        {msg.isHost && (
                          <span className="bg-zinc-800 text-white text-[8px] font-bold px-1 py-0.5 rounded border border-white/10 uppercase tracking-tighter">Host</span>
                        )}
                      </div>
                      <p className="text-[12px] text-white font-medium leading-snug drop-shadow-md">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Bottom Controls Row */}
        <div className="relative z-20 px-4 pb-4 pt-4 flex items-center justify-between gap-3 pointer-events-auto">
          <button 
            onClick={() => setIsEndConfirmationOpen(true)}
            aria-label="End Live Stream"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-colors shadow-lg active:scale-95 shrink-0"
          >
            End Live
          </button>

          <div className="flex items-center gap-2.5">
            {/* Mic Toggle */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)}
                aria-label={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                className={cn(
                  "w-10 h-10 backdrop-blur-xl rounded-full flex items-center justify-center border shadow-lg transition-all active:scale-90",
                  isMicMuted 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-500" 
                    : "bg-black/40 border-white/10 text-white hover:bg-white/10"
                )}
              >
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Mic</span>
            </div>

            {/* Camera Toggle */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => setIsCameraOff(!isCameraOff)}
                aria-label={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                className={cn(
                  "w-10 h-10 backdrop-blur-xl rounded-full flex items-center justify-center border shadow-lg transition-all active:scale-90",
                  isCameraOff 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-500" 
                    : "bg-black/40 border-white/10 text-white hover:bg-white/10"
                )}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Video</span>
            </div>

            {/* Gifts Button */}
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => setIsGiftsSheetOpen(true)}
                aria-label="Send Gifts"
                className="w-10 h-10 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 shadow-lg hover:bg-white/10 transition-colors active:scale-90"
              >
                <ShoppingBag className="w-5 h-5 text-white" />
              </button>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Gifts</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={() => {
                  setSelectedUser(null);
                  setIsMoreMenuOpen(true);
                }}
                aria-label="More Options"
                className="w-10 h-10 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 shadow-lg hover:bg-white/10 transition-colors active:scale-90"
              >
                <MoreHorizontal className="w-6 h-6 text-white" />
              </button>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Menu */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-[32px] z-50 h-auto max-h-[60vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Handle */}
              <div className="w-full flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

          {/* Header */}
          <div className="px-6 py-2 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight text-center flex-1">
              {selectedUser ? `Manage ${selectedUser}` : "Stream Options"}
            </h3>
          </div>

          {/* Options List */}
          <div className="px-4 py-6 no-scrollbar">
            {!selectedUser && (
              <div className="mb-8">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 shadow-sm">
                  <input
                    type="text"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hostInput.trim()) {
                        const newMessage: Message = {
                          id: Date.now().toString(),
                          user: "Tony Faraday",
                          text: hostInput,
                          isHost: true
                        };
                        setMessages(prev => [...prev, newMessage]);
                        setHostInput("");
                        setIsMoreMenuOpen(false);
                        showToast("Message sent to chat");
                      }
                    }}
                    placeholder="Type a message as host..."
                    className="flex-1 bg-transparent border-none text-white text-sm px-3 py-1.5 focus:outline-none placeholder:text-white/30"
                  />
                  <button
                    disabled={!hostInput.trim()}
                    onClick={() => {
                      const newMessage: Message = {
                        id: Date.now().toString(),
                        user: "Tony Faraday",
                        text: hostInput,
                        isHost: true
                      };
                      setMessages(prev => [...prev, newMessage]);
                      setHostInput("");
                      setIsMoreMenuOpen(false);
                      showToast("Message sent to chat");
                    }}
                    className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center disabled:opacity-50 transition-all active:scale-90"
                  >
                    <Send className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {(selectedUser ? viewerOptions : creatorOptions).map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (option.action) option.action();
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 transition-all active:scale-90 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-white/10 transition-colors">
                    <option.icon className={cn("w-6 h-6", option.color || "text-white")} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-tight text-center leading-tight uppercase px-1",
                    option.color || "text-white/70"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

              {/* Footer / Close */}
              <div className="px-4 pb-8 pt-2">
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="w-full py-3.5 bg-white/5 rounded-2xl text-sm font-bold tracking-tight hover:bg-white/10 transition-colors active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gifts Sheet */}
      <AnimatePresence>
        {isGiftsSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGiftsSheetOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-[32px] z-[110] h-[70vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="w-full flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              
              <div className="px-6 py-2 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold tracking-tight text-center flex-1">Received Gifts</h3>
                <button onClick={() => setIsGiftsSheetOpen(false)} className="p-1 hover:bg-white/5 rounded-full">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 rounded-[24px] p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Trophy className="w-16 h-16 text-yellow-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-yellow-500 mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Total Earnings</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tighter">1,116</span>
                      <span className="text-xs font-bold text-white/60">Coins</span>
                    </div>
                  </div>
                </div>

                {/* Gifts List */}
                <div className="space-y-3">
                  {[
                    { id: "1", name: "Rose", sender: "Alex", time: "2m ago", value: 1, icon: "🌹" },
                    { id: "2", name: "Diamond", sender: "Jordan", time: "15m ago", value: 100, icon: "💎" },
                    { id: "3", name: "Heart", sender: "Taylor", time: "1h ago", value: 10, icon: "❤️" },
                    { id: "4", name: "Star", sender: "Morgan", time: "2h ago", value: 5, icon: "⭐" },
                    { id: "5", name: "Crown", sender: "Casey", time: "Yesterday", value: 500, icon: "👑" },
                    { id: "6", name: "Rocket", sender: "Riley", time: "2 days ago", value: 1000, icon: "🚀" }
                  ].map((gift) => (
                    <div key={gift.id} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">
                        {gift.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-bold text-xs truncate">{gift.name}</h3>
                          <span className="text-[10px] font-bold text-yellow-500">+{gift.value}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-white/40 truncate">from {gift.sender}</p>
                          <span className="text-[9px] text-white/20">{gift.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-24 left-1/2 z-[100] bg-white/90 backdrop-blur-md text-black px-4 py-1.5 rounded-full font-bold text-[11px] shadow-xl whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Live Confirmation Dialog */}
      <AnimatePresence>
        {isEndConfirmationOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEndConfirmationOpen(false)}
              className="fixed inset-0 bg-black/80 z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm bg-zinc-900 border border-white/10 rounded-[32px] p-8 z-[120] shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                <LogOut className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">End Live Stream?</h2>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                Are you sure you want to end your live stream? Your viewers will be disconnected.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => {
                    if (stream) {
                      stream.getTracks().forEach(track => track.stop());
                    }
                    navigate("/");
                  }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
                >
                  End Stream
                </button>
                <button
                  onClick={() => setIsEndConfirmationOpen(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
