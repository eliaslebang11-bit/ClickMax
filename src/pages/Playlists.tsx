import React from "react";
import { Link } from "react-router-dom";
import { useVideoStats } from "../context/VideoContext";
import { ListVideo, Play, MoreVertical, Share2, Trash2 } from "lucide-react";

export default function Playlists() {
  const { playlists, homeVideos } = useVideoStats();

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Your Playlists</h1>
        <p className="text-brand-muted font-medium">Organize and save your favorite content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Object.entries(playlists).map(([name, videoIds]) => {
          const playlistVideos = videoIds.map(id => homeVideos.find(v => v.id === id)).filter((v): v is typeof homeVideos[0] => Boolean(v));
          const firstVideo = playlistVideos[0];

          return (
            <div key={name} className="space-y-4 group">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-brand-surface border border-brand-border">
                {firstVideo ? (
                  <img src={firstVideo.thumbnail} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-text/5">
                    <ListVideo className="w-12 h-12 text-brand-muted opacity-20" />
                  </div>
                )}
                <div className="absolute inset-y-0 right-0 w-1/3 bg-brand-bg/90 backdrop-blur-xl flex flex-col items-center justify-center gap-2 border-l border-white/10">
                  <span className="text-2xl font-black">{videoIds.length}</span>
                  <ListVideo className="w-6 h-6" />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Link 
                    to={firstVideo ? `/watch/${firstVideo.id}` : "#"} 
                    className="w-16 h-16 rounded-full bg-brand-text text-brand-bg flex items-center justify-center scale-75 group-hover:scale-100 transition-transform"
                  >
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </Link>
                </div>
              </div>
              
              <div className="flex items-start justify-between px-2">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{name}</h3>
                  <p className="text-sm font-medium text-brand-muted">
                    {videoIds.length} videos • Updated today
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-brand-text/5 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5 text-brand-muted" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {playlistVideos.slice(0, 3).map((video) => (
                  <Link 
                    key={video.id} 
                    to={`/watch/${video.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-brand-text/5 rounded-xl transition-colors group/item"
                  >
                    <div className="w-12 aspect-video rounded-lg overflow-hidden bg-brand-bg">
                      <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold line-clamp-1 group-hover/item:text-brand-text transition-colors">
                      {video.title}
                    </span>
                  </Link>
                ))}
                {videoIds.length > 3 && (
                  <button className="w-full py-2 text-[10px] font-bold text-brand-muted hover:text-brand-text transition-colors">
                    + {videoIds.length - 3} more videos
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button className="aspect-video rounded-3xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-4 hover:bg-brand-text/5 hover:border-brand-text/20 transition-all group">
          <div className="w-16 h-16 rounded-full bg-brand-text/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ListVideo className="w-8 h-8 text-brand-muted" />
          </div>
          <span className="text-sm font-bold text-brand-muted">Create new playlist</span>
        </button>
      </div>
    </div>
  );
}
