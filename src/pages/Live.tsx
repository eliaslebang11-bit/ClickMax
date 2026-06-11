import React, { useState, useRef, useEffect } from "react";
import { 
  Radio, 
  Users, 
  MessageCircle, 
  Heart, 
  Share2, 
  X, 
  Camera, 
  Image as ImageIcon, 
  StopCircle, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  MoreVertical,
  Music2,
  Send,
  Video,
  Gift,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
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

const HeartBurst = () => {
  const hearts = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {hearts.map((_, i) => {
        const angle = (i / hearts.length) * Math.PI * 2;
        const x = Math.cos(angle) * 200;
        const y = Math.sin(angle) * 200;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ 
              x: x + (Math.random() - 0.5) * 50, 
              y: y + (Math.random() - 0.5) * 50, 
              scale: [0, 1.5, 1],
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              delay: Math.random() * 0.5,
              ease: "easeOut"
            }}
            className="absolute text-4xl"
          >
            ❤️
          </motion.div>
        );
      })}
    </div>
  );
};

const GiftsPanel = ({ isOpen, onClose, onSend }: { isOpen: boolean, onClose: () => void, onSend?: (gift: any) => void }) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(0);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [view, setView] = useState<'gifts' | 'recharge'>('gifts');
  const [balance, setBalance] = useState(10);

  const coinPackages = [
    { id: 0, coins: 8, price: "1.00" },
    { id: 1, coins: 90, price: "20.00" },
    { id: 2, coins: 400, price: "85.90" },
    { id: 3, coins: 900, price: "110.00" },
    { id: 4, coins: 1400, price: "300.00" },
    { id: 5, coins: 3500, price: "600.00" },
    { id: 6, coins: 7000, price: "1100.00" },
    { id: 7, coins: 17500, price: "2100.00" },
  ];

  const handleBuyCoins = () => {
    if (selectedPackage !== null) {
      const pkg = coinPackages.find(p => p.id === selectedPackage);
      if (pkg) {
        setBalance(prev => prev + pkg.coins);
        setView('gifts');
        setSelectedPackage(null);
      }
    }
  };

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
            {/* Top Level Bar - Navigation Options */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setView('gifts')}
                  className={cn(
                    "text-xs font-bold pb-1 transition-colors",
                    view === 'gifts' ? "text-white border-b-2 border-cyan-500" : "text-white/40"
                  )}
                >
                  Gifts
                </button>
                <button className="text-xs font-bold text-white/40 pb-1">Dynamic</button>
                <button className="text-xs font-bold text-white/40 pb-1">Legendary</button>
                <button 
                  onClick={() => setView('recharge')}
                  className={cn(
                    "text-xs font-bold pb-1 transition-colors",
                    view === 'recharge' ? "text-white border-b-2 border-cyan-500" : "text-white/40"
                  )}
                >
                  Recharge
                </button>
              </div>
              {view === 'recharge' && (
                <button onClick={() => setView('gifts')} className="p-1 hover:bg-white/5 rounded-full">
                  <ChevronRight className="w-4 h-4 text-white/40 rotate-180" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {view === 'gifts' ? (
                <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-12">
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
                        {gift.icon === "DANCING" ? (
                          <div className="w-full h-full bg-white flex items-center justify-center">
                            <DancingIcon className="scale-150" color="black" />
                          </div>
                        ) : gift.icon.startsWith("http") ? (
                          <img 
                            src={gift.icon} 
                            alt={gift.name} 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-3xl">{gift.icon}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/60 text-center leading-tight line-clamp-1">{gift.name}</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full flex items-center justify-center text-[6px] text-black font-bold">Z</div>
                        <span className="text-[10px] font-bold">{gift.price}</span>
                      </div>
                      
                      {selectedGift === gift.id && (
                        <motion.div 
                          layoutId="send-btn"
                          className="absolute -bottom-8 left-0 right-0 z-10"
                        >
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
                <div className="space-y-3 pb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold">Select amount</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {coinPackages.map((pkg) => (
                      <button 
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg.id)}
                        className={cn(
                          "flex items-center justify-between p-3 bg-white/5 border rounded-xl transition-all group",
                          selectedPackage === pkg.id ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] text-black font-bold">Z</div>
                          <span className="text-sm font-bold">{pkg.coins}</span>
                        </div>
                        <span className={cn(
                          "text-xs font-bold transition-colors",
                          selectedPackage === pkg.id ? "text-white" : "text-cyan-400 group-hover:text-cyan-300"
                        )}>ZAR {pkg.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Nav */}
            <div className="p-3 border-t border-white/5 grid grid-cols-3 items-center bg-[#161616]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/60">Balance:</span>
                <div className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold">Z</div>
                <span className="text-xs font-bold">{balance}</span>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={() => {
                    if (view === 'recharge') {
                      handleBuyCoins();
                    } else {
                      setView('recharge');
                    }
                  }}
                  disabled={view === 'recharge' && selectedPackage === null}
                  className={cn(
                    "flex items-center gap-2 px-6 py-1.5 rounded-full transition-all",
                    view === 'recharge' && selectedPackage === null ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                  )}
                >
                  <span className="text-xs font-bold">{view === 'gifts' ? 'Buy coins' : 'Buy now'}</span>
                </button>
              </div>
              
              <div />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const LiveShort = ({ short, isActive, onExit }: { short: any, isActive: boolean, onExit: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toggleFollow, stats } = useVideoStats();
  const isFollowing = stats[short.creator]?.isFollowing;
  const [likes, setLikes] = useState(() => {
    if (!short.likes) return 0;
    const likesStr = String(short.likes).replace(/,/g, '');
    if (likesStr.includes('K')) {
      return parseFloat(likesStr.replace('K', '')) * 1000;
    }
    if (likesStr.includes('M')) {
      return parseFloat(likesStr.replace('M', '')) * 1000000;
    }
    return parseInt(likesStr) || 0;
  });
  const [floatingHearts, setFloatingHearts] = useState<{ id: number, x: number, y: number }[]>([]);
  const [showGiftsPanel, setShowGiftsPanel] = useState(false);
  const [activeGift, setActiveGift] = useState<{ icon: string, name: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ user: string, avatar: string, totalSpent: number }[]>([]);
  const topGifter = [...leaderboard].sort((a, b) => b.totalSpent - a.totalSpent)[0] || null;

  const [comments, setComments] = useState<any[]>([
    { id: 1, user: "Alex", msg: "This is fire! 🔥", avatar: "https://picsum.photos/seed/alex/100/100" },
    { id: 2, user: "Sarah", msg: "Love the vibes here", avatar: "https://picsum.photos/seed/sarah/100/100" },
    { id: 3, user: "Mike", msg: "Where is this?", avatar: "https://picsum.photos/seed/mike/100/100" }
  ]);

  const handleTapToLike = (e: React.MouseEvent) => {
    setLikes(prev => prev + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setFloatingHearts(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1000);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comments]);

  useEffect(() => {
    if (!isActive) return;
    const mockUsers = ["Emma", "Liam", "Olivia", "Noah", "Ava"];
    const mockMsgs = ["Wow!", "Love this", "So cool", "Great stream!", "Keep it up"];
    const interval = setInterval(() => {
      const newUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const newMsg = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
      setComments(prev => [
        ...prev.slice(-15),
        { id: Date.now(), user: newUser, msg: newMsg, avatar: `https://picsum.photos/seed/${newUser.toLowerCase()}/100/100` }
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  return (
    <div 
      className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleTapToLike}
    >
      <video
        id={`live-video-${short.id}`}
        ref={videoRef}
        src={short.videoUrl}
        className={cn(
          "h-full w-full pointer-events-none",
          short.isHorizontal ? "object-contain bg-black/40" : "object-cover"
        )}
        loop
        playsInline
        muted={!isActive}
      />
      
      {/* Immersive Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Top Overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 grid grid-cols-3 items-start z-20 pointer-events-none">
        {/* Left: Profile & Stats */}
        <div className="flex flex-col items-start gap-2 pointer-events-auto">
          {/* Compact Profile Box */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 p-1 pr-2 shadow-2xl">
            <Link to={`/profile/${short.creator}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
              {short.avatar ? (
                <img 
                  src={short.avatar} 
                  className="w-7 h-7 rounded-full border border-white/20 object-cover shrink-0" 
                  alt="" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/40" />
                </div>
              )}
              <span className="text-[12px] font-bold text-white leading-none truncate max-w-[80px]">
                {short.creator}
              </span>
            </Link>
            <button 
              onClick={() => toggleFollow(short.creator)}
              className={cn(
                "ml-1 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all active:scale-95 shrink-0 flex items-center justify-center min-w-[60px]",
                isFollowing 
                  ? "bg-white text-black" 
                  : "bg-[#FF0050] hover:bg-[#FF0050]/90 text-white"
              )}
            >
              {isFollowing ? <Check className="w-3 h-3" /> : "Follow"}
            </button>
          </div>

          {/* Stats Box */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 px-3 py-1.5 shadow-2xl">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#FF0050] fill-[#FF0050] shrink-0" />
              <span className="text-[11px] font-bold text-white tabular-nums leading-none">
                {likes >= 1000 ? `${(likes / 1000).toFixed(1)}K` : likes}
              </span>
            </div>
            <div className="w-[1px] h-3 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-white/70 shrink-0" />
              <span className="text-[11px] font-bold text-white tabular-nums leading-none">
                {short.views || "4.5K"}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Empty Space */}
        <div className="flex justify-center pointer-events-auto">
        </div>

        {/* Right: Exit Button */}
        <div className="flex justify-end pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); onExit(); }}
            className="p-2.5 bg-black/60 backdrop-blur-2xl border border-white/20 text-white rounded-full shadow-2xl hover:bg-white/10 hover:scale-110 active:scale-90 transition-all duration-300 group"
            title="Exit"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Live Chat Overlay */}
      <div id={`live-chat-${short.id}`} className="absolute left-3 bottom-24 z-10 pointer-events-auto w-64">
        <div 
          ref={chatContainerRef}
          className="flex flex-col gap-2 overflow-y-auto h-[160px] no-scrollbar"
        >
          <div className="flex flex-col gap-2 pb-4">
            <AnimatePresence initial={false}>
              {comments.map((chat) => {
                return (
                  <motion.div 
                    key={chat.id}
                    id={`live-comment-${chat.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                  >
                    <img 
                      src={chat.avatar} 
                      className="w-6 h-6 rounded-full shrink-0 object-cover" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-white/90">{chat.user}</span>
                      </div>
                      {chat.isGift ? (
                        <div className="mt-0.5 flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg backdrop-blur-md w-fit">
                          <Gift className="w-2.5 h-2.5 text-yellow-500" />
                          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">gift send {chat.giftName}</span>
                          <span className="text-sm">{chat.giftIcon}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-white/80 font-medium">{chat.msg}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="absolute bottom-6 left-0 right-0 px-3 z-20 pointer-events-auto">
        <div className="flex items-end gap-2 max-w-md mx-auto">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Say something nice..." 
              className="w-full bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl pl-5 pr-12 py-3 text-[13px] text-white placeholder:text-white/50 focus:outline-none shadow-xl"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/70 hover:text-white transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setShowGiftsPanel(true)}
            className="flex flex-col items-center justify-center w-[46px] h-[46px] bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white shadow-xl group active:scale-95 transition-all shrink-0"
          >
            <Gift className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </button>
          <button className="flex flex-col items-center justify-center gap-0.5 w-[46px] h-[46px] bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-white shadow-xl group active:scale-95 transition-all shrink-0">
            <div className="relative">
              <Video className="w-4 h-4 text-white/90" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-black flex items-center justify-center">
                <Plus className="w-1 h-1 text-white" />
              </div>
            </div>
            <span className="text-[7px] font-black uppercase tracking-widest text-white/70">Request</span>
          </button>
        </div>
      </div>

      {/* Floating Hearts Container */}
      <AnimatePresence>
        {floatingHearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, scale: 0.5, y: heart.y - 16, x: heart.x - 16 }}
            animate={{ opacity: 0, scale: 1.5, y: heart.y - 160, x: heart.x + (Math.random() * 80 - 40) }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 z-50 pointer-events-none"
          >
            <Heart className="w-8 h-8 text-[#FF0050] fill-[#FF0050]" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Gift Animation Overlay */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 100 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -100 }}
            className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 relative">
              {activeGift.name === "Spark" && <HeartBurst />}
              <motion.div 
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-9xl filter drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              >
                {activeGift.icon}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GiftsPanel 
        isOpen={showGiftsPanel} 
        onClose={() => setShowGiftsPanel(false)} 
        onSend={(gift) => {
          setShowGiftsPanel(false);
          setActiveGift(gift);
          setTimeout(() => setActiveGift(null), 3000);
          
          // Add message to chat
          const newMsg = {
            id: Date.now(),
            user: "Eliaslebang11",
            msg: "gift send",
            avatar: "https://picsum.photos/seed/elias/100/100",
            isGift: true,
            giftName: gift.name,
            giftIcon: gift.icon
          };
          setComments(prev => [...prev, newMsg]);
        }}
      />
    </div>
  );
};

export default function Live() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsFullScreen, shorts, homeVideos } = useVideoStats();
  
  const liveShorts = (shorts || []).filter(s => s.isLive);
  const liveVideos = (homeVideos || []).filter(v => v.isLive).map(v => ({
    id: v.id,
    videoUrl: v.videoUrl,
    creator: v.channelName,
    avatar: v.channelAvatar,
    description: v.title,
    likes: v.likes,
    views: v.views,
    isLive: true,
    isHorizontal: true
  }));

  const allLive = [...liveShorts, ...liveVideos];
  
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFullScreen(true);
    return () => setIsFullScreen(false);
  }, [setIsFullScreen]);

  // Handle direct navigation to a specific live stream if provided in state
  useEffect(() => {
    if (location.state?.activeId && allLive.length > 0) {
      const idx = allLive.findIndex(s => s.id === location.state.activeId);
      if (idx !== -1) {
        setActiveIndex(idx);
        setTimeout(() => {
          if (containerRef.current) {
            const height = containerRef.current.clientHeight;
            containerRef.current.scrollTo({ top: idx * height, behavior: 'auto' });
          }
        }, 100);
      }
    }
  }, [location.state?.activeId, allLive.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPos = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollPos / height);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  if (allLive.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0f0f0f] z-[100] flex flex-col items-center justify-center text-white p-8">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 ring-4 ring-white/5">
          <Radio className="w-10 h-10 text-brand-muted animate-pulse" />
        </div>
        <h2 className="text-2xl font-black mb-3">No one is live right now</h2>
        <p className="text-white/50 text-center max-w-xs mb-8 leading-relaxed">
          Check back later to see your favorite creators streaming live content!
        </p>
        <button 
          onClick={() => navigate(location.state?.from || '/')}
          className="px-8 py-3 bg-white text-black rounded-full font-black text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 relative overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {allLive.map((short, index) => (
          <div key={short.id} className="h-full w-full snap-start snap-always shrink-0">
            <LiveShort 
              short={short} 
              isActive={index === activeIndex} 
              onExit={() => {
                if (location.state?.from) {
                  navigate(location.state.from);
                } else {
                  navigate(-1);
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
