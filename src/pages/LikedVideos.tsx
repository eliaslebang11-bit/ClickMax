import React from "react";
import { Link } from "react-router-dom";
import { useVideoStats } from "../context/VideoContext";
import { ThumbsUp, Play, MoreVertical, Share2 } from "lucide-react";
import AutoDuration from "../components/AutoDuration";

export default function LikedVideos() {
  const { homeVideos, likedVideos: likedVideoIds } = useVideoStats();
  
  const likedVideos = homeVideos.filter(v => likedVideoIds.includes(v.id));

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto space-y-12 p-4 md:p-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-end gap-8">
        <div className="w-full md:w-80 aspect-video md:aspect-[3/4] rounded-3xl overflow-hidden relative group bg-brand-surface border border-brand-border">
          <img src={likedVideos[0]?.thumbnail} alt="Liked" className="w-full h-full object-cover blur-xl opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/40 to-transparent p-8 flex flex-col justify-end gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-text text-brand-bg flex items-center justify-center shadow-2xl">
              <ThumbsUp className="w-8 h-8 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Liked Videos</h1>
              <p className="text-sm font-medium text-brand-muted mt-2">
                {likedVideos.length} videos • Updated today
              </p>
            </div>
            <button className="w-full py-4 bg-brand-text text-brand-bg rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              Play All
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {likedVideos.map((video, index) => (
            <Link 
              key={video.id} 
              to={`/watch/${video.id}`}
              className="group flex items-center gap-4 p-3 hover:bg-brand-text/5 rounded-2xl transition-all"
            >
              <span className="w-6 text-xs font-bold text-brand-muted text-center group-hover:text-brand-text transition-colors">
                {index + 1}
              </span>
              <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-brand-bg flex-shrink-0">
                <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[8px] font-bold text-white">
                  <AutoDuration videoUrl={video.videoUrl} fallbackDuration={video.duration} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold line-clamp-1 group-hover:text-brand-text transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-brand-muted mt-1">
                  {video.channelName} • {video.views} views
                </p>
              </div>
              <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-5 h-5 text-brand-muted" />
              </button>
            </Link>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
