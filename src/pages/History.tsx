import React from "react";
import { Link } from "react-router-dom";
import { useVideoStats } from "../context/VideoContext";
import { Clock, Play, Trash2, Search, Filter } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import AutoDuration from "../components/AutoDuration";

export default function History() {
  const { history, homeVideos } = useVideoStats();
  const historyVideos = history.map(id => homeVideos.find(v => v.id === id)).filter(Boolean);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Watch History</h1>
            <p className="text-brand-muted font-medium">Keep track of what you've watched.</p>
          </div>
        <div className="flex items-center gap-3">
          <button className="p-2 bg-brand-surface border border-brand-border rounded-full hover:bg-brand-text/5 transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 bg-brand-surface border border-brand-border px-4 py-2 rounded-full font-bold text-sm hover:bg-brand-text/5 transition-colors">
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {historyVideos.length > 0 ? (
          historyVideos.map((video, index) => (
            <Link 
              key={`${video.id}-${index}`} 
              to={`/watch/${video.id}`} 
              className="group flex flex-col sm:flex-row gap-4 p-4 bg-brand-surface border border-brand-border rounded-2xl hover:bg-brand-text/5 transition-all"
            >
              <div className="relative w-full sm:w-64 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-brand-bg">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold text-white">
                  <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
                </div>
              </div>
              <div className="flex-1 space-y-2 py-2">
                <h3 className="text-lg font-bold line-clamp-2 leading-tight group-hover:text-brand-text transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <span className="font-bold text-brand-text/80">{video.channelName}</span>
                  <span>•</span>
                  <span>{video.views} views</span>
                  <span>•</span>
                  <span>Watched {formatRelativeTime(new Date().toISOString())}</span>
                </div>
                <p className="text-sm text-brand-muted line-clamp-2 leading-relaxed">
                  {video.description}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 bg-brand-surface rounded-3xl border border-brand-border border-dashed">
            <div className="w-20 h-20 bg-brand-bg rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-brand-muted opacity-20" />
            </div>
            <div>
              <h3 className="text-xl font-bold">No watch history</h3>
              <p className="text-brand-muted text-sm max-w-xs mx-auto">Videos you watch will show up here for easy access.</p>
            </div>
            <Link to="/" className="px-8 py-3 bg-brand-text text-brand-bg rounded-full font-bold text-sm hover:opacity-90 transition-all">
              Explore Videos
            </Link>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
