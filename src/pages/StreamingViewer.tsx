import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Heart, 
  Share2, 
  X, 
  MessageSquare, 
  ArrowLeft,
  ChevronRight, 
  User,
  Radio,
  Users,
  Gift,
  Send,
  MoreHorizontal,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedCounter from "../components/AnimatedCounter";
import { cn, formatRelativeTime } from "../lib/utils";
import CustomVideoPlayer from "../components/CustomVideoPlayer";
import { useVideoStats } from "../context/VideoContext";

const DancingIcon = ({ className, color = "white" }: { className?: string, color?: string }) => {
  return (
    <div className={cn("flex items-end gap-0.5 h-4", className)}>
      <motion.div 
        animate={{ height: ["40%", "100%", "40%"] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        className="w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <motion.div 
        animate={{ height: ["60%", "30%", "60%"] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        className="w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <motion.div 
        animate={{ height: ["100%", "50%", "100%"] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

const GiftsPanel = ({ isOpen, onClose, onSend }: { isOpen: boolean, onClose: () => void, onSend?: (gift: any) => void }) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(0);
  const [view, setView] = useState<'gifts' | 'recharge'>('gifts');
  const [balance, setBalance] = useState(10);

  const gifts = [
    { id: 0, name: "Diamond", price: 1, icon: "💎" },
    { id: 1, name: "Phoenix", price: 2, icon: "🐦‍🔥" },
    { id: 2, name: "Spark", price: 2, icon: "🫶" },
    { id: 3, name: "Crown", price: 3, icon: "👑" },
    { id: 4, name: "Vibe", price: 1, icon: "😎" },
    { id: 7, name: "Treasure", price: 5, icon: "🪎" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[300]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[50vh] bg-[#1e1e1e] rounded-t-2xl z-[301] flex flex-col overflow-hidden text-white"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setView('gifts')}
                  className={cn("text-xs font-bold pb-1 transition-colors", view === 'gifts' ? "text-white border-b-2 border-cyan-500" : "text-white/40")}
                >
                  Gifts
                </button>
                <button onClick={() => setView('recharge')} className={cn("text-xs font-bold pb-1 transition-colors", view === 'recharge' ? "text-white border-b-2 border-cyan-500" : "text-white/40")}>
                  Recharge
                </button>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {view === 'gifts' ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-y-6 gap-x-2 pb-12">
                  {gifts.map((gift) => (
                    <div
                      key={gift.id}
                      onClick={() => setSelectedGift(gift.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-1 rounded-xl transition-all relative cursor-pointer",
                        selectedGift === gift.id ? "bg-white/5 ring-1 ring-white/10" : "hover:bg-white/5"
                      )}
                    >
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
                        <span className="text-3xl">{gift.icon}</span>
                      </div>
                      <span className="text-[10px] text-white/60 text-center leading-tight line-clamp-1">{gift.name}</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full flex items-center justify-center text-[6px] text-black font-bold">Z</div>
                        <span className="text-[10px] font-bold">{gift.price}</span>
                      </div>
                      
                      {selectedGift === gift.id && (
                        <motion.div layoutId="send-btn" className="absolute -bottom-8 left-0 right-0 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSend && selectedGift !== null) {
                                onSend(gifts.find(g => g.id === selectedGift));
                              }
                            }}
                            className="w-full py-1.5 bg-cyan-600 text-white text-[10px] font-bold rounded-lg shadow-lg"
                          >
                            Send
                          </button>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-white/40">Recharge feature coming soon</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/5 flex items-center justify-between bg-[#161616]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/60">Balance:</span>
                <div className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold">Z</div>
                <span className="text-xs font-bold">{balance}</span>
              </div>
              <button 
                onClick={() => setView('recharge')}
                className="px-6 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all text-xs font-bold"
              >
                Buy coins
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function StreamingViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { stats, incrementView, toggleFollow, setIsFullScreen, homeVideos } = useVideoStats();
  const video = homeVideos.find(v => v.id === id);
  const videoStat = id ? stats[id] : null;

  const [comments, setComments] = useState<any[]>([
    { id: 1, user: "Alex", msg: "This is fire! 🔥", avatar: "https://picsum.photos/seed/alex/100/100" },
    { id: 2, user: "Sarah", msg: "Love the vibes here", avatar: "https://picsum.photos/seed/sarah/100/100" },
    { id: 3, user: "Mike", msg: "Where is this?", avatar: "https://picsum.photos/seed/mike/100/100" }
  ]);
  const [showGiftsPanel, setShowGiftsPanel] = useState(false);
  const [activeGift, setActiveGift] = useState<any | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFullScreen(true);
    return () => setIsFullScreen(false);
  }, [setIsFullScreen]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comments]);

  useEffect(() => {
    const mockUsers = ["Emma", "Liam", "Olivia", "Noah", "Ava"];
    const mockMsgs = ["Wow!", "Love this", "So cool", "Great stream!", "Keep it up"];
    const interval = setInterval(() => {
      const newUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const newMsg = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
      setComments(prev => [
        ...prev.slice(-15),
        { id: Date.now(), user: newUser, msg: newMsg, avatar: `https://picsum.photos/seed/${newUser.toLowerCase()}/100/100` }
      ]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-2xl font-bold">Stream not found</h2>
        <Link to="/" className="text-brand-muted hover:text-white underline underline-offset-4">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col md:flex-row text-white overflow-hidden pt-4">
      {/* Video Area */}
      <div className="flex-1 relative bg-black">
        <CustomVideoPlayer 
          src={video.videoUrl} 
          poster={video.thumbnail}
          autoPlay={true}
        />
        
        {/* Top Info Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
             <button 
                onClick={() => navigate(-1)}
                className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-3 py-1.5 shadow-lg">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  <img src={video.channelAvatar} alt={video.channelName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-none">{video.channelName}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-red-500">LIVE</span>
                  </div>
                </div>
              </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
              <span className="text-xs font-mono font-black text-white">{video.views}</span>
            </div>
          </div>
        </div>

        {/* Gift Animation */}
        <AnimatePresence>
          {activeGift && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 100 }}
              animate={{ scale: [0, 1.2, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: -100 }}
              className="absolute inset-0 flex items-center justify-center z-[150] pointer-events-none"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div 
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-9xl filter drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                >
                  {activeGift.icon}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar Chat & Gifts - Desktop */}
      <div className="w-full h-[65vh] md:h-full md:w-[320px] lg:w-[400px] flex flex-col bg-[#0f0f0f] border-l border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-muted" />
              Live Chat
            </h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/10">
              <Users className="w-3 h-3 text-brand-muted" />
              <span className="text-xs font-mono font-bold text-white/80">{video.views}</span>
            </div>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-full">
            <MoreHorizontal className="w-5 h-5 text-brand-muted" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5 no-scrollbar"
        >
          {comments.map((chat) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={chat.id} 
              className="flex items-start gap-3 py-1 border-b border-white/[0.02]"
            >
              <img src={chat.avatar} className="w-7 h-7 rounded-full shrink-0 border border-white/5" alt="" referrerPolicy="no-referrer" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-white/30">{chat.user}</span>
                {chat.isGift ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{chat.giftIcon}</span>
                    <span className="text-[10px] font-bold text-cyan-500 uppercase">Sent a gift</span>
                  </div>
                ) : (
                  <p className="text-[13px] font-medium text-white/80 leading-tight">{chat.msg}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chat Input & Gifts */}
        <div className="p-4 border-t border-white/5 space-y-4 bg-[#0f0f0f] shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Say something..." 
                className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-brand-text/20 transition-all font-medium"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-brand-muted hover:text-white-text">
                <Send className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={() => setShowGiftsPanel(true)}
              className="w-12 h-12 bg-cyan-600/10 border border-cyan-600/20 rounded-full flex items-center justify-center text-cyan-500 hover:bg-cyan-600/20 transition-all active:scale-95 shadow-lg shadow-cyan-600/5 group"
            >
              <Gift className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <GiftsPanel 
        isOpen={showGiftsPanel} 
        onClose={() => setShowGiftsPanel(false)} 
        onSend={(gift) => {
          setShowGiftsPanel(false);
          setActiveGift(gift);
          setTimeout(() => setActiveGift(null), 3000);
          
          const newMsg = {
            id: Date.now(),
            user: "Me",
            msg: "gift send",
            avatar: "https://picsum.photos/seed/me/100/100",
            isGift: true,
            giftName: gift.name,
            giftIcon: gift.icon
          };
          setComments(prev => [...prev, newMsg]);
        }}
      />
    </div>
  );
}
