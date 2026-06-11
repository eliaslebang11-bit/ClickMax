import React, { useState, useEffect } from "react";
import { useVideoStats } from "../context/VideoContext";
import { supabaseService } from "../services/supabaseService";
import CustomVideoPlayer from "../components/CustomVideoPlayer";
import { Link, useNavigate } from "react-router-dom";
import { Video } from "../types";
import { 
  Tv, 
  Sparkles, 
  Play, 
  Info, 
  Cpu, 
  Layers, 
  Wifi, 
  ArrowRight,
  PlusCircle,
  ThumbsUp,
  MessageSquare
} from "lucide-react";
import { cn, formatCount, formatRelativeTime } from "../lib/utils";
import ThumbnailMedia from "../components/ThumbnailMedia";

export default function StreamFeed() {
  const { homeVideos, refreshData } = useVideoStats();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  // Get all videos for the stream feed
  const streamVideos = homeVideos;
  const allVideos = homeVideos;

  useEffect(() => {
    // Refresh the videos list when mounting
    refreshData();
  }, []);

  useEffect(() => {
    // Select the first video automatically
    if (!selectedVideo && allVideos.length > 0) {
      setSelectedVideo(allVideos[0]);
    }
  }, [homeVideos, allVideos.length]);

  const getHlsUrl = (video: Video) => {
    return video.cloudflareId || video.videoUrl;
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-neutral-950">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 pb-32">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <Wifi className="w-3.5 h-3.5" /> Supabase Storage
              </span>
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-brand-muted text-[10px] font-bold uppercase">
                Native Playback
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
              Direct Stream Feed
            </h1>
            <p className="text-sm text-brand-muted">
              Premium playback sourcing videos directly from secure Supabase static content storage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/add-content")}
              className="px-5 py-3 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              <PlusCircle className="w-4 h-4" />
              Upload Stream
            </button>
          </div>
        </div>

        {/* Hero Interactive Split Feed Player */}
        {selectedVideo ? (
          <div id="cloudflare-feed-display" className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden p-4 md:p-6 lg:p-8 backdrop-blur-xl">
            {/* Real-time HLS Video Window */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black group/player">
                <CustomVideoPlayer 
                  key={selectedVideo.id}
                  src={getHlsUrl(selectedVideo)}
                  poster={selectedVideo.thumbnail}
                  autoPlay={true}
                />
              </div>

              <div className="space-y-3 px-1 pt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Supabase CDN Active
                  </span>
                  <span className="bg-white/5 border border-white/10 text-brand-muted px-2 py-1 rounded font-bold uppercase tracking-tight">
                    {selectedVideo.category || "General"}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {selectedVideo.title}
                </h2>

                <p className="text-sm text-brand-muted whitespace-pre-line leading-relaxed max-w-4xl">
                  {selectedVideo.description || "No description provided for this stream."}
                </p>

                {/* Stream Technical Metadata Inspector */}
                <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Video ID (Supabase)</span>
                    <p className="font-mono text-xs text-white truncate">{selectedVideo.id}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Storage Bucket</span>
                    <p className="font-mono text-xs text-blue-400 truncate">
                      videos
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Delivery Protocol</span>
                    <p className="font-mono text-xs text-green-400">
                      S3 Direct / HTTPS CDN
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Publish Timestamp</span>
                    <p className="font-mono text-xs text-white truncate">
                      {selectedVideo.postedAt ? new Date(selectedVideo.postedAt).toLocaleString() : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Feed Sidebar Selection List */}
            <div className="lg:col-span-4 flex flex-col gap-4 h-[500px] lg:h-auto">
              <div className="px-2">
                <h3 className="font-bold text-sm uppercase tracking-wide text-brand-muted flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-accent animate-spin-slow" /> 
                  Channel Video Streams
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {allVideos.length === 0 ? (
                  <div className="text-center py-12 bg-neutral-900/30 rounded-2xl border border-white/5">
                    <p className="text-brand-muted text-sm">No videos found. Upload a video to start the stream!</p>
                  </div>
                ) : (
                  allVideos.map((video) => {
                    const isCurrent = selectedVideo.id === video.id;
                    const isCF = !!video.cloudflareId;

                    return (
                      <div
                        key={video.id}
                        onClick={() => setSelectedVideo(video)}
                        className={cn(
                          "group p-3 rounded-2xl cursor-pointer transition-all flex gap-3 border",
                          isCurrent 
                            ? "bg-white/10 border-white/20 shadow-2xl" 
                            : "bg-white/[0.01] border-white/5 hover:bg-white/5 hover:border-white/10"
                        )}
                      >
                        <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-brand-bg flex-shrink-0 border border-white/5">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                              <Play className="w-5 h-5 text-white/20" />
                            </div>
                          )}
                          
                          <div className="absolute top-1 left-1 px-1 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase shadow-lg tracking-wider">
                            Direct
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className={cn(
                            "text-sm font-bold line-clamp-1 transition-colors",
                            isCurrent ? "text-white" : "text-neutral-300 group-hover:text-white"
                          )}>
                            {video.title}
                          </h4>
                          <span className="text-[10px] text-brand-muted mt-1 truncate">
                            {video.channelName}
                          </span>
                          <span className="text-[9px] text-brand-muted/70 mt-0.5 gap-1 inline-flex items-center">
                            {formatCount(typeof video.views === 'number' ? video.views : parseInt(String(video.views || 0), 10) || 0)} views • {formatRelativeTime(video.postedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
            <Tv className="w-16 h-16 mx-auto text-brand-muted animate-pulse" />
            <h3 className="text-xl font-bold">No streams found</h3>
            <p className="text-brand-muted text-sm max-w-md mx-auto">
              Ready to view video feeds? Click upload above to upload video files directly into Supabase Storage!
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
