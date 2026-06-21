import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate, useOutletContext } from "react-router-dom";
import { useVideoStats } from "../context/VideoContext";
import { ArrowLeft, Video as VideoIcon, Zap, User as UserIcon, Users, Flame, Check, Plus, Loader2, Search as SearchIcon, X } from "lucide-react";
import { cn, formatCount } from "../lib/utils";
import AutoDuration from "../components/AutoDuration";

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const outletContext = useOutletContext<{ setSearchQuery?: (q: string) => void }>();
  
  const { homeVideos, shorts, profiles, toggleFollow, stats } = useVideoStats();
  const [activeTab, setActiveTab] = useState<"Videos" | "Shorts" | "Users">("Videos");
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(localQuery.trim())}`);
  };

  const lowercaseQuery = query.toLowerCase().trim();

  // Filter Videos
  const filteredVideos = homeVideos.filter(v => 
    !v.isLive && (
      (v.title || "").toLowerCase().includes(lowercaseQuery) ||
      (v.description || "").toLowerCase().includes(lowercaseQuery) ||
      (v.channelName || "").toLowerCase().includes(lowercaseQuery)
    )
  );

  // Filter Shorts
  const filteredShorts = shorts.filter(s => 
    (s.description || "").toLowerCase().includes(lowercaseQuery) ||
    (s.creator || "").toLowerCase().includes(lowercaseQuery)
  );

  // Filter Users
  const filteredUsers = Object.values(profiles)
    .filter(p => {
      if (!lowercaseQuery) return true;
      return (
        (p.username || "").toLowerCase().includes(lowercaseQuery) ||
        (p.full_name || "").toLowerCase().includes(lowercaseQuery) ||
        (p.handle || "").toLowerCase().includes(lowercaseQuery)
      );
    })
    .sort((a, b) => {
      const aPinned = a.is_pinned;
      const bPinned = b.is_pinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aFollowers = Number(a.followers || 0);
      const bFollowers = Number(b.followers || 0);
      return bFollowers - aFollowers;
    });

  // Helper to determine if a channel is followed
  const isChannelFollowed = (channelName: string) => {
    // Find any video of this channel to check global follow stat, or resolve from stats
    const firstVideo = homeVideos.find(v => v.channelName === channelName);
    if (firstVideo && stats[firstVideo.id]) {
      return stats[firstVideo.id].isFollowing;
    }
    return false;
  };

  return (
    <div className="h-full overflow-y-auto bg-brand-bg no-scrollbar pb-32">
      {/* Interactive TikTok-style Search Header */}
      <div className="sticky top-0 z-30 bg-brand-bg/95 backdrop-blur-md border-b border-brand-border px-3 py-3 flex items-center gap-2">
        <button
          onClick={() => {
            setLocalQuery("");
            if (outletContext?.setSearchQuery) {
              outletContext.setSearchQuery("");
            }
            navigate("/");
          }}
          className="p-1.5 hover:bg-brand-surface rounded-full transition-colors text-brand-text flex-shrink-0"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-zinc-900 border border-white/5 rounded-full px-3.5 py-1.5 focus-within:border-white/20 transition-all">
            <SearchIcon className="w-4 h-4 text-zinc-500 mr-2 flex-shrink-0" />
            <input 
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search creators, videos, shorts..."
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => setLocalQuery("")}
                className="p-1 text-zinc-500 hover:text-white transition-colors flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <button 
            type="submit"
            className="text-xs font-black uppercase tracking-wider text-white hover:text-blue-400 font-sans active:scale-95 transition-all px-2 py-1 flex-shrink-0"
          >
            Search
          </button>

          <button 
            type="button"
            onClick={() => {
              setLocalQuery("");
              if (outletContext?.setSearchQuery) {
                outletContext.setSearchQuery("");
              }
              navigate("/");
            }}
            className="text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-red-400 font-sans active:scale-95 transition-all px-2.5 py-1.5 flex-shrink-0 border-l border-white/15 ml-1"
          >
            Cancel
          </button>
        </form>
      </div>

      {/* Tabs Navigation Bar with Active Underline and a Divider Line Beneath */}
      <div className="border-b border-brand-border flex bg-brand-bg px-4 sticky top-[57px] z-20">
        {(["Videos", "Shorts", "Users"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = 
            tab === "Videos" ? filteredVideos.length :
            tab === "Shorts" ? filteredShorts.length :
            filteredUsers.length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 max-w-[160px] py-4 text-xs font-black uppercase tracking-wider relative group transition-all text-center"
            >
              <div className="flex items-center justify-center gap-1.5">
                {tab === "Videos" && <VideoIcon className={cn("w-3.5 h-3.5", isActive ? "text-blue-500" : "text-brand-muted")} />}
                {tab === "Shorts" && <Zap className={cn("w-3.5 h-3.5", isActive ? "text-amber-500" : "text-brand-muted")} />}
                {tab === "Users" && <Users className={cn("w-3.5 h-3.5", isActive ? "text-emerald-500" : "text-brand-muted")} />}
                
                <span className={isActive ? "text-brand-text" : "text-brand-muted group-hover:text-brand-text transition-colors"}>
                  {tab}
                </span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-brand-text/10 text-brand-text" : "bg-brand-surface text-brand-muted"
                )}>
                  {count}
                </span>
              </div>
              
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full animate-fade-in" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        
        {/* Videos Tab Content */}
        {activeTab === "Videos" && (
          <div className="space-y-4">
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <Link
                    key={video.id}
                    to={`/watch/${video.id}`}
                    className="group flex flex-col bg-brand-surface border border-brand-border rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform"
                  >
                    <div className="relative aspect-video w-full bg-black/40">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                        <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
                      </div>
                    </div>
                    <div className="p-4 flex gap-3 min-w-0">
                      {video.channelAvatar ? (
                        <img 
                          src={video.channelAvatar} 
                          alt={video.channelName} 
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-placeholder border border-brand-border flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-brand-muted">
                          {video.channelName?.charAt(0) || "C"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-brand-text line-clamp-2 leading-snug tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                          {video.title}
                        </h4>
                        <p className="text-[10px] text-brand-muted font-bold tracking-wide mt-1">
                          {video.channelName}
                        </p>
                        <p className="text-[9px] text-brand-muted/75 font-semibold mt-0.5">
                          {video.views} Views
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <NoResults text="No videos matched your search query." onClear={() => navigate('/search?q=')} />
            )}
          </div>
        )}

        {/* Shorts Tab Content */}
        {activeTab === "Shorts" && (
          <div className="space-y-4">
            {filteredShorts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredShorts.map((sh) => (
                  <Link
                    key={sh.id}
                    to="/shorts"
                    className="group relative aspect-[9/16] bg-brand-surface rounded-2xl overflow-hidden border border-brand-border flex flex-col justify-end p-3 hover:scale-[1.02] transition-transform"
                  >
                    {sh.thumbnail ? (
                      <img 
                        src={sh.thumbnail} 
                        alt={sh.description} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <video 
                        src={sh.videoUrl || null} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="relative z-10 space-y-1">
                      <p className="text-white text-[11px] font-bold line-clamp-2 leading-snug">
                        {sh.description || "Active Short"}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] font-extrabold text-blue-400 uppercase tracking-widest">
                        <span>@{sh.creator}</span>
                      </div>
                      <span className="inline-block text-[9px] text-white/50 font-semibold">
                        {formatCount(Number(sh.views || 0))} views
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <NoResults text="No shorts matched your search query." onClear={() => navigate('/search?q=')} />
            )}
          </div>
        )}

        {/* Users (Profiles) Tab Content */}
        {activeTab === "Users" && (
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              <div className="space-y-3">
                {filteredUsers.map((userProf) => {
                  const followed = isChannelFollowed(userProf.username);
                  return (
                    <div
                      key={userProf.username}
                      className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-brand-surface border border-brand-border hover:bg-brand-text/5 transition-all cursor-pointer"
                      onClick={() => navigate(`/profile/${userProf.username}`)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {userProf.avatar ? (
                          <img 
                            src={userProf.avatar} 
                            alt={userProf.username} 
                            className="w-14 h-14 rounded-full object-cover border border-brand-border flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-brand-placeholder border border-brand-border flex items-center justify-center text-xl font-black text-brand-muted flex-shrink-0">
                            {userProf.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider block">Creator Profile</span>
                          <h4 className="font-bold text-base text-brand-text truncate leading-none">
                            {userProf.full_name || userProf.username}
                          </h4>
                          <p className="text-xs text-brand-muted font-bold mt-0.5">
                            {userProf.handle || `@${userProf.username.toLowerCase()}`}
                          </p>
                          {userProf.description && (
                            <p className="text-xs text-brand-muted/80 line-clamp-1 mt-1 leading-relaxed">
                              {userProf.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-brand-muted font-bold uppercase tracking-wider">
                            <span>{formatCount(Number(userProf.followers || 0))} Followers</span>
                            <span>•</span>
                            <span>{userProf.videoCount || 0} Videos</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Follow Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollow(userProf.username);
                          }}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                            followed 
                              ? "bg-brand-text/10 text-brand-text border border-brand-border"
                              : "bg-blue-600 text-white hover:bg-blue-500 shadow-md"
                          )}
                        >
                          {followed ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Following
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Follow
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <NoResults text="No creators found with that name." onClear={() => navigate('/search?q=')} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function NoResults({ text, onClear }: { text: string; onClear?: () => void }) {
  return (
    <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
      <div className="w-16 h-16 bg-brand-surface border border-brand-border rounded-full flex items-center justify-center mx-auto">
        <Users className="w-8 h-8 text-brand-muted/40" />
      </div>
      <div>
        <h3 className="font-extrabold text-white text-base">No results matching</h3>
        <p className="text-xs text-brand-muted mt-1 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
