import React, { createContext, useContext, useState, useEffect } from 'react';
import { Video, Short, UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { parseCount, safeJsonStringify } from '../lib/utils';

interface VideoStats {
  views: number;
  likes: number;
  isFollowing: boolean;
  followers: number;
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
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [homeVideos, setHomeVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [isInitialHomeLoading, setIsInitialHomeLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);

  const [stats, setStats] = useState<Record<string, VideoStats>>(() => {
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

  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsInitialHomeLoading(true);
    supabaseService.debugCheck();
    try {
      const [dbVideos, dbShorts, dbProfiles] = await Promise.all([
        supabaseService.getVideos(),
        supabaseService.getShorts(),
        supabaseService.getProfiles()
      ]);

      setHomeVideos(dbVideos);
      setShorts(dbShorts);
      setProfiles(dbProfiles);
      
      // Populate stats for videos that are missing them
      setStats(prev => {
        const next = { ...prev };
        (dbVideos || []).forEach(v => {
          const originalId = String(v.id).includes('::') ? String(v.id).split('::')[0] : String(v.id);
          const channelName = v.channelName;
          const channelProfile = channelName ? dbProfiles[channelName] : null;
          const actualFollowers = channelProfile ? Number(channelProfile.followers ?? 0) : 0;
          const dbViews = parseCount(v.views);
          const dbLikes = parseCount(v.likes || 0);

          if (!next[originalId]) {
            next[originalId] = {
              views: dbViews,
              likes: dbLikes,
              isFollowing: false,
              followers: actualFollowers
            };
          } else {
            // Regularly synchronize/update stats to match latest database values
            next[originalId].views = Math.max(next[originalId].views, dbViews);
            next[originalId].likes = Math.max(next[originalId].likes, dbLikes);
            next[originalId].followers = actualFollowers;
          }
        });
        (dbShorts || []).forEach(s => {
          const channelName = s.creator;
          const channelProfile = channelName ? dbProfiles[channelName] : null;
          const actualFollowers = channelProfile ? Number(channelProfile.followers ?? 0) : 0;
          const dbViews = parseCount(s.views);
          const dbLikes = parseCount(s.likes || 0);

          if (!next[s.id]) {
            next[s.id] = {
              views: dbViews,
              likes: dbLikes,
              isFollowing: false,
              followers: actualFollowers
            };
          } else {
            next[s.id].views = Math.max(next[s.id].views, dbViews);
            next[s.id].likes = Math.max(next[s.id].likes, dbLikes);
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
    localStorage.setItem('streamcore_video_stats', safeJsonStringify(stats));
  }, [stats]);

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
      // If already viewed, don't increment view count in stats
      if (prev.includes(videoId)) return prev;

      // Increment global stats only for unique view per account
      setStats(prevStats => {
        const baseline = getBaselineStats(videoId);
        const currentStat = prevStats[videoId] || { 
          views: baseline.views, 
          likes: baseline.likes, 
          isFollowing: false, 
          followers: 0 
        };
        
        const mergedViews = Math.max(currentStat.views, baseline.views);
        const mergedLikes = Math.max(currentStat.likes, baseline.likes);

        return {
          ...prevStats,
          [videoId]: {
            ...currentStat,
            views: mergedViews + 1,
            likes: mergedLikes
          }
        };
      });

      return [videoId, ...prev];
    });
  };

  const toggleLike = (videoId: string) => {
    // Determine action based on current state
    const alreadyLiked = likedVideos.includes(videoId);

    // Update global stats independently
    setStats(prevStats => {
      const baseline = getBaselineStats(videoId);
      const currentStat = prevStats[videoId] || { 
        views: baseline.views, 
        likes: baseline.likes, 
        isFollowing: false, 
        followers: 0 
      };

      const mergedViews = Math.max(currentStat.views, baseline.views);
      const mergedLikes = Math.max(currentStat.likes, baseline.likes);
      const newLikes = alreadyLiked ? Math.max(0, mergedLikes - 1) : mergedLikes + 1;
      
      // If no actual change in number, just return same state object to avoid downstream re-renders
      if (currentStat.likes === newLikes && currentStat.views === mergedViews) return prevStats;

      return {
        ...prevStats,
        [videoId]: {
          ...currentStat,
          views: mergedViews,
          likes: newLikes
        }
      };
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

    setStats(prev => {
      const newStats = { ...prev };
      
      const channelProfile = profiles[channelName];
      const initialFollowers = channelProfile ? Number(channelProfile.followers ?? 0) : 0;

      // Update channel-level stat
      if (!newStats[channelName]) {
        newStats[channelName] = { views: 0, likes: 0, isFollowing: false, followers: initialFollowers };
      }
      const currentlyFollowing = newStats[channelName].isFollowing;
      newStats[channelName] = {
        ...newStats[channelName],
        isFollowing: !currentlyFollowing,
        followers: currentlyFollowing ? newStats[channelName].followers - 1 : newStats[channelName].followers + 1
      };

      // Sync all videos from this channel
      homeVideos.forEach(v => {
        if (v.channelName === channelName) {
          const currentVideoStat = newStats[v.id] || { views: 0, likes: 0, isFollowing: false, followers: initialFollowers };
          newStats[v.id] = {
            ...currentVideoStat,
            isFollowing: !currentlyFollowing,
            followers: currentlyFollowing ? currentVideoStat.followers - 1 : currentVideoStat.followers + 1
          };
        }
      });
      return newStats;
    });
  };

  const contextValue = React.useMemo(() => ({ 
    stats, 
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
    refreshData
  }), [
    stats, 
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
    refreshData
  ]);

  return (
    <VideoContext.Provider value={contextValue}>
      {children}
    </VideoContext.Provider>
  );
};

export const useVideoStats = () => {
  const context = useContext(VideoContext);
  if (!context) throw new Error('useVideoStats must be used within a VideoProvider');
  return context;
};
