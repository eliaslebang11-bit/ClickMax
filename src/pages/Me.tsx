import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Calendar, 
  Link2, 
  Settings, 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Share,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
  LogOut,
  Play,
  Loader2
} from "lucide-react";
import { cn, formatCount, formatRelativeTime } from "../lib/utils";
import TruncatedText from "../components/TruncatedText";
import { useUser } from "../context/UserContext";
import { useVideoStats } from "../context/VideoContext";
import AutoDuration from "../components/AutoDuration";
import { supabaseService } from "../services/supabaseService";

export default function Me() {
  const { user, updateUser, signOut } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { downloads, stats, removeFromDownloads, homeVideos, shorts, isInitialHomeLoading, refreshData, activeUploads } = useVideoStats();
  const [activeTab, setActiveTab] = useState("Videos");

  React.useEffect(() => {
    if (location.state && (location.state as any).type) {
      setActiveTab((location.state as any).type);
    } else if (location.state && (location.state as any).posted) {
      setActiveTab("Videos");
    }
  }, [location.state]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (postId: string, tab: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${tab === "Videos" ? "video" : "short"}?`)) {
      return;
    }
    
    const cleanId = postId.includes('::') ? postId.split('::')[0] : postId;
    
    setDeletingId(postId);
    try {
      let success = false;
      if (tab === "Videos") {
        success = await supabaseService.deleteVideo(cleanId);
      } else if (tab === "Shorts") {
        success = await supabaseService.deleteShort(cleanId);
      }
      
      if (success) {
        await refreshData();
      } else {
        alert("Failed to delete content from Supabase. Please try again.");
      }
    } catch (err: any) {
      console.error("Error in delete execution:", err);
      alert(`Error deleting content: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  const userHandle = (user.handle || "").replace('@', '');
  
  const isUserContent = (name: string) => {
    const cleanName = (name || "").toLowerCase().trim();
    const cleanHandle = userHandle.toLowerCase().trim();
    const cleanUsername = (user.username || "").toLowerCase().trim();
    return cleanName.replace(/\s+/g, '') === cleanHandle || 
           cleanName === cleanUsername ||
           cleanName.replace(/\s+/g, '') === cleanUsername.replace(/\s+/g, '');
  };

  const filteredContent = activeTab === "Downloads" 
    ? downloads.map(id => homeVideos.find(v => v.id === id)).filter((v): v is any => !!v)
    : activeTab === "Videos"
      ? homeVideos.filter(v => isUserContent(v.channelName || ""))
      : activeTab === "Shorts"
        ? shorts.filter(s => isUserContent(s.creator || ""))
        : activeTab === "Live"
          ? homeVideos.filter(v => v.isLive && isUserContent(v.channelName || ""))
          : [];
  
  const uploadingVideosCount = activeUploads.filter(u => u.type === "Video").length;
  const uploadingShortsCount = activeUploads.filter(u => u.type === "Short").length;

  const vCount = homeVideos.filter(v => isUserContent(v.channelName || "") && !v.isLive).length + uploadingVideosCount;
  const sCount = shorts.filter(s => isUserContent(s.creator || "")).length + uploadingShortsCount;
  const lCount = homeVideos.filter(v => v.isLive && isUserContent(v.channelName || "")).length;

  const availableTabs = [
    { name: "Videos", count: vCount },
    { name: "Shorts", count: sCount },
    { name: "Live", count: lCount },
    { name: "Downloads", count: downloads.length, alwaysShow: true }
  ].filter(tab => tab.alwaysShow || tab.count > 0).map(tab => tab.name);

  // If current active tab is not available, default to the last available one (which is Downloads if all else failed)
  React.useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || "Downloads");
    }
  }, [availableTabs, activeTab]);
  
  const contentStats = (() => {
    const parts = [];
    if (vCount > 0) parts.push(`${vCount} video`);
    if (sCount > 0) parts.push(`${sCount} Shorts`);
    if (lCount > 0) parts.push(`${lCount} Live`);
    if (downloads.length > 0) parts.push(`${downloads.length} Downloads`);
    
    return parts.join(" • ");
  })();
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Only images or pictures are allowed. Videos are denied.");
        return;
      }
      
      setIsUploadingImage(true);
      try {
        // Map types correctly: 'avatar' becomes 'profile-picture', 'banner' remains 'banner'
        const uploadType = type === 'avatar' ? 'profile-picture' : 'banner';
        console.log(`[ME] Commencing actual cloud storage upload for ${uploadType}...`);
        const finalUrl = await supabaseService.uploadFile(file, uploadType);
        
        if (finalUrl) {
          const success = await supabaseService.updateProfile({
            [type]: finalUrl
          });
          if (success) {
            updateUser({ [type]: finalUrl });
            alert(`${type === 'avatar' ? 'Profile picture' : 'Banner'} updated successfully in Supabase backend!`);
          } else {
            throw new Error("Failed to update profile picture in Supabase backend.");
          }
        } else {
          throw new Error("File upload failed, no URL returned");
        }
      } catch (err: any) {
        console.error(`[ME] Image upload failure:`, err);
        alert(`Failed to upload ${type}: ${err.message || "Unknown error occurred"}`);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-brand-bg">
      <div className="w-full pb-32">
        {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        className="hidden" 
        accept="image/*"
        multiple={false}
        onChange={(e) => handleImageUpload(e, 'avatar')}
      />
      <input 
        type="file" 
        ref={bannerInputRef} 
        className="hidden" 
        accept="image/*"
        multiple={false}
        onChange={(e) => handleImageUpload(e, 'banner')}
      />

      {/* Banner */}
      <div 
        onClick={() => bannerInputRef.current?.click()}
        className="relative h-20 md:h-24 bg-[#1a1a1a] overflow-hidden group cursor-pointer"
      >
        {user.banner ? (
          <img 
            src={user.banner} 
            alt="Banner" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
        {isUploadingImage && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 border border-white/10 rounded-full shadow-xl">
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Uploading Banner...</span>
            </div>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-3 relative">
        {/* Avatar */}
        <div 
          onClick={() => avatarInputRef.current?.click()}
          className="absolute -top-8 left-3 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full border-4 border-brand-bg bg-brand-surface overflow-hidden shadow-xl flex items-center justify-center relative">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl font-black text-brand-text/50 uppercase">
                {user.username?.charAt(0) || "U"}
              </span>
            )}
            {isUploadingImage && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-2 pb-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate("/edit-profile")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-full text-xs font-bold text-brand-text hover:bg-brand-text/5 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button 
              onClick={() => navigate("/settings")}
              className="p-1.5 border border-brand-border rounded-full hover:bg-brand-text/5 transition-colors"
            >
              <Settings className="w-4 h-4 text-brand-text" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="mt-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-black text-brand-text leading-tight">{user.username}</h2>
            {user.full_name && user.full_name !== user.username && (
              <span className="text-xs text-brand-muted font-medium opacity-70">({user.full_name})</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-brand-muted text-[10px] font-medium">{user.handle}</p>
            {user.email && (
              <p className="text-brand-muted/60 text-[9px] font-medium">{user.email}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-2 text-xs leading-snug text-brand-text line-clamp-2 break-all opacity-90">
          {user.description}
        </div>

        {/* Stats */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <button className="hover:underline decoration-brand-text">
            <span className="font-black text-brand-text">{formatCount(Number(user.followers || 0))}</span>
            <span className="text-white font-bold ml-1">Followers</span>
          </button>
          <div className="text-[9px] text-brand-muted font-bold uppercase tracking-widest opacity-40">
            {contentStats}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-2 flex border-b border-brand-border overflow-x-auto scrollbar-hide">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-none px-6 py-3 text-xs font-bold relative group transition-colors hover:bg-brand-text/5"
          >
            <span className={cn(
              "transition-colors",
              activeTab === tab ? "text-brand-text" : "text-brand-muted group-hover:text-brand-text"
            )}>
              {tab}
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="mt-4 px-3">
        {isInitialHomeLoading ? (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn(
                "flex-none bg-brand-surface animate-pulse rounded-xl",
                activeTab === "Shorts" ? "w-[120px] aspect-[9/16]" : "w-[200px] aspect-video"
              )} />
            ))}
          </div>
        ) : (filteredContent.length > 0 || activeUploads.some(u => u.type === (activeTab === "Videos" ? "Video" : "Short"))) ? (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
            {/* Background Active Uploads */}
            {activeUploads
              .filter(u => u.type === (activeTab === "Videos" ? "Video" : "Short"))
              .map((upload) => (
                <div 
                  key={upload.id} 
                  className={cn(
                    "flex-none snap-start relative group",
                    activeTab === "Shorts" ? "w-[150px]" : "w-[300px]"
                  )}
                >
                  <div className={cn(
                    "relative bg-zinc-900 border border-brand-border rounded-xl overflow-hidden mb-3 flex flex-col items-center justify-center p-4",
                    activeTab === "Shorts" ? "aspect-[9/16]" : "aspect-video"
                  )}>
                    {upload.thumbnailUrl ? (
                      <img 
                        src={upload.thumbnailUrl} 
                        alt="Thumbnail" 
                        className="absolute inset-0 w-full h-full object-cover opacity-35"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40" />
                    
                    {/* Progress Indicator */}
                    <div className="relative z-10 w-full px-3 flex flex-col items-center text-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <div className="text-[10px] font-black uppercase tracking-wider text-white">
                        {upload.step === "uploading_video" ? "Uploading Content..." :
                         upload.step === "uploading_thumbnail" ? "Uploading Cover..." :
                         "Syncing Database..."}
                      </div>
                      
                      {/* Progress Bar Container */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1 border border-white/5">
                        <div 
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/55">{Math.round(upload.progress)}%</span>
                    </div>
                  </div>
                  
                  {/* Title metadata */}
                  <div className="px-1">
                    <h4 className={cn(
                      "font-bold text-white/70 line-clamp-2 leading-tight uppercase tracking-tight",
                      activeTab === "Shorts" ? "text-[10px]" : "text-sm"
                    )}>
                      {upload.title}
                    </h4>
                    <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mt-1 animate-pulse">Uploading in Background</p>
                  </div>
                </div>
            ))}

            {filteredContent.map((post) => (
                <div 
                key={post.id} 
                className={cn(
                  "flex-none snap-start group cursor-pointer",
                  activeTab === "Shorts" ? "w-[150px]" : "w-[300px]"
                )}
                onClick={() => {
                  if (activeTab === "Shorts") navigate("/shorts");
                  else navigate(`/watch/${post.id}`);
                }}
              >
                {/* Thumbnail Container */}
                <div className={cn(
                  "relative bg-brand-surface rounded-xl overflow-hidden mb-3",
                  activeTab === "Shorts" ? "aspect-[9/16]" : "aspect-video"
                )}>
                  <img 
                    src={post.thumbnail} 
                    alt="Content preview" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay Info */}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                  
                  {post.duration && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                      <AutoDuration videoUrl={post.videoUrl} fallbackDuration={post.duration} />
                    </div>
                  )}

                  {post.isLive && (
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <div className="px-2 py-0.5 bg-blue-600 rounded text-[9px] font-black text-white uppercase tracking-wider animate-pulse">
                        Live
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Metadata */}
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={cn(
                        "font-bold text-white line-clamp-2 leading-tight uppercase tracking-tight",
                        activeTab === "Shorts" ? "text-[10px]" : "text-sm"
                      )}>
                        {post.title || post.content}
                      </h4>
                      {activeTab === "Downloads" ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromDownloads(post.id);
                          }}
                          className="p-1 -mr-1 text-brand-muted hover:text-red-500 transition-colors"
                          title="Delete download"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : activeTab === "Videos" || activeTab === "Shorts" ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(post.id, activeTab);
                          }}
                          disabled={deletingId === post.id}
                          className="p-1 -mr-1 text-brand-muted hover:text-red-500 transition-colors disabled:opacity-50"
                          title={`Delete ${activeTab === 'Videos' ? 'video' : 'short'}`}
                        >
                          {deletingId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button className="p-1 -mr-1 text-brand-muted hover:text-white transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-brand-muted font-medium hover:text-white transition-colors">
                        {post.author || post.channelName} {post.isLive && "live"}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <span>{post.views || (post.isLive ? `${post.viewers} watching` : (stats[post.id]?.views + " views") || "0 views")}</span>
                        <span>•</span>
                        <span>{post.postedAt || post.date ? formatRelativeTime(post.postedAt || post.date) : "just now"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-2">
            <h3 className="font-black text-xl text-brand-text">No {activeTab.toLowerCase()} yet</h3>
            <p className="text-brand-muted">When you post {activeTab.toLowerCase()}, they'll show up here.</p>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
