import React, { createContext, useContext, useState, useEffect } from 'react';
import { Video, Short, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { parseCount, safeJsonStringify } from '../lib/utils';
import { ShortsPreloader } from '../components/ShortsPreloader';

interface VideoStats {
  views: number;
  likes: number;
  isFollowing: boolean;
  followers: number;
}

export interface ActiveUpload {
  id: string;
  title: string;
  description: string;
  type: "Video" | "Short";
  progress: number;
  step: "uploading_video" | "uploading_thumbnail" | "saving";
  videoUrl: string;
  thumbnailUrl: string;
}

interface VideoContextType {
  stats: Record<string, VideoStats>;
  watchLater: string[];
  likedVideos: string[];
  viewedVideos: string[];
  playlists: Record<string, string[]>;
  history: string[];
  shortsHistory: string[];
  downloads: string[];
  incrementView: (videoId: string) => void;
  toggleLike: (videoId: string) => void;
  toggleFollow: (channelName: string) => void;
  toggleWatchLater: (videoId: string) => void;
  addToHistory: (videoId: string) => void;
  addToShortsHistory: (shortId: string) => void;
  addToDownloads: (videoId: string) => void;
  removeFromDownloads: (videoId: string) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistName: string, videoId: string) => void;
  isFullScreen: boolean;
  setIsFullScreen: (isFull: boolean) => void;
  homeVideos: Video[];
  setHomeVideos: React.Dispatch<React.SetStateAction<Video[]>>;
  isInitialHomeLoading: boolean;
  setIsInitialHomeLoading: (loading: boolean) => void;
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
  isGlobalMuted: boolean;
  setIsGlobalMuted: (isMuted: boolean) => void;
  shorts: Short[];
  profiles: Record<string, UserProfile>;
  refreshData: () => Promise<void>;
  activeUploads: ActiveUpload[];
  startUpload: (params: {
    title: string;
    description: string;
    type: "Video" | "Short";
    videoFile: File;
    thumbnailFile: File | null;
    thumbnailBlobUrl: string;
    duration: string;
    username: string;
    avatar?: string;
  }) => void;
  togglePinProfile?: (username: string, isPinned: boolean) => Promise<boolean>;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [homeVideos, setHomeVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [isInitialHomeLoading, setIsInitialHomeLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);

  const togglePinProfile = async (username: string, isPinned: boolean): Promise<boolean> => {
    try {
      const success = await supabaseService.togglePinProfile(username, isPinned);
      setProfiles(prev => {
        if (prev[username]) {
          return {
            ...prev,
            [username]: {
              ...prev[username],
              is_pinned: isPinned
            }
          };
        }
        return prev;
      });
      return success;
    } catch (e) {
      console.error("Error pinning profile context:", e);
      return false;
    }
  };

  const startUpload = async (params: {
    title: string;
    description: string;
    type: "Video" | "Short";
    videoFile: File;
    thumbnailFile: File | null;
    thumbnailBlobUrl: string;
    duration: string;
    username: string;
    avatar?: string;
  }) => {
    const uploadId = `upload-${Date.now()}`;
    const { title, description, type, videoFile, thumbnailFile, thumbnailBlobUrl, duration, username, avatar } = params;

    const newUpload: ActiveUpload = {
      id: uploadId,
      title: title || (type === "Short" ? "Uploading Short..." : "Uploading Video..."),
      description: description,
      type: type,
      progress: 0,
      step: "uploading_video",
      videoUrl: thumbnailBlobUrl,
      thumbnailUrl: thumbnailBlobUrl
    };

    setActiveUploads(prev => [newUpload, ...prev]);

    // Background worker
    (async () => {
      try {
        const isShort = type === "Short";
        let finalVideoUrl = "";
        let finalThumbnailUrl = thumbnailBlobUrl;

        console.log(`[UPLOAD CONTEXT] Starting background task for upload ID: ${uploadId}`);

        // 1. Upload Video
        const uploadedVideoUrl = await supabaseService.uploadFile(videoFile, isShort ? 'short' : 'video', (progress) => {
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress, step: "uploading_video" } : u));
        });
        if (!uploadedVideoUrl) throw new Error("Video upload failed to return a valid URL");
        finalVideoUrl = uploadedVideoUrl;

        console.log(`[UPLOAD CONTEXT] Uploaded video file: ${finalVideoUrl}`);

        // 2. Upload cover/thumbnail
        let thumbFileToUpload = thumbnailFile;
        if (!thumbFileToUpload && thumbnailBlobUrl && thumbnailBlobUrl.startsWith("blob:")) {
          try {
            setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, step: "uploading_thumbnail", progress: 0 } : u));
            const response = await fetch(thumbnailBlobUrl);
            const blob = await response.blob();
            thumbFileToUpload = new File([blob], `thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
          } catch (err) {
            console.error("Failed to fetch thumbnail blobs on client side:", err);
          }
        }

        if (thumbFileToUpload) {
          const uploadedThumbUrl = await supabaseService.uploadFile(thumbFileToUpload, 'image', (progress) => {
            setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress, step: "uploading_thumbnail" } : u));
          });
          if (uploadedThumbUrl) {
            finalThumbnailUrl = uploadedThumbUrl;
            console.log(`[UPLOAD CONTEXT] Uploaded cover/thumbnail file: ${finalThumbnailUrl}`);
          }
        }

        // 3. Save database records
        setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, step: "saving", progress: 99 } : u));
        const fallbackThumb = "https://picsum.photos/seed/thumb/800/450";
        const resolvedThumbnail = (finalThumbnailUrl && !finalThumbnailUrl.startsWith('blob:')) 
          ? finalThumbnailUrl 
          : fallbackThumb;

        if (isShort) {
          await supabaseService.insertShort({
            videoUrl: finalVideoUrl,
            creator: username,
            avatar: avatar || "",
            description: description || title,
            isLive: false
          });
        } else {
          await supabaseService.insertVideo({
            title: title || "Untitled Video",
            thumbnail: resolvedThumbnail,
            videoUrl: finalVideoUrl,
            channelName: username,
            channelAvatar: avatar || "",
            description: description,
            duration: duration,
            isLive: false
          });
        }

        console.log(`[UPLOAD CONTEXT] Complete DB insert for upload: ${uploadId}`);
        await loadData(false); // Silent reload of context state
        setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
      } catch (err: any) {
        console.error(`[UPLOAD CONTEXT] Error during background uploading context runner:`, err);
        alert(`Failed to complete background video load: ${err.message || err}`);
        setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
      }
    })();
  };

  const [rawStats, setRawStats] = useState<Record<string, VideoStats>>(() => {
    const saved = localStorage.getItem('streamcore_video_stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all entries have likes and views
        Object.keys(parsed).forEach(key => {
          if (typeof parsed[key] === 'object' && parsed[key] !== null) {
            if (parsed[key].likes === undefined) parsed[key].likes = 0;
            if (parsed[key].views === undefined) parsed[key].views = 0;
            if (parsed[key].followers === undefined) parsed[key].followers = 0;
            if (parsed[key].isFollowing === undefined) parsed[key].isFollowing = false;
          }
        });
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved stats:", e);
      }
    }

    const initial: Record<string, VideoStats> = {};
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.removeItem('streamcore_local_offsets');
    } catch {}
  }, []);

  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsInitialHomeLoading(true);
    supabaseService.debugCheck();
    try {
      const [dbVideos, dbShorts, dbProfiles, followedIds] = await Promise.all([
        supabaseService.getVideos(),
        supabaseService.getShorts(),
        supabaseService.getProfiles(),
        supabaseService.getFollowingChannelIds ? supabaseService.getFollowingChannelIds() : Promise.resolve([])
      ]);

      setHomeVideos(dbVideos);
      setShorts(dbShorts);
      setProfiles(dbProfiles);
      
      // Populate stats for videos that are missing them
      setRawStats(prev => {
        const next = { ...prev };

        // Sync following status for channel-level profiles first
        Object.keys(dbProfiles).forEach(channelName => {
          const channelProfile = dbProfiles[channelName];
          const isUserFollowing = channelProfile?.id ? followedIds.includes(channelProfile.id) : false;
          let actualFollowers = parseCount(channelProfile?.followers);
          if (isUserFollowing && actualFollowers < 1) {
            actualFollowers = 1;
          }
          
          if (!next[channelName]) {
            next[channelName] = {
              views: 0,
              likes: 0,
              isFollowing: isUserFollowing,
              followers: actualFollowers
            };
          } else {
            next[channelName].isFollowing = isUserFollowing;
            next[channelName].followers = actualFollowers;
          }
        });

        (dbVideos || []).forEach(v => {
          const originalId = String(v.id).includes('::') ? String(v.id).split('::')[0] : String(v.id);
          const channelName = v.channelName;
          const channelProfile = channelName ? dbProfiles[channelName] : null;
          const isUserFollowing = channelProfile?.id ? followedIds.includes(channelProfile.id) : false;
          let actualFollowers = parseCount(channelProfile?.followers);
          if (isUserFollowing && actualFollowers < 1) {
            actualFollowers = 1;
          }
          const dbViews = parseCount(v.views);
          const dbLikes = parseCount(v.likes || 0);

          if (!next[originalId]) {
            next[originalId] = {
              views: dbViews,
              likes: dbLikes,
              isFollowing: isUserFollowing,
              followers: actualFollowers
            };
          } else {
            // Regularly synchronize/update stats to match latest database values
            next[originalId].views = dbViews;
            next[originalId].likes = dbLikes;
            next[originalId].isFollowing = isUserFollowing;
            next[originalId].followers = actualFollowers;
          }
        });
        (dbShorts || []).forEach(s => {
          const channelName = s.creator;
          const channelProfile = channelName ? dbProfiles[channelName] : null;
          const isUserFollowing = channelProfile?.id ? followedIds.includes(channelProfile.id) : false;
          let actualFollowers = parseCount(channelProfile?.followers);
          if (isUserFollowing && actualFollowers < 1) {
            actualFollowers = 1;
          }
          const dbViews = parseCount(s.views);
          const dbLikes = parseCount(s.likes || 0);

          if (!next[s.id]) {
            next[s.id] = {
              views: dbViews,
              likes: dbLikes,
              isFollowing: isUserFollowing,
              followers: actualFollowers
            };
          } else {
            next[s.id].views = dbViews;
            next[s.id].likes = dbLikes;
            next[s.id].isFollowing = isUserFollowing;
            next[s.id].followers = actualFollowers;
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
    } finally {
      if (showLoading) setIsInitialHomeLoading(false);
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = async () => {
    await loadData(false);
  };

  const [watchLater, setWatchLater] = useState<string[]>(() => {
    const saved = localStorage.getItem('streamcore_watch_later');
    return saved ? JSON.parse(saved) : [];
  });

  const [likedVideos, setLikedVideos] = useState<string[]>(() => {
    const saved = localStorage.getItem('streamcore_liked_videos');
    return saved ? JSON.parse(saved) : [];
  });

  const [viewedVideos, setViewedVideos] = useState<string[]>(() => {
    const saved = localStorage.getItem('streamcore_viewed_videos');
    return saved ? JSON.parse(saved) : [];
  });

  const [playlists, setPlaylists] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('streamcore_playlists');
    return saved ? JSON.parse(saved) : { "Favorites": [] };
  });

  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('streamcore_history_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [shortsHistory, setShortsHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('streamcore_shorts_history_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [downloads, setDownloads] = useState<string[]>(() => {
    const saved = localStorage.getItem('streamcore_downloads');
    return saved ? JSON.parse(saved) : [];
  });

  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    localStorage.setItem('streamcore_video_stats', safeJsonStringify(rawStats));
  }, [rawStats]);

  useEffect(() => {
    localStorage.setItem('streamcore_watch_later', safeJsonStringify(watchLater));
  }, [watchLater]);

  useEffect(() => {
    localStorage.setItem('streamcore_liked_videos', safeJsonStringify(likedVideos));
  }, [likedVideos]);

  useEffect(() => {
    localStorage.setItem('streamcore_viewed_videos', safeJsonStringify(viewedVideos));
  }, [viewedVideos]);

  useEffect(() => {
    localStorage.setItem('streamcore_playlists', safeJsonStringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('streamcore_history_v2', safeJsonStringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('streamcore_shorts_history_v2', safeJsonStringify(shortsHistory));
  }, [shortsHistory]);

  useEffect(() => {
    localStorage.setItem('streamcore_downloads', safeJsonStringify(downloads));
  }, [downloads]);

  const getBaselineStats = (videoId: string) => {
    let initialViews = 0;
    let initialLikes = 0;
    
    const videoObj = homeVideos.find(v => {
      const originalId = String(v.id).includes('::') ? String(v.id).split('::')[0] : String(v.id);
      return originalId === videoId || String(v.id) === videoId;
    });
    if (videoObj) {
      initialViews = parseCount(videoObj.views);
      initialLikes = parseCount(videoObj.likes);
    } else {
      const shortObj = shorts.find(s => String(s.id) === videoId);
      if (shortObj) {
        initialViews = parseCount(shortObj.views);
        initialLikes = parseCount(shortObj.likes);
      }
    }
    return { views: initialViews, likes: initialLikes };
  };

  const incrementView = (videoId: string) => {
    setViewedVideos(prev => {
      // If already viewed in the current state, don't increment view count (ensures 1 user is 1 viewer)
      if (prev.includes(videoId)) return prev;

      setRawStats(prevRaw => {
        const next = { ...prevRaw };
        const videoObj = homeVideos.find(v => {
          const originalId = String(v.id).includes('::') ? String(v.id).split('::')[0] : String(v.id);
          return originalId === videoId || String(v.id) === videoId;
        });
        const shortObj = shorts.find(s => String(s.id) === videoId);
        const baselineViews = videoObj ? parseCount(videoObj.views) : (shortObj ? parseCount(shortObj.views) : 0);
        const baselineLikes = videoObj ? parseCount(videoObj.likes) : (shortObj ? parseCount(shortObj.likes) : 0);

        if (!next[videoId]) {
          next[videoId] = {
            views: baselineViews + 1,
            likes: baselineLikes,
            isFollowing: false,
            followers: 0
          };
        } else {
          next[videoId] = {
            ...next[videoId],
            views: next[videoId].views + 1
          };
        }
        return next;
      });

      // Fire and forget backend call
      supabaseService.incrementView(videoId);

      return [videoId, ...prev];
    });
  };

  const toggleLike = (videoId: string) => {
    // Determine action based on current state
    const alreadyLiked = likedVideos.includes(videoId);

    setRawStats(prevRaw => {
      const next = { ...prevRaw };
      const videoObj = homeVideos.find(v => {
        const originalId = String(v.id).includes('::') ? String(v.id).split('::')[0] : String(v.id);
        return originalId === videoId || String(v.id) === videoId;
      });
      const shortObj = shorts.find(s => String(s.id) === videoId);
      const baselineViews = videoObj ? parseCount(videoObj.views) : (shortObj ? parseCount(shortObj.views) : 0);
      const baselineLikes = videoObj ? parseCount(videoObj.likes) : (shortObj ? parseCount(shortObj.likes) : 0);

      const change = alreadyLiked ? -1 : 1;

      if (!next[videoId]) {
        next[videoId] = {
          views: baselineViews,
          likes: Math.max(0, baselineLikes + change),
          isFollowing: false,
          followers: 0
        };
      } else {
        next[videoId] = {
          ...next[videoId],
          likes: Math.max(0, next[videoId].likes + change)
        };
      }
      return next;
    });

    // Update Liked Videos list
    setLikedVideos(prev => {
      const isActuallyLiked = prev.includes(videoId);
      if (alreadyLiked !== isActuallyLiked) return prev; // Guard against rapid clicks

      return alreadyLiked 
        ? prev.filter(id => id !== videoId) 
        : [videoId, ...prev];
    });

    // Backend call (Fire and forget)
    supabaseService.toggleLike(videoId);
  };

  const toggleWatchLater = (videoId: string) => {
    setWatchLater(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId) 
        : [videoId, ...prev]
    );
  };

  const addToHistory = (videoId: string) => {
    setHistory(prev => [videoId, ...prev.filter(id => id !== videoId)].slice(0, 50));
  };

  const addToShortsHistory = (shortId: string) => {
    setShortsHistory(prev => [shortId, ...prev.filter(id => id !== shortId)].slice(0, 50));
  };

  const addToDownloads = (videoId: string) => {
    setDownloads(prev => [videoId, ...prev.filter(id => id !== videoId)]);
  };

  const removeFromDownloads = (videoId: string) => {
    setDownloads(prev => prev.filter(id => id !== videoId));
  };

  const createPlaylist = (name: string) => {
    setPlaylists(prev => ({ ...prev, [name]: [] }));
  };

  const addToPlaylist = (playlistName: string, videoId: string) => {
    setPlaylists(prev => ({
      ...prev,
      [playlistName]: [...new Set([...(prev[playlistName] || []), videoId])]
    }));
  };

  const toggleFollow = (channelName: string) => {
    // Get target profile ID
    const targetProfile = profiles[channelName];
    if (targetProfile?.id) {
      supabaseService.toggleFollow(targetProfile.id);
    }

    // Capture precise follow flag at clicking instant to avoid race conditions
    const currentlyFollowing = !!rawStats[channelName]?.isFollowing;

    setProfiles(prevProfiles => {
      const nextProfiles = { ...prevProfiles };
      if (nextProfiles[channelName]) {
        const currentFollowers = parseCount(nextProfiles[channelName].followers);
        const updatedFollowers = currentlyFollowing 
          ? Math.max(0, currentFollowers - 1) 
          : currentFollowers + 1;
        
        nextProfiles[channelName] = {
          ...nextProfiles[channelName],
          followers: updatedFollowers
        };
      }
      return nextProfiles;
    });

    setRawStats(prev => {
      const newStats = { ...prev };
      
      const channelProfile = profiles[channelName];
      const initialFollowers = channelProfile ? parseCount(channelProfile.followers) : 0;

      // Update channel-level stat
      if (!newStats[channelName]) {
        newStats[channelName] = { views: 0, likes: 0, isFollowing: currentlyFollowing, followers: initialFollowers };
      }
      
      newStats[channelName] = {
        ...newStats[channelName],
        isFollowing: !currentlyFollowing,
        followers: currentlyFollowing ? Math.max(0, newStats[channelName].followers - 1) : newStats[channelName].followers + 1
      };

      // Sync all videos from this channel
      homeVideos.forEach(v => {
        if (v.channelName === channelName) {
          const currentVideoStat = newStats[v.id] || { views: 0, likes: 0, isFollowing: currentlyFollowing, followers: initialFollowers };
          newStats[v.id] = {
            ...currentVideoStat,
            isFollowing: !currentlyFollowing,
            followers: currentlyFollowing ? Math.max(0, currentVideoStat.followers - 1) : currentVideoStat.followers + 1
          };
        }
      });
      return newStats;
    });
  };

  const computedStats = React.useMemo(() => {
    const computed: Record<string, VideoStats> = {};
    
    // Copy raw database stats directly
    Object.keys(rawStats).forEach(id => {
      computed[id] = {
        ...rawStats[id]
      };
    });

    // Handle any homeVideos or shorts that aren't yet tracked in rawStats state
    const addMissing = (id: string, views: number, likes: number) => {
      if (!computed[id]) {
        computed[id] = {
          views: Math.max(0, views),
          likes: Math.max(0, likes),
          isFollowing: false,
          followers: 0
        };
      }
    };

    homeVideos.forEach(v => {
      const originalId = String(v.id).includes('::') ? String(v.id).split('::')[0] : String(v.id);
      addMissing(originalId, parseCount(v.views), parseCount(v.likes || 0));
    });
    
    shorts.forEach(s => {
      addMissing(s.id, parseCount(s.views), parseCount(s.likes || 0));
    });

    return computed;
  }, [rawStats, homeVideos, shorts]);

  const contextValue = React.useMemo(() => ({ 
    stats: computedStats, 
    watchLater, 
    likedVideos,
    viewedVideos,
    playlists, 
    history, 
    shortsHistory,
    downloads,
    incrementView, 
    toggleLike,
    toggleFollow,
    toggleWatchLater,
    addToHistory,
    addToShortsHistory,
    addToDownloads,
    removeFromDownloads,
    createPlaylist,
    addToPlaylist,
    isFullScreen,
    setIsFullScreen,
    homeVideos,
    setHomeVideos,
    isInitialHomeLoading,
    setIsInitialHomeLoading,
    isLive,
    setIsLive,
    isGlobalMuted,
    setIsGlobalMuted,
    shorts,
    profiles,
    refreshData,
    activeUploads,
    startUpload,
    togglePinProfile
  }), [
    computedStats, 
    watchLater, 
    likedVideos,
    viewedVideos,
    playlists, 
    history, 
    shortsHistory, 
    downloads, 
    isFullScreen, 
    homeVideos, 
    isInitialHomeLoading, 
    isLive,
    isGlobalMuted,
    shorts,
    profiles,
    refreshData,
    activeUploads,
    startUpload,
    togglePinProfile
  ]);

  return (
    <VideoContext.Provider value={contextValue}>
      {children}
      <ShortsPreloader />
    </VideoContext.Provider>
  );
};

export const useVideoStats = () => {
  const context = useContext(VideoContext);
  if (!context) throw new Error('useVideoStats must be used within a VideoProvider');
  return context;
};
