import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { ThumbsUp, MessageSquare, Music2, MoreVertical, X, Plus, Heart, Search, ArrowLeft, Info, Check, User, Loader2, SkipForward, Volume2, VolumeX, Menu, Grid, List, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Comments from "../components/Comments";
import AnimatedCounter from "../components/AnimatedCounter";
import TruncatedText from "../components/TruncatedText";
import { cn, parseCount, formatCount } from "../lib/utils";

import { useVideoStats } from "../context/VideoContext";
import { Short, ShortsAd } from "../types";
import { adService } from "../services/adService";
import { supabaseService } from "../services/supabaseService";

const AdCarousel = ({ images, interval = 3000, isActive }: { images: string[], interval?: number, isActive: boolean }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!isActive || images.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [isActive, images.length, interval]);

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex] || null}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="h-full w-full object-cover md:object-contain"
          alt={`Carousel ${currentIndex}`}
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      
      {/* Indicator Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
              )} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ShortAd = ({ 
  ad, 
  isActive, 
  isScrolling,
  index,
  activeIndex
}: { 
  ad: ShortsAd, 
  isActive: boolean, 
  isScrolling: boolean,
  index: number,
  activeIndex: number
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Ad specific mute
  const watchStartTime = useRef<number>(Date.now());
  const impressionsLogged = useRef(false);
  const [secondsRemaining, setSecondsRemaining] = useState(ad.skip_after_seconds || 15);
  const [canSkip, setCanSkip] = useState(false);
  const isUpcoming = index >= activeIndex - 1 && index <= activeIndex + 5;

  useEffect(() => {
    if (isActive && !impressionsLogged.current) {
      adService.logShortsEvent(ad.id, 'impression');
      impressionsLogged.current = true;
      watchStartTime.current = Date.now();
      
      const initialTimer = ad.skip_after_seconds !== undefined ? ad.skip_after_seconds : 15;
      setSecondsRemaining(initialTimer);
      setCanSkip(initialTimer <= 0);
      
      if (initialTimer > 0) {
        const timer = setInterval(() => {
          setSecondsRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanSkip(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    }

    if (!isActive && impressionsLogged.current) {
      const watchTime = Math.floor((Date.now() - watchStartTime.current) / 1000);
      adService.logShortsView(ad.id, {
        watch_time_seconds: watchTime,
        completed: false,
        skipped: watchTime < (ad.skip_after_seconds !== undefined ? ad.skip_after_seconds : 15)
      });
      impressionsLogged.current = false;
      setCanSkip(false);
    }
  }, [isActive, ad.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !isPaused && !isScrolling) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn("Ad autoplay was prevented:", e);
        });
      }
    } else {
      video.pause();
      if (!isActive) {
        video.currentTime = 0;
      }
    }
  }, [isActive, isPaused, isScrolling, ad.id]);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real snap feed, we'd trigger a scroll to the next item
    // For now, we rely on the user to scroll as "Skip" just unlocks the possibility or we could try to find the next element
    const container = document.querySelector('.snap-y');
    if (container) {
      container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative h-full w-full bg-black flex flex-col snap-start overflow-hidden">
      <div 
        className="relative h-full w-full flex items-center justify-center bg-black cursor-pointer"
        onClick={() => setIsPaused(!isPaused)}
      >
        {ad.ad_type === 'image_carousel' && ad.gallery_urls && ad.gallery_urls.length > 0 ? (
          <AdCarousel images={ad.gallery_urls} isActive={isActive} />
        ) : ad.ad_type === 'vertical_video' || ad.ad_type === 'video' ? (
            <video
              ref={videoRef}
              src={isUpcoming ? (ad.media_url || null) : null}
              className="h-full w-full object-cover md:object-contain"
              loop
              muted={!isActive || isMuted}
              playsInline
              preload={isUpcoming ? "auto" : "none"}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                adService.logShortsView(ad.id, {
                  watch_time_seconds: Math.floor((Date.now() - watchStartTime.current) / 1000),
                  completed: true,
                  skipped: false
                });
              }}
            />
        ) : (
          <img src={ad.media_url || null} className="h-full w-full object-cover md:object-contain" alt={ad.title} />
        )}

        {/* Skip Button */}
        {isActive && ad.skippable && (
          <div className="absolute top-20 right-4 z-50">
            {canSkip ? (
              <button 
                onClick={handleSkip}
                className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/20 text-white font-bold text-xs uppercase tracking-widest hover:bg-black/80 transition-all active:scale-95"
              >
                Skip Ad <SkipForward size={14} />
              </button>
            ) : (
              <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white/70 font-bold text-[10px] uppercase tracking-widest">
                Skip in {secondsRemaining}s
              </div>
            )}
          </div>
        )}

        {/* Buffering Indicator */}
        {isBuffering && (ad.ad_type === 'vertical_video' || ad.ad_type === 'video') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 text-white/30 animate-spin" />
          </div>
        )}

        {/* Ad Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 flex flex-col justify-end p-6 pb-20 pointer-events-none">
          <div className="space-y-4 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                Sponsored
              </span>
              {ad.profile_picture_url && (
                <div className="flex items-center gap-2 ml-1">
                  <img src={ad.profile_picture_url || null} className="w-5 h-5 rounded-full object-cover border border-white/20" />
                  <span className="text-xs font-bold text-white/90 drop-shadow-md">{ad.advertiser_name}</span>
                </div>
              )}
            </div>
            
            <div className="max-w-[85%]">
              <h3 className="text-xl font-black text-white drop-shadow-lg leading-tight">{ad.title}</h3>
              <p className="text-sm text-white/90 line-clamp-2 mt-1.5 drop-shadow-md font-medium">{ad.description}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a 
                href={ad.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  adService.logShortsEvent(ad.id, 'click');
                }}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-10 py-3.5 bg-white text-black rounded-xl font-black text-sm hover:bg-zinc-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-[0.98]"
              >
                {ad.cta_text || 'Learn More'}
              </a>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }}
                className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-black/60 transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentIconWithHoles = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    stroke="none" 
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="1.2" fill="black" />
    <circle cx="15" cy="10" r="1.2" fill="black" />
  </svg>
);

const ShortVideo = ({ 
  short, 
  isActive, 
  onCommentsToggle, 
  isScrolling,
  index,
  activeIndex
}: { 
  short: Short, 
  isActive: boolean, 
  onCommentsToggle: (isOpen: boolean) => void, 
  isScrolling: boolean,
  index: number,
  activeIndex: number
}) => {
  const { stats, toggleFollow, addToShortsHistory, isGlobalMuted, setIsGlobalMuted, incrementView, toggleLike, likedVideos } = useVideoStats();
  const isLiked = likedVideos.includes(short.id);
  const [justFollowed, setJustFollowed] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUpcoming = index >= activeIndex - 1 && index <= activeIndex + 5;

  const [exactCommentsCount, setExactCommentsCount] = useState<number>(() => parseCount(short.comments || 0));

  // 8 Seconds Watch View Tracking State/Refs
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const isScrollingRef = useRef(isScrolling);
  const shortIdRef = useRef(short.id);
  const viewTriggeredRef = useRef<string | null>(null);
  const cumulativeTimeRef = useRef<number>(0);
  const lastPosRef = useRef<number>(0);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isScrollingRef.current = isScrolling;
  }, [isScrolling]);

  useEffect(() => {
    shortIdRef.current = short.id;
  }, [short.id]);

  useEffect(() => {
    cumulativeTimeRef.current = 0;
    if (videoRef.current) {
      lastPosRef.current = videoRef.current.currentTime;
    }
  }, [isActive, short.id]);

  useEffect(() => {
    if (short.id) {
      supabaseService.getComments(undefined, short.id).then(data => {
        const calculateTotal = (list: any[]): number => {
          let c = 0;
          list.forEach(item => {
            c += 1;
            if (item.replies && item.replies.length > 0) {
              c += calculateTotal(item.replies);
            }
          });
          return c;
        };
        setExactCommentsCount(calculateTotal(data));
      }).catch(err => {
        console.error("Error loading shorts comments count:", err);
      });
    }
  }, [short.id]);

  useEffect(() => {
    setExactCommentsCount(parseCount(short.comments || 0));
  }, [short.comments]);

  const toggleComments = (val: boolean) => {
    setShowComments(val);
    onCommentsToggle(val);
  };

  // Check if subscribed to this creator
  const videoStat = stats[short.id] ? {
    views: stats[short.id].views || 0,
    likes: stats[short.id].likes || 0,
    isFollowing: !!stats[short.id].isFollowing,
    followers: stats[short.id].followers || 0
  } : {
    views: parseCount(short.views),
    likes: parseCount(short.likes || 0),
    isFollowing: false,
    followers: 0
  };

  const isFollowing = stats[short.creator]?.isFollowing;

  useEffect(() => {
    if (showComments) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.overscrollBehavior = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.overscrollBehavior = 'unset';
    };
  }, [showComments]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);
    const handleLoadStart = () => setIsBuffering(true);

    const handleTimeUpdate = () => {
      if (!isActiveRef.current || isPausedRef.current || isScrollingRef.current) return;
      const currentPos = video.currentTime;
      const delta = currentPos - lastPosRef.current;
      
      if (delta > 0 && delta < 1) {
        cumulativeTimeRef.current += delta;
        if (cumulativeTimeRef.current >= 8.0 && viewTriggeredRef.current !== shortIdRef.current) {
          viewTriggeredRef.current = shortIdRef.current;
          incrementView(shortIdRef.current);
        }
      }
      lastPosRef.current = currentPos;
    };

    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isGlobalMuted;
    }
  }, [isGlobalMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !isPaused && !isScrolling) {
      // Small delay to ensure browser readiness and avoid race conditions during fast scroll
      const playTimer = setTimeout(() => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Autoplay was prevented:", error);
          });
        }
      }, 80); // Slightly increased delay for stability

      addToShortsHistory(short.id);
      return () => {
        clearTimeout(playTimer);
      };
    } else {
      video.pause();
      if (!isActive) {
        // Essential: stop the previous video completely and reset it
        video.currentTime = 0;
        setIsPaused(false);
      }
    }
  }, [isActive, isPaused, isScrolling, short.id, isGlobalMuted]); // Added isGlobalMuted to dependency

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      if (!isLiked) toggleLike(short.id);
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 1000);
    } else {
      // Single tap potential
      tapTimeout.current = setTimeout(() => {
        setIsPaused(!isPaused);
        setShowPauseIcon(true);
        setTimeout(() => setShowPauseIcon(false), 500);
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  };

  return (
    <div 
      className={cn(
        "relative h-full w-full bg-black flex flex-col snap-start overflow-hidden",
        !showComments && "cursor-pointer"
      )}
      onClick={!showComments ? handleTap : undefined}
    >
      <div className={cn(
        "relative transition-all duration-500 ease-in-out flex items-center justify-center bg-black shrink-0",
        showComments ? "h-[30dvh] w-full touch-none" : "h-full w-full"
      )}>
        <video
          key={short.id}
          ref={videoRef}
          src={isUpcoming ? (short.videoUrl || null) : null}
          className={cn(
            "transition-all duration-500 ease-in-out",
            showComments ? "h-full w-auto object-contain" : "h-full w-full object-cover md:object-contain"
          )}
          loop
          muted={!isActive || isGlobalMuted}
          playsInline
          preload={isUpcoming ? "auto" : "none"}
          autoPlay={false}
        />

        {/* Loading Spinner Removed */}

        {/* Big Heart Animation */}
        <AnimatePresence>
          {showBigHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute z-50 pointer-events-none"
            >
              <Heart className="w-24 h-24 text-[#FE2C55] fill-current drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause/Play Icon Overlay */}
        <AnimatePresence>
          {showPauseIcon && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute z-50 pointer-events-none bg-black/20 p-6 rounded-full backdrop-blur-sm"
            >
              {isPaused ? (
                <div className="w-12 h-12 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2" />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center gap-2">
                  <div className="w-3 h-10 bg-white rounded-full" />
                  <div className="w-3 h-10 bg-white rounded-full" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Overlay Content - Only show when comments are NOT open */}
      <AnimatePresence>
        {!showComments && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: isScrolling ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90 flex flex-col justify-end p-4 md:p-6 pb-16 md:pb-10"
          >
            <div className="flex justify-between items-end gap-4">
              <div className="space-y-3 flex-1" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-1">
                  <Link to={`/profile/${short.creator}`} className="flex items-center gap-2 group">
                    <span className="text-base font-black text-white drop-shadow-lg group-hover:text-white/80 transition-colors">
                      {(short.creator || "").replace(/\s+/g, '').toLowerCase()}
                    </span>
                  </Link>
                </div>

                <div className="max-w-[85%]">
                  <TruncatedText 
                    text={short.isLive ? `LIVE: ${short.description}` : short.description}
                    maxLength={20}
                    className="text-[13px] text-white/95 drop-shadow-md leading-relaxed font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/10">
                    <Music2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-white/80 tracking-tight truncate max-w-[150px]">
                    Original Sound - {short.creator}
                  </span>
                </div>

                {/* Loading Line - Full Width */}
                {isBuffering && (
                  <div className="absolute bottom-16 md:bottom-10 left-0 right-0 h-[2px] bg-white/10 overflow-hidden z-50">
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "300%" }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-full w-1/3 bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                <div className="relative mb-2 block group">
                  <Link to={`/profile/${short.creator}`} id={`short-creator-link-${short.id}`}>
                    {short.avatar ? (
                      <img 
                        src={short.avatar} 
                        alt={short.creator} 
                        className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-300" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full border-2 border-white bg-brand-surface flex items-center justify-center font-black text-xs text-brand-text uppercase shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-all">
                        {short.creator?.charAt(0) || "U"}
                      </div>
                    )}
                  </Link>
                  <AnimatePresence>
                    {(!isFollowing || justFollowed) && (
                      <motion.button 
                        key="follow-button"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0, transition: { delay: 0.8 } }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isFollowing) {
                            setJustFollowed(true);
                            toggleFollow(short.creator);
                            setTimeout(() => {
                              setJustFollowed(false);
                            }, 1000);
                          }
                        }}
                        className={cn(
                          "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full p-1 shadow-lg border-2 border-zinc-950 transition-all duration-300",
                          isFollowing ? "bg-white text-blue-500" : "bg-blue-500 text-white"
                        )}
                      >
                        {isFollowing ? (
                          <Check className="w-4 h-4" strokeWidth={4} />
                        ) : (
                          <Plus className="w-4 h-4" strokeWidth={3.5} />
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(short.id);
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={cn(
                    "transition-all duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]",
                    isLiked ? "text-[#FE2C55] scale-110" : "text-white group-hover:scale-110"
                  )}>
                    <Heart className="w-7 h-7 fill-current" />
                  </div>
                  <span className="text-[11px] font-black text-white drop-shadow-lg tracking-tight">
                    <AnimatedCounter 
                      value={videoStat.likes} 
                      formatter={formatCount}
                    />
                  </span>
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComments(true);
                  }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="text-white group-hover:scale-110 transition-all drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                    <CommentIconWithHoles className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-black text-white drop-shadow-lg tracking-tight">
                    <AnimatedCounter 
                      value={exactCommentsCount} 
                      formatter={formatCount}
                    />
                  </span>
                </button>


                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center group"
                >
                  <div className="text-white group-hover:scale-110 transition-all drop-shadow-lg">
                    <MoreVertical className="w-6 h-6" />
                  </div>
                </button>

                <div className="relative mt-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/20 flex items-center justify-center animate-spin-slow overflow-hidden">
                    {short.avatar ? (
                      <img src={short.avatar} className="w-full h-full object-cover opacity-50" alt="music" />
                    ) : (
                      <span className="text-[10px] font-black text-white/40 uppercase">{short.creator?.charAt(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Panel - Now part of the flex layout when open */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "70dvh" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 w-full bg-brand-bg flex flex-col min-h-0 overflow-hidden border-t border-white/10 z-[60]"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white">Comments</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleComments(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative z-10 bg-brand-bg overflow-hidden touch-auto">
              <Comments shortId={short.id} onCommentsCountChange={setExactCommentsCount} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Shorts() {
  const navigate = useNavigate();
  const { setIsSearchOpen, shortsSearchQuery, setShortsSearchQuery } = useOutletContext<{ 
    setIsSearchOpen: (open: boolean) => void,
    shortsSearchQuery: string,
    setShortsSearchQuery: (query: string) => void
  }>();
  const { shorts, isInitialHomeLoading, setIsFullScreen, isGlobalMuted, setIsGlobalMuted } = useVideoStats();
  const [activeAds, setActiveAds] = useState<ShortsAd[]>([]);
  const [adInterval, setAdInterval] = useState(2);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showEmptyState, setShowEmptyState] = useState(false);

  useEffect(() => {
    const loadAds = async () => {
      try {
        console.log("🎬 [SHORTS] Loading ads...");
        const [ads, settings] = await Promise.all([
          adService.getActiveShortsAds(),
          adService.getSettings()
        ]);
        console.log(`🎬 [SHORTS] Ads loaded: ${ads.length}`, ads);
        setActiveAds(ads);
        
        // Force interval to 2 for this specific user request
        setAdInterval(2);
      } catch (err) {
        console.error("🎬 [SHORTS] Failed to load ads:", err);
      }
    };
    loadAds();
  }, []);

  useEffect(() => {
    if (!isInitialHomeLoading) {
      // Load instantly when context data is ready, no artificial delay
      setIsDataLoading(false);
      
      const emptyTimer = setTimeout(() => {
        setShowEmptyState(true);
      }, 4000); // 4s delay before showing "No shorts found"
      
      return () => {
        clearTimeout(emptyTimer);
      };
    } else {
      setIsDataLoading(true);
      setShowEmptyState(false);
    }
  }, [isInitialHomeLoading]);

  const filteredShorts = shorts.filter(short => 
    (short.description || "").toLowerCase().includes(shortsSearchQuery.toLowerCase()) ||
    (short.creator || "").toLowerCase().includes(shortsSearchQuery.toLowerCase())
  );

  // Combined feed logic
  const feedItems = React.useMemo(() => {
    const items: (Short | ShortsAd & { isAd: boolean })[] = [];
    let adPointer = 0;

    filteredShorts.forEach((short, i) => {
      items.push(short);
      // Inject ad after every adInterval shorts
      if ((i + 1) % adInterval === 0 && activeAds.length > 0) {
        const ad = activeAds[adPointer % activeAds.length];
        items.push({ ...ad, isAd: true });
        adPointer++;
      }
    });

    return items;
  }, [filteredShorts, activeAds, adInterval]);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isGridView, setIsGridView] = useState(false);
  const [isAnyCommentOpen, setIsAnyCommentOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveShortsCount = shorts.filter(s => s.isLive).length;

  const handleCommentsToggle = React.useCallback((isOpen: boolean) => {
    setIsAnyCommentOpen(isOpen);
    setIsFullScreen(isOpen);
  }, [setIsFullScreen]);

  useEffect(() => {
    return () => {
      setIsFullScreen(false);
    };
  }, [setIsFullScreen]);

  useEffect(() => {
    if (shortsSearchQuery) {
      setIsGridView(true);
    } else {
      setIsGridView(false);
    }
  }, [shortsSearchQuery]);

  useEffect(() => {
    if (!isGridView && containerRef.current) {
      const elements = containerRef.current.querySelectorAll(".short-container");
      if (elements[activeIndex]) {
        elements[activeIndex].scrollIntoView({ behavior: "auto" });
      }
    }
  }, [isGridView]); // Removed activeIndex to prevent fighting with manual scroll

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isGridView) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }

      if (!isScrolling) setIsScrolling(true);
      
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 200); 
    };

    const handleScrollEnd = () => {
      setIsScrolling(false);
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // @ts-ignore - Adding support for scrollend event
    container.addEventListener('scrollend', handleScrollEnd, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      // @ts-ignore
      container.removeEventListener('scrollend', handleScrollEnd);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [activeIndex, isScrolling, isGridView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isAnyCommentOpen) {
      container.style.overflow = 'hidden';
    } else {
      container.style.overflow = ''; // Let classes handle it
    }
  }, [isAnyCommentOpen, isGridView]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col">
      {/* Search Bar Overlay - Fixed to top */}
      {!isAnyCommentOpen && (
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-6 pb-2 pointer-events-none transition-opacity duration-300">
          <div className="max-w-lg mx-auto flex items-center justify-between pointer-events-auto">
            {/* Live Button on the Left */}
            <Link 
              to="/live" 
              state={{ from: "/shorts" }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 transition-all active:scale-95 text-white"
              title="Live"
              id="shorts-live-btn"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
              <span className="text-[10px] font-black tracking-widest text-white uppercase leading-none">LIVE</span>
              {liveShortsCount > 0 && (
                <span className="bg-[#FF0050] text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[14px] text-center leading-none text-white">
                  {liveShortsCount}
                </span>
              )}
            </Link>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2">
              {shortsSearchQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShortsSearchQuery("");
                    setIsGridView(false);
                  }}
                  className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 text-white/70 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  id="clear-shorts-search-btn"
                  title="Clear search"
                >
                  <span className="text-[10px] font-bold text-white px-1 leading-none">{shortsSearchQuery}</span>
                  <X className="w-4 h-4" />
                </button>
              )}
              
              {/* Sound/Mute Icon */}
              <button 
                onClick={() => setIsGlobalMuted(!isGlobalMuted)}
                className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 text-white/90 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                title={isGlobalMuted ? "Unmute" : "Mute"}
                id="shorts-sound-toggle-btn"
              >
                {isGlobalMuted ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              
              {/* Search Icon on the Right */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 text-white/90 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                title="Search Shorts"
                id="shorts-search-btn"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className={cn(
          "flex-1 w-full no-scrollbar overscroll-none",
          isGridView 
            ? "overflow-y-auto bg-[#0f0f0f] pt-20 px-4 pb-24 scroll-smooth" 
            : (isAnyCommentOpen 
                ? "overflow-hidden touch-none" 
                : "overflow-y-auto snap-y snap-mandatory h-full")
        )}
      >
        {isDataLoading || (filteredShorts.length === 0 && !showEmptyState) ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-black">
            <Loader2 className="w-10 h-10 text-white/5 animate-spin" />
          </div>
        ) : filteredShorts.length > 0 ? (
          isGridView ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {filteredShorts.map((short, index) => (
                <motion.div
                  key={short.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    // Find the index in feedItems that corresponds to this short
                    const itemIndex = feedItems.findIndex(item => !('isAd' in item) && item.id === short.id);
                    if (itemIndex !== -1) {
                      setIsGridView(false);
                      setActiveIndex(itemIndex);
                    }
                  }}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 cursor-pointer group"
                >
                  <video 
                    src={short.videoUrl || null} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                    {short.isLive && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-500 rounded text-[8px] font-black text-white flex items-center gap-1 shadow-lg">
                        <div className="w-1 h-1 bg-white rounded-full" />
                        LIVE
                      </div>
                    )}
                    <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                      {short.description}
                    </p>
                    <div className="mt-1.5">
                      <Link 
                        to={`/profile/${short.creator}`}
                        className="flex items-center gap-1.5 group/creator relative z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {short.avatar ? (
                          <img 
                            src={short.avatar || null} 
                            className="w-4 h-4 rounded-full border border-white/20 group-hover/creator:opacity-80 transition-opacity object-cover" 
                            alt="" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/20 bg-white/10 flex items-center justify-center group-hover/creator:opacity-80 transition-opacity">
                            <User className="w-2 h-2 text-white/40" />
                          </div>
                        )}
                        <span className="text-[10px] font-medium text-white/70 group-hover/creator:text-white transition-colors truncate max-w-[80px]" title={short.creator}>{(short.creator || "").replace(/\s+/g, '').toLowerCase()}</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-full w-full">
              {feedItems.map((item, index) => (
                <div 
                  key={'isAd' in item ? `ad-${item.id}-${index}` : `short-${item.id}-${index}`} 
                  data-index={index}
                  className="short-container h-full w-full snap-start"
                >
                  {'isAd' in item ? (
                    <ShortAd 
                      ad={item as ShortsAd} 
                      isActive={activeIndex === index} 
                      isScrolling={isScrolling}
                      index={index}
                      activeIndex={activeIndex}
                    />
                  ) : (
                    <ShortVideo 
                      short={item as Short} 
                      isActive={activeIndex === index} 
                      onCommentsToggle={handleCommentsToggle}
                      isScrolling={isScrolling}
                      index={index}
                      activeIndex={activeIndex}
                    />
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-6 text-center space-y-4">
            <div className="text-4xl">🎬</div>
            <h3 className="text-xl font-bold">No shorts found</h3>
            <p className="text-white/50 text-sm">Try searching for something else.</p>
            <button 
              onClick={() => {
                setShortsSearchQuery("");
                setIsGridView(false);
              }}
              className="px-6 py-2 bg-white/10 rounded-full text-sm font-bold hover:bg-white/20 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
