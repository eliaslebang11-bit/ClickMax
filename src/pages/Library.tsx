import React from "react";
import { Link } from "react-router-dom";
import { useVideoStats } from "../context/VideoContext";
import { Clock, ListVideo, ThumbsUp, Play, ChevronRight, Download } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import AutoDuration from "../components/AutoDuration";

const VideoRow = ({ title, icon: Icon, videos, to }: { title: string, icon: any, videos: any[], to: string }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-brand-text" />
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <span className="text-sm font-medium text-brand-muted ml-2">{videos.length}</span>
      </div>
      <Link to={to} className="text-xs font-bold text-brand-muted hover:text-brand-text transition-colors flex items-center gap-1">
        View all <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {videos.length > 0 ? (
        videos.slice(0, 5).map((video) => (
          <Link key={video.id} to={`/watch/${video.id}`} className="group space-y-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-brand-surface border border-brand-border">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold text-white">
                <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
              </div>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-brand-text text-brand-bg flex items-center justify-center scale-75 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 fill-current" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-brand-text transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-brand-muted">{video.channelName}</p>
            </div>
          </Link>
        ))
      ) : (
        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-3 bg-brand-surface rounded-2xl border border-brand-border border-dashed">
          <Icon className="w-8 h-8 text-brand-muted opacity-20" />
          <p className="text-sm text-brand-muted font-medium">No videos here yet.</p>
        </div>
      )}
    </div>
  </div>
);

export default function Library() {
  const { history, watchLater, playlists, downloads, homeVideos } = useVideoStats();
  
  const historyVideos = history.map(id => homeVideos.find(v => v.id === id)).filter(Boolean);
  const watchLaterVideos = watchLater.map(id => homeVideos.find(v => v.id === id)).filter(Boolean);
  const favoriteVideos = (playlists["Favorites"] || []).map(id => homeVideos.find(v => v.id === id)).filter(Boolean);
  const downloadVideos = downloads.map(id => homeVideos.find(v => v.id === id)).filter(Boolean);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto space-y-12 p-4 md:p-8 pb-32 md:pb-20">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">Library</h1>
        </div>

      <VideoRow 
        title="History" 
        icon={Clock} 
        videos={historyVideos} 
        to="/history" 
      />

      <VideoRow 
        title="Favorites" 
        icon={ThumbsUp} 
        videos={favoriteVideos} 
        to="/playlists" 
      />

      <VideoRow 
        title="Downloads" 
        icon={Download} 
        videos={downloadVideos} 
        to="/downloads" 
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-brand-text" />
            <h2 className="text-xl font-bold tracking-tight">Playlists</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(playlists).map(([name, videoIds]) => (
            <Link 
              key={name} 
              to="/playlists" 
              className="bg-brand-surface border border-brand-border rounded-2xl p-6 hover:bg-brand-text/5 transition-all group"
            >
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 bg-brand-bg rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ListVideo className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">{name}</h3>
                  <p className="text-xs text-brand-muted">{videoIds.length} videos</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
