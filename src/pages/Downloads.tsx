import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVideoStats } from "../context/VideoContext";
import { Download, Play, MoreVertical, Trash2, ChevronLeft } from "lucide-react";
import { cn, formatRelativeTime } from "../lib/utils";
import AnimatedCounter from "../components/AnimatedCounter";
import AutoDuration from "../components/AutoDuration";

export default function Downloads() {
  const navigate = useNavigate();
  const { downloads, removeFromDownloads, stats, homeVideos } = useVideoStats();
  
  const downloadedVideos = downloads
    .map(id => homeVideos.find(v => v.id === id))
    .filter((v): v is typeof homeVideos[0] => !!v);

  return (
    <div className="w-full bg-brand-bg min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-brand-surface rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black tracking-tight">Downloads</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {downloadedVideos.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-muted font-medium">
                {downloadedVideos.length} {downloadedVideos.length === 1 ? 'video' : 'videos'} downloaded
              </p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {downloadedVideos.map((video) => {
                const vStat = stats[video.id];
                return (
                  <div 
                    key={video.id} 
                    className="group cursor-pointer"
                    onClick={() => navigate(`/watch/${video.id}`)}
                  >
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-brand-surface border border-brand-border">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[10px] font-bold text-white">
                        <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
                      </div>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                          <Play className="w-6 h-6 fill-white text-white ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight uppercase tracking-tight">
                            {video.title}
                          </h4>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromDownloads(video.id);
                            }}
                            className="p-2 -mr-2 text-brand-muted hover:text-red-500 transition-colors"
                            title="Remove from downloads"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-brand-muted font-medium hover:text-white transition-colors">
                            {video.channelName}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-brand-muted">
                            <span><AnimatedCounter value={vStat?.views || 0} /> views</span>
                            <span>•</span>
                            <span>{formatRelativeTime(video.postedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="w-12 h-12 text-brand-muted" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">No downloads yet</h2>
              <p className="text-brand-muted max-w-xs mx-auto">
                Videos you download will appear here for offline viewing.
              </p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-brand-text text-brand-bg rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              Explore Videos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
