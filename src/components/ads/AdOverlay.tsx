import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  ExternalLink, 
  SkipForward,
  Info,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';
import { useVideoStats } from '../../context/VideoContext';
import { Ad, AdPlacement } from '../../types';
import { adService } from '../../services/adService';
import { cn } from '../../lib/utils';

interface AdOverlayProps {
  placement: AdPlacement;
  onAdStart: () => void;
  onAdEnd: () => void;
  isParentPlaying: boolean;
}

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
    <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden pointer-events-auto">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex] || null}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="h-full w-full object-contain"
          alt={`Carousel ${currentIndex}`}
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
              }`} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AdOverlay: React.FC<AdOverlayProps> = ({ 
  placement, 
  onAdStart, 
  onAdEnd, 
  isParentPlaying
}) => {
  const { isGlobalMuted, setIsGlobalMuted } = useVideoStats();
  const [adsQueue, setAdsQueue] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const currentAd = adsQueue[currentAdIndex] || null;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [skipTimer, setSkipTimer] = useState(15);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [isImpressionLogged, setIsImpressionLogged] = useState(false);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const isMediaPendingRef = useRef(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Notify parent immediately that an ad session has started
    onAdStart();
    
    // Always load full set of ads for the placement to support "over and over" looping
    loadAds();
  }, [placement]);

  const loadAds = async () => {
    console.log(`[ADS] 🟢 Fetching ads for placement: ${placement}...`);
    isMediaPendingRef.current = true;
    
    // Safety timeout: Increased to 5 seconds to bypass slow/empty ad fetching gracefully and play the main video immediately
    const timeoutId = setTimeout(() => {
      if (isMediaPendingRef.current) {
        console.warn(`[ADS] ⚠️ Ad fetch timed out for ${placement}, skipping to content.`);
        onAdEnd();
      }
    }, 5000);

    try {
      const ads = await adService.getActiveAds(placement);
      console.log(`[ADS] 📦 Received ${ads?.length || 0} ads from backend for ${placement}`, ads);
      clearTimeout(timeoutId);
      
      if (ads && ads.length > 0) {
        setAdsQueue(ads);
      } else {
        console.warn(`[ADS] 🛑 No ads found in database for ${placement}. Check if ads are active=true and placement_type matches.`);
        onAdEnd(); // Fast fail if no ads
      }
    } catch (e) {
      console.error(`[ADS] ❌ Critical failure fetching ads for ${placement}:`, e);
      clearTimeout(timeoutId);
      onAdEnd();
    } finally {
      isMediaPendingRef.current = false;
    }
  };

  useEffect(() => {
    if (currentAd && !hasStarted) {
      setHasStarted(true);
      setIsPlaying(true);
      setSkipTimer(currentAd.skip_after_seconds !== undefined ? currentAd.skip_after_seconds : 15); 
      setIsImpressionLogged(false);
      setHasPlaybackStarted(false);
      setCurrentTime(0);
    }
  }, [currentAdIndex, adsQueue, currentAd]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && hasPlaybackStarted && skipTimer > 0) {
      timer = setInterval(() => {
        setSkipTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, hasPlaybackStarted, skipTimer]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      if (!hasPlaybackStarted && time > 0) {
        setHasPlaybackStarted(true);
      }
      
      // Log impression at 0.5 seconds
      if (!isImpressionLogged && time > 0.5 && currentAd) {
        adService.logEvent(currentAd.id, 'impression');
        setIsImpressionLogged(true);
      }
    }
  };

  const [adsPlayedInLoop, setAdsPlayedInLoop] = useState(0);
  const MAX_ADS_PER_BREAK = 10; // "over and over again" limit to prevent infinite lock

  const handleNextAd = () => {
    if (adsPlayedInLoop < MAX_ADS_PER_BREAK) {
      setAdsPlayedInLoop(prev => prev + 1);
      setCurrentAdIndex(prev => (prev + 1) % adsQueue.length);
      setHasStarted(false); // Reset to trigger the re-start effect
    } else {
      onAdEnd();
    }
  };

  const handleVideoEnded = () => {
    if (currentAd) {
      adService.logEvent(currentAd.id, 'complete');
      handleNextAd();
    }
  };

  useEffect(() => {
    // If it's an image ad, we need a timer to end it
    if (currentAd && currentAd.ad_type !== 'video' && hasStarted) {
      setHasPlaybackStarted(true);
      const timer = setTimeout(() => {
        handleVideoEnded();
      }, (currentAd.duration_seconds || 10) * 1000);
      return () => clearTimeout(timer);
    }
  }, [currentAd, hasStarted]);

  const handleAdClick = () => {
    if (currentAd) {
      adService.logEvent(currentAd.id, 'click');
      window.open(currentAd.destination_url, '_blank');
    }
  };

  const handleSkip = () => {
    if (currentAd) {
      adService.logEvent(currentAd.id, 'skip');
      onAdEnd();
    }
  };

  if (!currentAd) {
    return null;
  }

  return (
    <>
      {/* 1. Transparent Media Layer (For video/image and basic controls) */}
      <div className="absolute inset-0 z-[1000] pointer-events-none group/ad">
        <div className="relative w-full h-full">
           {currentAd.ad_type === 'video' && currentAd.media_url && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto flex items-center justify-center">
                 <video
                    ref={videoRef}
                    src={currentAd.media_url || null}
                    className="w-full h-full object-contain"
                    playsInline
                    muted={isGlobalMuted}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    onError={(e) => {
                       console.error("[ADS] Ad video loading failed, skipping ad:", e);
                       onAdEnd();
                    }}
                    onLoadedData={() => {
                       setIsMediaLoaded(true);
                       videoRef.current?.play().catch(() => {
                          if (videoRef.current) {
                             videoRef.current.muted = true;
                             setIsGlobalMuted(true);
                             videoRef.current.play();
                          }
                       });
                    }}
                    onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                 />
              </div>
           )}

           {/* Top Attribution Tag: Only "Sponsored" is on-screen */}
           <div className="absolute top-4 left-4 pointer-events-auto">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md">
                 <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Sponsored</span>
              </div>
           </div>

           {/* Skip / Status Area */}
           <div className="absolute bottom-4 right-4 pointer-events-auto">
              <div className="flex flex-col items-end gap-2">
                 {hasPlaybackStarted ? (
                    skipTimer > 0 ? (
                       <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white/50">
                          Skip in {skipTimer}s
                       </div>
                    ) : (
                       <button
                          onClick={handleSkip}
                          className="flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded-lg font-bold hover:bg-zinc-200 transition-all shadow-xl text-xs"
                       >
                          <span>Skip</span>
                          <SkipForward size={14} />
                       </button>
                    )
                 ) : (
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-500">
                       Ad • {duration > 0 ? Math.ceil(duration - currentTime) : (currentAd.duration_seconds || 10)}s
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* 2. DEDICATED SLOT PORTAL (The Advertiser Info + CTA under the video) */}
      {createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
             <div className="flex items-center justify-between w-full bg-zinc-900 border border-white/10 rounded-2xl p-4 md:p-5 shadow-2xl">
                <div className="flex items-center gap-4 overflow-hidden">
                   <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white border border-white/10 shrink-0 overflow-hidden">
                      {currentAd.profile_picture_url ? (
                        <img src={currentAd.profile_picture_url || null} className="w-full h-full object-cover" />
                      ) : (
                        <Info size={24} />
                      )}
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-white font-bold text-base md:text-xl truncate leading-tight">{currentAd.advertiser_name}</h4>
                      {currentAd.phone_number && (
                        <p className="text-zinc-500 font-mono text-xs md:text-sm mt-0.5">{currentAd.phone_number}</p>
                      )}
                   </div>
                </div>
                
                <button 
                  onClick={handleAdClick}
                  className="px-6 py-3 bg-white text-black font-black text-sm rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0 flex items-center gap-2"
                >
                  {currentAd.cta_text || 'Learn More'}
                  <ExternalLink size={16} />
                </button>
             </div>
          </motion.div>
        </AnimatePresence>,
        document.getElementById('ad-dedicated-slot') || document.body
      )}

      {/* Hidden compatibility target */}
      <div id="ad-cta-container" className="hidden" />
    </>
  );
};


export default AdOverlay;
