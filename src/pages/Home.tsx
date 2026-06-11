import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { Video } from "../types";
import { motion } from "motion/react";
import { useVideoStats } from "../context/VideoContext";
import { formatRelativeTime, cn, parseCount, formatCount } from "../lib/utils";
import AnimatedCounter from "../components/AnimatedCounter";
import { Loader2, ArrowLeft, Search, X, Radio, Bell, User, Plus, Check, Trash2 } from "lucide-react";
import Header from "../components/Header";
import { useNotifications } from "../context/NotificationContext";
import ThumbnailMedia from "../components/ThumbnailMedia";
import AutoDuration from "../components/AutoDuration";
import { useUser } from "../context/UserContext";
import { supabaseService } from "../services/supabaseService";

const VideoSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="aspect-video md:rounded-[2.5rem] rounded-[2rem] bg-brand-surface border md:border border-brand-border" />
    <div className="flex gap-3 px-5 md:px-0">
      <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-brand-surface rounded w-full" />
        <div className="h-3 bg-brand-surface rounded w-2/3" />
      </div>
    </div>
  </div>
);

export default function Home() {
  const { 
    setIsSidebarOpen, 
    isSidebarOpen, 
    searchQuery, 
    setSearchQuery,
    setIsSearchOpen
  } = useOutletContext<{ 
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>,
    isSidebarOpen: boolean,
    searchQuery: string,
    setSearchQuery: (query: string) => void,
    setIsSearchOpen: (open: boolean) => void
  }>();
  const navigate = useNavigate();
  const categories = ["All", "Lifestyle", "Technology", "Cooking", "Science", "Music", "Sports"];
  const { 
    stats, 
    viewedVideos,
    watchLater,
    toggleWatchLater,
    homeVideos: videos, 
    setHomeVideos: setVideos, 
    isInitialHomeLoading: isInitialLoading, 
    setIsInitialHomeLoading: setIsInitialLoading,
    refreshData
  } = useVideoStats();
  
  const { user } = useUser();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isUserContent = (channelName: string) => {
    if (!user || user.username === "Guest") return false;
    const cleanName = (channelName || "").toLowerCase().trim();
    const cleanHandle = (user.handle || "").replace('@', '').toLowerCase().trim();
    const cleanUsername = (user.username || "").toLowerCase().trim();
    return cleanName.replace(/\s+/g, '') === cleanHandle || 
           cleanName === cleanUsername ||
           cleanName.replace(/\s+/g, '') === cleanUsername.replace(/\s+/g, '');
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }
    
    const cleanId = postId.includes('::') ? postId.split('::')[0] : postId;
    
    setDeletingId(postId);
    try {
      const success = await supabaseService.deleteVideo(cleanId);
      if (success) {
        await refreshData();
      } else {
        alert("Failed to delete video. Please try again.");
      }
    } catch (err: any) {
      console.error("Error key delete execution:", err);
      alert(`Error deleting content: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishingSearch, setIsFinishingSearch] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const processId = (id: string) => id.includes('::') ? id.split('::')[0] : id;

  const filteredVideos = Array.from(new Map(
    videos
      .filter(video => 
        (video.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.channelName || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(v => [processId(v.id), v])
  ).values());

  useEffect(() => {
    if (filteredVideos.length === 0 && searchQuery) {
      if (isOffline) {
        setIsFinishingSearch(false);
        return;
      }
      setIsFinishingSearch(true);
      // Wait for 1.2 seconds before showing empty state
      const timer = setTimeout(() => setIsFinishingSearch(false), 1200);
      return () => clearTimeout(timer);
    } else {
      setIsFinishingSearch(false);
    }
  }, [searchQuery, filteredVideos.length, isOffline]);

  // Initial loading state handled by VideoContext provider
  useEffect(() => {
    if (videos.length > 0) {
      setIsInitialLoading(false);
    }
  }, [videos.length, setIsInitialLoading]);

  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMoreVideos = useCallback(() => {
    // No-op for now as we load all videos initially.
    // In a real app, this would fetch the next page of videos from the API.
    // The user explicitly asked to stop repeating videos.
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) clearTimeout(loadMoreTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreVideos, isLoading]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClick={() => setIsSearchOpen(true)}
      />
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-6 md:px-8 pt-1 md:pt-1 pb-20">
      {/* Categories Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-5 md:px-0">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => cat === "All" ? setSearchQuery("") : setSearchQuery(cat)}
            className={cn(
              "px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 whitespace-nowrap border hover:scale-105 active:scale-95",
              (cat === "All" && !searchQuery) || cat === searchQuery
                ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                : "bg-white/5 border-white/10 text-brand-muted hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 md:gap-x-8">
        {isInitialLoading || isFinishingSearch ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 md:px-0">
              <VideoSkeleton />
            </div>
          ))
        ) : filteredVideos.length > 0 ? (
          filteredVideos.map((video, index) => {
            const originalId = video.id.includes('::') ? video.id.split('::')[0] : video.id;
            const videoStat = stats[originalId]; 
            return (
              <div key={video.id}>
                <div 
                  onClick={() => {
                    if (video.isLive) {
                      if (video.id.startsWith('s-live')) {
                        navigate(`/live`, { state: { from: '/', activeId: video.id } });
                      } else {
                        navigate(`/streaming-viewer/${originalId}`, { state: { from: '/' } });
                      }
                    } else {
                      navigate(`/watch/${originalId}`);
                    }
                  }}
                  className="group block space-y-3 cursor-pointer"
                >
                  <div className="relative aspect-video md:rounded-[2.5rem] rounded-[2rem] overflow-hidden bg-brand-surface group/thumb shadow-2xl">
                    <ThumbnailMedia video={video} className="group-hover:scale-105" />
                    
                    {/* Preload the video file for the first 6 top upcoming cards so they are fully ready before click or hover */}
                    {index < 6 && (
                      <video src={video.videoUrl || undefined} preload="auto" muted className="hidden" />
                    )}
                    
                    {/* Floating Plus Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchLater(originalId);
                      }}
                      className={cn(
                        "absolute top-4 right-4 p-2 rounded-full backdrop-blur-xl transition-all duration-300 opacity-0 group-hover/thumb:opacity-100 z-20",
                        watchLater.includes(originalId) 
                          ? "bg-brand-accent text-white" 
                          : "bg-black/40 text-white hover:bg-black/60 hover:scale-110 border border-white/10"
                      )}
                      title={watchLater.includes(originalId) ? "Remove from Watch Later" : "Add to Watch Later"}
                    >
                      {watchLater.includes(originalId) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>

                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold text-white group-hover/thumb:opacity-0 transition-opacity">
                      <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  <div className="flex gap-3 px-5 md:px-0">
                    <Link 
                      to={`/profile/${video.channelName}`} 
                      className="flex-shrink-0 relative z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {video.channelAvatar ? (
                        <img 
                          src={video.channelAvatar} 
                          alt={video.channelName}
                          className="w-10 h-10 rounded-full border border-brand-border object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-brand-border bg-brand-surface flex items-center justify-center font-black text-xs text-brand-text uppercase">
                          {video.channelName?.charAt(0) || "U"}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 col-span-1">
                        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-brand-text/80 transition-colors">
                          {video.title}
                        </h3>
                        {isUserContent(video.channelName || "") && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(video.id);
                            }}
                            disabled={deletingId === video.id}
                            className="p-1 -mr-1 text-brand-muted hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0 z-20 relative"
                            title="Delete video"
                          >
                            {deletingId === video.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col text-xs text-brand-muted">
                        <Link 
                          to={`/profile/${video.channelName}`} 
                          className="hover:text-brand-text transition-colors w-fit relative z-10 truncate max-w-full"
                          onClick={(e) => e.stopPropagation()}
                          title={video.channelName}
                        >
                          {video.channelName}
                        </Link>
                        <span>
                          {video.isLive ? (
                            <span className="text-blue-500 font-bold flex items-center gap-1.5 uppercase">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                              {video.id.startsWith('s-live') ? 'Live' : 'Streaming'} • {formatCount(parseCount(video.views))}
                            </span>
                          ) : (
                            <>
                              <AnimatedCounter 
                                value={videoStat ? videoStat.views : parseCount(video.views)} 
                                formatter={formatCount}
                              /> views • {formatRelativeTime(video.postedAt)}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })

        ) : (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="text-4xl">{isOffline ? "🌐" : "🎬"}</div>
            <h3 className="text-xl font-bold">No videos found</h3>
            <div className="space-y-1">
              {isOffline && (
                <p className="text-red-500 text-xs font-bold uppercase mb-2">No internet connection</p>
              )}
              <p className="text-brand-muted">Try searching for something else or explore our categories.</p>
            </div>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-sm font-bold underline underline-offset-4 hover:text-brand-text transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Loading Sentinel */}
      <div 
        ref={observerTarget} 
        className="w-full py-12 flex items-center justify-center"
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-muted" />
            {/* No loading text as requested */}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
