import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, SkipForward, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useVideoStats } from "../context/VideoContext";
import AdOverlay from "./ads/AdOverlay";
import { AdPlacement } from "../types";
import { adService } from "../services/adService";
import Hls from "hls.js";

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onNext?: () => void;
  onToggleFullWindow?: (isFull: boolean) => void;
  onEightSecondsWatched?: () => void;
  onFourSecondsWatched?: () => void;
}

type Quality = "144p" | "240p" | "360p" | "480p" | "720p" | "1080p";

export default function CustomVideoPlayer({ src, poster, autoPlay = false, onNext, onToggleFullWindow, onEightSecondsWatched, onFourSecondsWatched }: CustomVideoPlayerProps) {
  const { isGlobalMuted, setIsGlobalMuted } = useVideoStats();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isGlobalMuted;
    }
  }, [isGlobalMuted]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState<Quality>("720p");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsView, setSettingsView] = useState<"main" | "quality" | "speed">("main");
  const [isFullWindow, setIsFullWindow] = useState(false);
  const [qualityMessage, setQualityMessage] = useState<string | null>(null);
  const [bufferedAmount, setBufferedAmount] = useState(0);
  const [hasSoughtToEnd, setHasSoughtToEnd] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ad Engine State
  const [activeAdPlacement, setActiveAdPlacement] = useState<AdPlacement | null>('pre-roll');
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [hasPostrollTriggered, setHasPostrollTriggered] = useState(false);
  const [cumulativeWatchTime, setCumulativeWatchTime] = useState(0);
  const [midrollInterval, setMidrollInterval] = useState(480);
  const lastTimeRef = useRef<number>(0);
  const lastAdTriggerRef = useRef<number>(0);
  const isFetchingAdRef = useRef<boolean>(false);
  const hasTriggeredEightSecondsRef = useRef<boolean>(false);
  const hasTriggeredFourSecondsRef = useRef<boolean>(false);

  // Reset trackers when source changes
  useEffect(() => {
    setActiveAdPlacement('pre-roll');
    setHasPostrollTriggered(false);
    setCumulativeWatchTime(0);
    lastTimeRef.current = 0;
    lastAdTriggerRef.current = 0;
    hasTriggeredEightSecondsRef.current = false;
    hasTriggeredFourSecondsRef.current = false;
    setQualityMessage(null);
    setShowSettingsMenu(false);
    setSettingsView("main");

    const fetchSettings = async () => {
      try {
        const settings = await adService.getSettings();
        // Force to 8m (480s) based on user request, ignore server settings for now
        setMidrollInterval(480);
      } catch (e) {
        setMidrollInterval(480);
      }
    };
    fetchSettings();
  }, [src]);

  // UI Timeout Helper handles cleanup automatically
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const setFlashMessage = (msg: string, durationMs = 2000) => {
    setQualityMessage(msg);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => setQualityMessage(null), durationMs);
  };

  useEffect(() => {
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const toggleFullWindow = () => {
    if (!isFullWindow) {
      setIsFullWindow(true);
      // Push state so back button works
      window.history.pushState({ modal: "full-player" }, "");
    } else {
      // If we're closing manually, go back to pop the history state
      // but only if our state is at the top
      if (window.history.state?.modal === "full-player") {
        window.history.back();
      } else {
        setIsFullWindow(false);
      }
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Whenever backward navigation occurs, close the player if it was open
      if (isFullWindow) {
        setIsFullWindow(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isFullWindow]);

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);
    const targetTime = percent * duration;
    setHoverTime(targetTime);
    setHoverPosition(percent * 100);
    
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = targetTime;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullWindow) {
        setIsFullWindow(false);
      }
    };

    if (isFullWindow) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    onToggleFullWindow?.(isFullWindow);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullWindow, onToggleFullWindow]);

  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000); // Hide after 2 seconds of inactivity
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking a button, slider, input, or settings overlay - bypass toggling play
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('[role="menu"]') || target.closest('.settings-menu')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;

    if (e.detail === 2) {
      if (videoRef.current) {
        const seekAmount = 10;
        if (isLeft) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - seekAmount);
          setFlashMessage("-10s", 1000);
        } else {
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + seekAmount);
          setFlashMessage("+10s", 1000);
        }
      }
      return;
    }

    if (e.detail === 1) {
      togglePlay();
      if (showControls) {
        setShowControls(false);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      } else {
        triggerControls();
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
    setSettingsView("main");
    setFlashMessage(`Speed: ${speed}x`);
  };

  const handleQualityChange = (q: Quality) => {
    setQuality(q);
    setShowSettingsMenu(false);
    setSettingsView("main");
    
    let msg = q === "1080p" ? "High Quality" : (q === "144p" || q === "240p" ? "Data Saver" : `Quality: ${q}`);
    setFlashMessage(msg, 1500);
  };

  useEffect(() => {
    if (src && videoRef.current) {
      if (src.includes('.m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hls.loadSource(src);
          hls.attachMedia(videoRef.current);
          return () => {
            hls.destroy();
          };
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = src;
          videoRef.current.load();
        }
      } else {
        videoRef.current.src = src;
        videoRef.current.load();
      }
    }
  }, [src]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentPos = video.currentTime;
      setCurrentTime(currentPos);
      
      if (isPlayingRef.current && !isAdPlaying) {
        const delta = currentPos - lastTimeRef.current;
        if (delta > 0 && delta < 1) { 
          setCumulativeWatchTime(prev => {
            const newCumulative = prev + delta;
            
            if (newCumulative >= 4.0 && !hasTriggeredFourSecondsRef.current) {
              hasTriggeredFourSecondsRef.current = true;
              if (onFourSecondsWatched) {
                onFourSecondsWatched();
              }
            }

            if (newCumulative >= 8.0 && !hasTriggeredEightSecondsRef.current) {
              hasTriggeredEightSecondsRef.current = true;
              if (onEightSecondsWatched) {
                onEightSecondsWatched();
              }
            }

            if (newCumulative - lastAdTriggerRef.current >= midrollInterval) {
              lastAdTriggerRef.current = newCumulative;
              setActiveAdPlacement('mid-roll');
            }
            return newCumulative;
          });
        }
      }
      lastTimeRef.current = currentPos;
    };

    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBufferedAmount(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (!hasPostrollTriggered) {
        setHasPostrollTriggered(true);
        setActiveAdPlacement('post-roll');
      } else if (onNext) {
        onNext();
      }
    };

    const events: Record<string, any> = {
      timeupdate: handleTimeUpdate,
      durationchange: handleDurationChange,
      loadedmetadata: handleDurationChange,
      play: handlePlay,
      pause: handlePause,
      waiting: handleWaiting,
      playing: handlePlaying,
      loadstart: handleWaiting,
      canplay: handlePlaying,
      progress: handleProgress,
      ended: handleEnded
    };

    Object.entries(events).forEach(([ev, cb]) => video.addEventListener(ev, cb));

    // Handle initial auto-play logic
    if (autoPlay && !activeAdPlacement) {
      // Delay to ensure video is ready for playback
      const playTimer = setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.play().catch((err) => {
          console.warn("Autoplay play promise rejected:", err);
          setIsPlaying(false);
        });
      }, 100);
      return () => clearTimeout(playTimer);
    }

    return () => {
      Object.entries(events).forEach(([ev, cb]) => video.removeEventListener(ev, cb));
    };
  }, [src, autoPlay, midrollInterval, isAdPlaying]);

  // Sync forced pause when ads are active
  useEffect(() => {
    if (activeAdPlacement && videoRef.current) {
      videoRef.current.pause();
    }
  }, [activeAdPlacement]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (activeAdPlacement) return; // Block playing if ad is active
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Handle or ignore play interruption
          });
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsGlobalMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isGlobalMuted;
      setIsGlobalMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const qualities: Quality[] = ["1080p", "720p", "480p", "360p", "240p", "144p"];
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className={cn("w-full h-full flex flex-col", isFullWindow && "fixed inset-0 z-[99999] bg-black")}>
      <motion.div 
        ref={containerRef}
        className={cn(
          "relative w-full bg-black group transition-all duration-500 shrink-0",
          isFullWindow 
            ? "flex-1 h-full w-full" 
            : "aspect-[16/10]"
        )}
        style={{ touchAction: "none" }}
        onMouseLeave={() => {
          setShowSettingsMenu(false);
          setSettingsView("main");
          if (isPlaying) setShowControls(false);
        }}
        onClick={handleVideoClick}
        onPanEnd={(_e, info) => {
          const { offset, velocity } = info;
          const isVertical = Math.abs(offset.y) > Math.abs(offset.x);
          
          if (isVertical) {
            // Swipe Down (offset.y > 40) -> Full Window
            if (offset.y > 40 && velocity.y > 20) {
              if (!isFullWindow) {
                toggleFullWindow();
              }
            }
            
            // Swipe Up (offset.y < -40) -> Exit Full Window
            if (offset.y < -40 && velocity.y < -20) {
              if (isFullWindow) {
                toggleFullWindow();
              }
            }
          }
        }}
      >
        <div className={cn("absolute inset-0 overflow-hidden", !isFullWindow && "bg-black")}>
          {/* Top Left Back Button (Full Phone/Window mode) */}
          {isFullWindow && (
            <button
              onClick={toggleFullWindow}
              className={cn(
                "absolute top-6 left-6 z-[100000] p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-all duration-300 backdrop-blur-md border border-white/10 shadow-2xl",
                showControls || !isPlaying ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
              )}
              aria-label="Exit Full Screen"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Ad Overlay Integration */}
          {activeAdPlacement && (
            <AdOverlay 
              placement={activeAdPlacement}
              isParentPlaying={isPlaying}
              onAdStart={() => {
                setIsAdPlaying(true);
                videoRef.current?.pause();
              }}
              onAdEnd={() => {
                setIsAdPlaying(false);
                const finishedPlacement = activeAdPlacement;
                setActiveAdPlacement(null);
                
                if (videoRef.current) {
                  videoRef.current.muted = isGlobalMuted;
                  if (!isGlobalMuted && videoRef.current.volume === 0) {
                    videoRef.current.volume = volume || 0.5;
                  }
                  
                  if (finishedPlacement !== 'post-roll') {
                    videoRef.current.play().catch(e => console.warn("Auto-resume failed:", e));
                  } else if (onNext) {
                    onNext();
                  }
                }
              }}
            />
          )}

          {/* Hidden Preview Video for scrubber tooltip (Only loaded when necessary) */}
          {hoverTime !== null && src && (
            <video
              ref={previewVideoRef}
              src={src}
              className="hidden"
              muted
              preload="auto"
            />
          )}

          {src ? (
            <video
              key={src}
              ref={videoRef}
              src={src.includes('.m3u8') ? undefined : src}
              className={cn(
                "w-full h-full cursor-pointer transition-all duration-500",
                isZoomed ? "object-cover scale-110" : "object-contain"
              )}
              playsInline
              muted={isGlobalMuted}
              preload="auto"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
            </div>
          )}

          <div className={cn(
            "absolute bottom-0 left-0 right-0 px-6 pt-10 pb-3 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-all duration-300",
            showControls || (!isPlaying && !isAdPlaying) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            <div className="flex flex-col gap-0 w-full max-w-[1200px] mx-auto">
              <div className="flex items-center justify-between w-full h-8">
                {/* Left: Playback Controls & Floating Timer (Refined) */}
                <div className="flex items-center gap-5 grow-0">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay} 
                      className="text-white hover:scale-125 transition-transform p-1 drop-shadow-lg"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    {onNext && (
                      <button 
                        onClick={onNext} 
                        className="text-white hover:scale-125 transition-transform p-1 drop-shadow-lg"
                        aria-label="Next video"
                      >
                        <SkipForward className="w-5 h-5 fill-current" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono font-black text-white/80 uppercase tracking-tighter whitespace-nowrap bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/5 shadow-lg">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-white/20">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Actions Cluster (Professional Layout) */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Volume with hidden slider on hover */}
                  <div className="hidden sm:flex items-center gap-0 group/volume-area bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full transition-all duration-300 backdrop-blur-md border border-white/5">
                    <button onClick={toggleMute} className="text-white transform transition-transform hover:scale-110">
                      {isGlobalMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <div className="w-0 overflow-hidden transition-all duration-300 group-hover/volume-area:w-20 group-hover/volume-area:ml-2">
                      <input
                        type="range"
                        min="0" max="1" step="0.1"
                        value={isGlobalMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                        aria-label="Volume"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowSettingsMenu(!showSettingsMenu);
                        setSettingsView("main");
                      }}
                      className="text-white hover:bg-white/15 p-1.5 rounded-full transition-all duration-300 backdrop-blur-md border border-white/0 hover:border-white/10"
                      aria-label="Settings"
                    >
                      <Settings className={cn("w-4.5 h-4.5 transition-transform duration-500", showSettingsMenu && "rotate-90")} />
                    </button>

                    {showSettingsMenu && (
                      <div className="absolute bottom-full right-0 mb-8 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[200px] py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {settingsView === "main" && (
                          <div className="space-y-1">
                            <button onClick={() => setSettingsView("quality")} className="w-full flex items-center justify-between px-5 py-3 text-[12px] text-white hover:bg-white/10 transition-colors group">
                              <span className="opacity-60 font-bold uppercase tracking-widest text-[9px]">Quality</span>
                              <span className="font-bold text-white/90 group-hover:text-white transition-colors">{quality}</span>
                            </button>
                            <button onClick={() => setSettingsView("speed")} className="w-full flex items-center justify-between px-5 py-3 text-[12px] text-white hover:bg-white/10 transition-colors group">
                              <span className="opacity-60 font-bold uppercase tracking-widest text-[9px]">Speed</span>
                              <span className="font-bold text-white/90 group-hover:text-white transition-colors">{playbackSpeed}x</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={toggleFullWindow} 
                    className="text-white hover:scale-110 transition-all p-1.5 hover:bg-white/15 rounded-full backdrop-blur-md border border-white/0 hover:border-white/10"
                  >
                    <Maximize className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Bottom: Flexible Progress Bar (The Line) */}
              <div 
                className="group/progress relative h-6 flex items-center cursor-pointer w-full"
                onMouseMove={handleProgressBarHover}
                onMouseLeave={() => setHoverTime(null)}
              >
                {/* Hover Preview Tooltip (Improved efficiency) */}
                {hoverTime !== null && (
                  <div 
                    className="absolute bottom-6 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-2xl z-50 transition-all duration-200 pointer-events-none animate-in fade-in zoom-in-95"
                    style={{ 
                      left: `${hoverPosition}%`,
                      transform: "translateX(-50%)"
                    }}
                  >
                    <div className="relative w-32 h-20 bg-zinc-900 border-b border-white/10 overflow-hidden">
                      {src && (
                        <video
                          src={src}
                          className="w-full h-full object-cover"
                          ref={(el) => {
                            if (el) el.currentTime = hoverTime;
                          }}
                        />
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono font-black text-white">
                        {formatTime(hoverTime)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative w-full h-1 bg-white/10 rounded-full transition-all duration-300 group-hover/progress:h-2 shadow-inner">
                  <div 
                    className="absolute top-0 left-0 h-full bg-white/15 transition-all duration-300 rounded-full"
                    style={{ width: `${(bufferedAmount / (duration || 1)) * 100}%` }}
                  />
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)] rounded-full"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>
                {/* Smaller White Dot (Scrubber) */}
                <div 
                  className="absolute h-3 w-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)] pointer-events-none transition-transform duration-150 group-hover/progress:scale-125 z-10"
                  style={{ 
                    left: `${(currentTime / (duration || 1)) * 100}%`,
                    transform: `translateX(-50%)`,
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="any"
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-20 opacity-0"
                  aria-label="Seek Video"
                />
              </div>
            </div>
          </div>

          {/* Loading Spinner */}
          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-50",
              (isBuffering && !isAdPlaying) ? "opacity-100" : "opacity-0"
            )}
          >
            <Loader2 className="w-32 h-32 text-white animate-spin drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
          </div>

          {/* Quality Change Notification */}
          <div className={cn(
            "absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold transition-all duration-500 pointer-events-none",
            qualityMessage ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}>
            {qualityMessage}
          </div>
        </div>
      </motion.div>

      {/* Ad Card Slot - Dedicated space below the video */}
      <AnimatePresence>
        {activeAdPlacement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-zinc-950 border-x border-b border-white/5"
          >
            <div id="ad-dedicated-slot" className="p-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad CTA Portal Target */}
      <div id="ad-cta-container" className="w-full" />
    </div>
  );
}
