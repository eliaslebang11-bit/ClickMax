import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Video, UserProfile } from "../types";
import { motion } from "motion/react";
import { ArrowLeft, Zap, Play, Check, Link as LinkIcon, Calendar, MoreHorizontal, MoreVertical, User, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useVideoStats } from "../context/VideoContext";
import TruncatedText from "../components/TruncatedText";
import ThumbnailMedia from "../components/ThumbnailMedia";
import AutoDuration from "../components/AutoDuration";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { stats, toggleFollow, profiles, homeVideos, shorts, isInitialHomeLoading } = useVideoStats();
  const [activeTab, setActiveTab] = useState<"videos" | "shorts" | "live">("videos");
  const [dynamicProfile, setDynamicProfile] = useState<UserProfile | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  // Consolidate
  const profile = dynamicProfile || (username ? Object.values(profiles).find(p => p.username?.toLowerCase() === username.toLowerCase()) : null);

  const isPinnedOnPage = profile?.is_pinned;

  const togglePinProfileOnPage = async (usernameStr: string) => {
    try {
      const { togglePinProfile } = useVideoStats();
      if (togglePinProfile) {
        await togglePinProfile(usernameStr, !isPinnedOnPage);
      }
    } catch (err) {
      console.warn("Could not save pin to DB:", err);
    }
  };

  useEffect(() => {
    if (!username) return;
    
    // Check local lookup first
    const cached = Object.values(profiles).find(p => p.username?.toLowerCase() === username.toLowerCase());
    if (cached) {
      setDynamicProfile(cached);
      return;
    }

    // Otherwise load live from Supabase!
    const fetchLiveProfile = async () => {
      setIsLocalLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username)
          .maybeSingle();

        if (data) {
          const mapped: UserProfile = {
            id: data.id,
            username: data.username,
            handle: data.handle,
            avatar: data.avatar_url || data.avatar,
            followers: data.followers_count || 0,
            following: 0,
            videoCount: data.video_count || 0,
            shortsCount: data.shorts_count || 0,
            description: data.bio || data.description,
            banner: data.banner_url || data.banner,
            website: data.website_url || data.website,
            joinedDate: data.created_at || new Date().toISOString(),
          };
          setDynamicProfile(mapped);
        } else {
          setDynamicProfile(null);
        }
      } catch (err) {
        console.error("Live profile fetch issue:", err);
      } finally {
        setIsLocalLoading(false);
      }
    };

    fetchLiveProfile();
  }, [username, profiles]);

  if ((isInitialHomeLoading || isLocalLoading) && !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-brand-bg space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs font-black uppercase tracking-widest text-brand-muted animate-pulse">
          Loading creator profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-brand-bg space-y-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted text-xl font-bold">
          ?
        </div>
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Profile not found</h2>
          <p className="text-xs text-brand-muted mt-1 max-w-xs">
            We couldn't retrieve this creator account. They might have changed their username or have no postings.
          </p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-brand-surface border border-brand-border text-brand-text text-xs font-black uppercase tracking-widest rounded-full hover:bg-brand-text/5 active:scale-95 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const userVideos = homeVideos.filter(v => v.channelName?.toLowerCase() === profile.username.toLowerCase() && !v.isLive);
  const userStreamed = homeVideos.filter(v => v.channelName?.toLowerCase() === profile.username.toLowerCase() && v.isLive);
  const userShorts = shorts.filter(s => s.creator?.toLowerCase() === profile.username.toLowerCase());
  const isFollowing = stats[profile.username]?.isFollowing;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "2w";
    if (dateStr === "STREAMING") return "LIVE";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "2w";
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const headerStat = (() => {
    const vCount = userVideos.length;
    const sCount = userShorts.length;
    const stCount = userStreamed.length;
    
    if (vCount === 0 && sCount === 0 && stCount === 0) return "No content";
    
    const parts = [];
    if (vCount > 0) parts.push(`${vCount} video`);
    if (sCount > 0) parts.push(`${sCount} Shorts`);
    if (stCount > 0) parts.push(`${stCount} Live`);
    
    return parts.join(" • ");
  })();

  return (
    <div className="w-full bg-brand-bg min-h-screen pb-24 md:pb-8">
      {/* Banner */}
      <div className="aspect-[4/1] w-full bg-brand-surface overflow-hidden relative">
        {profile.banner ? (
          <img 
            src={profile.banner} 
            alt="Channel Banner" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800" />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-3 relative">
        <div className="flex justify-between items-start">
          <div className="relative -mt-[12%] w-[22%] aspect-square">
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                alt={profile.username} 
                className="w-full h-full rounded-full border-4 border-brand-bg shadow-sm object-cover bg-brand-bg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-full border-4 border-brand-bg shadow-sm bg-brand-surface flex items-center justify-center">
                <span className="text-2xl font-black text-brand-text/50 uppercase">
                  {profile.username?.charAt(0) || "U"}
                </span>
              </div>
            )}
          </div>
          <div className="pt-2 flex gap-2 items-center">
            <button
              onClick={() => profile.username && toggleFollow(profile.username)}
              className={cn(
                "px-4 py-1.5 rounded-full font-black text-xs transition-all active:scale-95",
                isFollowing 
                  ? "bg-brand-bg border border-brand-border text-brand-text hover:bg-brand-surface" 
                  : "bg-brand-text text-brand-bg hover:bg-brand-text/90"
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
            <button className="p-1.5 rounded-full border border-brand-border hover:bg-brand-surface transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 space-y-2">
          <div>
            <h2 className="text-lg font-black tracking-tight leading-tight">{profile.username}</h2>
            <p className="text-brand-muted text-[10px] font-medium">@{(profile.username || "").toLowerCase().replace(/\s+/g, '')}</p>
          </div>

          <div className="text-xs text-brand-text leading-snug break-all line-clamp-2 opacity-90">
            {profile.description}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex gap-1 hover:underline cursor-pointer">
              <span className="font-black text-brand-text">{profile.followers}</span>
              <span className="text-white font-bold">Followers</span>
            </div>
            <div className="text-[9px] text-brand-muted font-bold uppercase tracking-widest opacity-40">
              {headerStat}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-2 border-b border-brand-border flex">
        {(["videos", "shorts", "live"] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-xs font-bold transition-all relative hover:bg-brand-text/5",
              activeTab === tab ? "text-brand-text" : "text-brand-muted"
            )}
          >
            <span className="capitalize">{tab}</span>
            {activeTab === tab && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content Feed */}
      <div className="mt-4 px-3">
        {activeTab === "videos" && (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
            {userVideos.map((video) => (
              <Link key={video.id} to={`/watch/${video.id}`} className="flex-none w-[280px] snap-start group cursor-pointer">
                <div className="relative aspect-video bg-brand-surface rounded-xl overflow-hidden mb-3">
                  <ThumbnailMedia 
                    video={video} 
                    className="group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                    <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight uppercase tracking-tight">
                        {video.title}
                      </h4>
                      <button className="p-1 -mr-1 text-brand-muted hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-brand-muted font-medium hover:text-white transition-colors">
                        {profile.username}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <span>{video.views} views</span>
                        <span>•</span>
                        <span>{formatDate(video.postedAt)} ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {userVideos.length === 0 && (
              <div className="w-full py-20 text-center space-y-2">
                <h3 className="font-black text-xl">No videos yet</h3>
                <p className="text-brand-muted">When they post, they'll show up here.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "live" && (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
            {userStreamed.map((video) => (
              <Link key={video.id} to={`/watch/${video.id}`} className="flex-none w-[280px] snap-start group cursor-pointer">
                <div className="relative aspect-video bg-brand-surface rounded-xl overflow-hidden mb-3">
                  <ThumbnailMedia 
                    video={video} 
                    className="group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 rounded text-[9px] font-black text-white flex items-center gap-1 uppercase tracking-wider animate-pulse">
                    <div className="w-1 h-1 bg-white rounded-full" />
                    LIVE
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight uppercase tracking-tight">
                        {video.title}
                      </h4>
                      <button className="p-1 -mr-1 text-brand-muted hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-brand-muted font-medium hover:text-white transition-colors">
                        {profile.username} live
                      </p>
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <span>{video.views} watching</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {userStreamed.length === 0 && (
              <div className="w-full py-20 text-center space-y-2">
                <h3 className="font-black text-xl">No streamed videos yet</h3>
                <p className="text-brand-muted">When they go live, they'll show up here.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "shorts" && (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
            {userShorts.map((short) => (
              <Link key={short.id} to="/shorts" className="flex-none w-[160px] snap-start group cursor-pointer">
                <div className="relative aspect-[9/16] bg-brand-surface rounded-xl overflow-hidden mb-3">
                  <video src={short.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" muted playsInline />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent p-2 flex flex-col justify-end">
                    <div className="flex items-center justify-between w-full text-[9px] text-white font-bold">
                      <div className="flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{short.views}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-1">
                  <h4 className="text-[10px] font-bold text-white line-clamp-2 leading-tight uppercase tracking-tight">
                    {short.description}
                  </h4>
                </div>
              </Link>
            ))}
            {userShorts.length === 0 && (
              <div className="w-full py-20 text-center space-y-2">
                <h3 className="font-black text-xl">No shorts yet</h3>
                <p className="text-brand-muted">When they post shorts, they'll show up here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
