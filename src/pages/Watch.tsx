import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Video } from "../types";
import { Heart, Share2, MoreHorizontal, Bell, BellOff, Download, X, Clock, ListVideo, Check, MessageSquare, ChevronDown, Info, User, ArrowLeft, Loader } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedCounter from "../components/AnimatedCounter";
import { cn, formatRelativeTime, parseCount } from "../lib/utils";
import TruncatedText from "../components/TruncatedText";
import Comments from "../components/Comments";
import { useVideoStats } from "../context/VideoContext";
import { supabaseService } from "../services/supabaseService";
import CustomVideoPlayer from "../components/CustomVideoPlayer";
import ThumbnailMedia from "../components/ThumbnailMedia";
import AutoDuration from "../components/AutoDuration";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    stats, 
    incrementView, 
    toggleFollow, 
    toggleWatchLater, 
    addToHistory, 
    watchLater, 
    playlists, 
    addToPlaylist, 
    isFullScreen: isPlayerFullWindow, 
    setIsFullScreen: setIsPlayerFullWindow, 
    addToDownloads, 
    downloads,
    likedVideos,
    viewedVideos,
    toggleLike,
    homeVideos: videos
  } = useVideoStats();
  
  const video = videos.find(v => v.id === id);
  const videoStat = id && stats[id] ? {
    views: stats[id].views ?? parseCount(video?.views || 0),
    likes: stats[id].likes ?? parseCount(video?.likes || 0),
    isFollowing: !!stats[id].isFollowing,
    followers: stats[id].followers || 0
  } : id ? { 
    views: parseCount(video?.views || 0), 
    likes: parseCount(video?.likes || 0),
    isFollowing: false, 
    followers: 0 
  } : null;
  const isWatchLater = id ? watchLater.includes(id) : false;
  const isLiked = id ? likedVideos.includes(id) : false;
  const isDownloaded = id ? downloads.includes(id) : false;
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [exactCommentsCount, setExactCommentsCount] = useState<number>(0);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  useEffect(() => {
    let active = true;
    
    if (video) {
      setExactCommentsCount(parseCount(video.comments || 0));
    }

    if (id) {
      // Direct fetch of exact comments count from DB with race-safe filtering
      supabaseService.getCommentsCount(id).then(count => {
        if (!active) return;
        setExactCommentsCount(count);
      }).catch(err => {
        console.error("Error loading comments count:", err);
      });
    }

    return () => {
      active = false;
    };
  }, [id, video]);

  const handleNext = () => {
    const currentIndex = videos.findIndex(v => v.id === id);
    const nextVideo = videos[(currentIndex + 1) % videos.length];
    navigate(`/watch/${nextVideo.id}`);
  };
  
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  useEffect(() => {
    if (showComments) {
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showComments]);

  useEffect(() => {
    if (id) {
      addToHistory(id);
    }
    
    // Reset full screen when leaving the page
    return () => {
      setIsPlayerFullWindow(false);
    }
  }, [id]);

  if (!video || !videoStat) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-2xl font-bold">Video not found</h2>
        <Link to="/" className="text-brand-muted hover:text-white underline underline-offset-4">Return Home</Link>
      </div>
    );
  }

  const handleLike = () => {
    if (id) toggleLike(id);
  };

  const handleDownload = () => {
    if (!id) return;
    if (isDownloaded) {
      // Allow removing it if already downloaded
      return;
    }
    if (downloadProgress !== null) return; // already in progress

    setDownloadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        setDownloadProgress(100);
        clearInterval(interval);
        addToDownloads(id);
        setShowDownloadToast(true);
        setTimeout(() => {
          setDownloadProgress(null);
        }, 800);
        setTimeout(() => {
          setShowDownloadToast(false);
        }, 4500);
      } else {
        setDownloadProgress(progress);
      }
    }, 150);
  };

  const formatFollowersCount = (num: number) => {
    if (!num && num !== 0) return "0";
    if (num < 10000) return num.toString();
    if (num < 100000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    if (num < 1000000) {
      return Math.floor(num / 1000) + 'K';
    }
    const val = num / 1000000;
    return num % 1000000 === 0 ? val.toFixed(0) + 'M' : val.toFixed(1) + 'M';
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className={cn(
        "mx-auto transition-all duration-500 px-0 md:px-0 lg:px-0 pb-4 md:pb-8",
        isPlayerFullWindow 
          ? "max-w-none w-full gap-0 p-0" 
          : "max-w-[1920px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
      )}>
        {/* Left Column: Player & Info */}
        <div className={cn(
          "lg:col-span-9 flex flex-col",
          isPlayerFullWindow && "lg:col-span-12"
        )}>
        <div className={cn(
          "sticky top-0 transition-all duration-500",
          showComments ? "z-[120] bg-brand-bg" : "z-[101]"
        )}>
          <CustomVideoPlayer 
            src={video.videoUrl} 
            poster={video.thumbnail}
            autoPlay={true}
            onNext={handleNext}
            onToggleFullWindow={setIsPlayerFullWindow}
            onFourSecondsWatched={() => {
              if (id) {
                console.log(`[AdMob] 4 seconds watched for video: ${id}. Initiating Rewarded Interstitial.`);
                
                // 1. Android Standard WebView JavascriptInterface bridge
                if ((window as any).AndroidAdInterface) {
                  try {
                    (window as any).AndroidAdInterface.showRewardedInterstitialAd(id);
                  } catch (e) {
                    console.error("AndroidAdInterface error:", e);
                  }
                }
                
                // 2. React Native WebView postMessage bridge (for Expo / hybrid architectures)
                if ((window as any).ReactNativeWebView) {
                  try {
                    (window as any).ReactNativeWebView.postMessage(JSON.stringify({
                      type: "SHOW_REWARDED_INTERSTITIAL_AD",
                      videoId: id
                    }));
                  } catch (e) {
                    console.error("ReactNativeWebView message send error:", e);
                  }
                }
              }
            }}
            onEightSecondsWatched={() => {
              if (id) {
                incrementView(id);
              }
            }}
          />
        </div>

        {!isPlayerFullWindow && (
          <div className="space-y-3 px-4 md:px-8 mt-2 md:mt-4">
            <h1 className="text-xl md:text-2xl font-bold leading-tight tracking-tight">
            {!isTitleExpanded && video.title.length > 40 
              ? `${video.title.slice(0, 40)}` 
              : video.title
            }
            {video.title.length > 40 && (
              <button 
                onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                className="ml-2 text-xs font-bold text-brand-muted hover:text-brand-text inline-block align-middle"
              >
                {isTitleExpanded ? "Show less" : "see more..."}
              </button>
            )}
          </h1>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/profile/${video.channelName}`} className="shrink-0">
                {video.channelAvatar ? (
                  <img 
                    src={video.channelAvatar} 
                    alt={video.channelName} 
                    className="w-10 h-10 rounded-full border border-brand-border hover:opacity-80 transition-opacity object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-brand-border bg-brand-surface flex items-center justify-center hover:opacity-80 transition-opacity font-black text-xs text-brand-text uppercase">
                    {video.channelName?.charAt(0) || "U"}
                  </div>
                )}
              </Link>
              <div className="min-w-0 max-w-[150px] md:max-w-[200px]">
                <Link to={`/profile/${video.channelName}`} className="hover:text-brand-text/80 transition-colors">
                  <h3 className="font-bold text-base leading-tight truncate" title={video.channelName}>
                    {video.channelName}
                  </h3>
                </Link>
                <p className="text-[11px] text-brand-muted truncate">
                  <AnimatedCounter value={videoStat.followers} formatter={formatFollowersCount} /> followers
                </p>
              </div>
              <button 
                onClick={() => toggleFollow(video.channelName)}
                className={cn(
                  "ml-2 px-5 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2",
                  videoStat.isFollowing 
                    ? "bg-brand-text/5 text-brand-text/80 hover:bg-brand-text/10" 
                    : "bg-brand-text text-brand-bg hover:opacity-90"
                )}
              >
                {videoStat.isFollowing ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : "Follow"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 group border",
                  isLiked 
                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                    : "bg-brand-text/5 border-transparent text-brand-text hover:bg-brand-text/10"
                )}
              >
                <Heart className={cn("w-4 h-4 transition-transform group-active:scale-90", isLiked && "fill-current")} />
                <span className="text-sm font-semibold">
                  <AnimatedCounter value={videoStat.likes} formatter={(v) => (v || 0) >= 1000 ? `${((v || 0) / 1000).toFixed(1)}K` : (v || 0).toString()} />
                </span>
              </button>

              <button 
                onClick={handleDownload}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-colors border border-transparent select-none",
                  isDownloaded 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : downloadProgress !== null
                      ? "bg-brand-text/5 hover:bg-brand-text/5 text-brand-muted cursor-not-allowed"
                      : "bg-brand-text/5 hover:bg-brand-text/10 text-brand-text"
                )}
                disabled={downloadProgress !== null}
              >
                {isDownloaded ? (
                  <Check className="w-4 h-4 text-emerald-500 animate-[pulse_1s_ease-in-out_infinite]" />
                ) : downloadProgress !== null ? (
                  <Loader className="w-4 h-4 animate-spin text-brand-muted" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isDownloaded 
                    ? "Downloaded" 
                    : downloadProgress !== null 
                      ? `Downloading ${downloadProgress}%` 
                      : "Download"}
                </span>
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isMoreMenuOpen ? "bg-brand-text text-brand-bg" : "bg-brand-text/10 hover:bg-brand-text/20"
                  )}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {isMoreMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsMoreMenuOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 bottom-full mb-2 w-48 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-20 overflow-hidden"
                      >
                        <button 
                          onClick={() => setIsMoreMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-text/5 transition-colors text-sm font-medium"
                        >
                          <BellOff className="w-4 h-4" />
                          Mute Notifications
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {video.description && (
            <div className="bg-brand-surface rounded-2xl p-4 space-y-2 border border-brand-border hover:bg-brand-text/[0.02] transition-colors">
              <div className="flex gap-2 text-sm font-bold">
                <span><AnimatedCounter value={Number(videoStat.views)} /> views</span>
                <span className="text-brand-muted">•</span>
                <span>{formatRelativeTime(video.postedAt)}</span>
              </div>
              <div className="text-sm text-brand-text/80 leading-relaxed">
                <TruncatedText 
                  text={video.description}
                  maxLength={40}
                  className="whitespace-pre-wrap"
                />
              </div>
            </div>
          )}

          <div className="pt-1">
            <button 
              onClick={() => setShowComments(true)}
              className="w-full flex items-center justify-between p-4 bg-brand-surface border border-brand-border rounded-2xl hover:bg-brand-text/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-brand-muted group-hover:text-brand-text transition-colors" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">Comments</span>
                  {!video.description && (
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-muted font-medium mt-0.5">
                      <span><AnimatedCounter value={Number(videoStat.views)} /> views</span>
                      <span className="text-[8px]">•</span>
                      <span>{formatRelativeTime(video.postedAt)}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-brand-muted bg-brand-text/5 px-2 py-0.5 rounded-full">
                  <AnimatedCounter value={exactCommentsCount} />
                </span>
              </div>
              <ChevronDown className="w-5 h-5 text-brand-muted -rotate-90" />
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Playlist Modal */}
      <AnimatePresence>
        {showPlaylistModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlaylistModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl shadow-2xl z-[60] p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Save to playlist</h3>
                <button onClick={() => setShowPlaylistModal(false)} className="p-2 hover:bg-brand-text/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-2">
                {Object.keys(playlists).map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      if (id) addToPlaylist(name, id);
                      setShowPlaylistModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-brand-text/5 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-bg rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ListVideo className="w-5 h-5" />
                      </div>
                      <span className="font-bold">{name}</span>
                    </div>
                    {id && playlists[name].includes(id) && (
                      <Check className="w-5 h-5 text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>

              <button className="w-full py-4 text-sm font-bold text-brand-muted hover:text-brand-text transition-colors border-t border-brand-border">
                + Create new playlist
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Column: Sidebar */}
      {!isPlayerFullWindow && (
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-brand-muted">Up Next</h4>
            <div className="space-y-4">
              {videos
                .filter(v => v.id !== (video?.id || ''))
                .filter(v => !viewedVideos.includes(v.id))
                .slice(0, 5).map((v) => {
                const vStat = stats[v.id];
                return (
                  <div 
                    key={v.id} 
                    onClick={() => navigate(`/watch/${v.id}`)}
                    className="flex gap-3 group cursor-pointer"
                  >
                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-brand-surface border border-brand-border">
                      <ThumbnailMedia 
                        video={v} 
                        className="group-hover:scale-110"
                      />
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 backdrop-blur-md rounded text-[8px] font-bold text-white">
                        <AutoDuration videoUrl={v.videoUrl} fallbackDuration={v.duration} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h5 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-white/80 transition-colors">
                        {v.title}
                      </h5>
                      <Link 
                        to={`/profile/${v.channelName}`}
                        className="text-[11px] text-brand-muted hover:text-white transition-colors truncate block relative z-10" 
                        title={v.channelName}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {v.channelName}
                      </Link>
                      <p className="text-[11px] text-brand-muted">
                        {v.isLive ? (
                          <span className="text-red-500 font-bold">{v.views}</span>
                        ) : (
                          <>
                            <AnimatedCounter value={vStat?.views || 0} /> views • {formatRelativeTime(v.postedAt)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comments Bottom Sheet */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 h-[65vh] bg-brand-bg z-[110] shadow-2xl flex flex-col rounded-t-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Comments</h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Info className="w-6 h-6 text-white" />
                  </button>
                  <button 
                    onClick={() => setShowComments(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Comments videoId={video.id} onCommentsCountChange={setExactCommentsCount} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Downloads Success Toast Overlay */}
      <AnimatePresence>
        {showDownloadToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-[calc(100%-2rem)] bg-brand-surface border border-emerald-500/20 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-md"
          >
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full shrink-0 animate-bounce">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-white leading-tight uppercase tracking-wide">In-App Download Ready</h4>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                Downloaded to <strong>Offline Downloads</strong> in your app! No device storage or files app assets were used.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
