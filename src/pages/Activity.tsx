import React, { useState, useCallback } from "react";
import { History as HistoryIcon, Users, PlayCircle, Clock, ChevronRight, Bell, Check, Download, PlaySquare, CheckCircle2, MessageSquare, Send, ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useVideoStats } from "../context/VideoContext";
import TruncatedText from "../components/TruncatedText";
import ThumbnailMedia from "../components/ThumbnailMedia";
import { motion, AnimatePresence } from "motion/react";
import { useNotifications } from "../context/NotificationContext";

const SubscriptionItem = ({ video }: { video: any }) => {
  const { stats, toggleFollow } = useVideoStats();
  const videoStat = stats[video.channelName]; // Use channelName for subscription status
  const isFollowing = videoStat?.isFollowing ?? false;

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer relative w-20">
      <div className="relative">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-brand-border p-1 group-hover:border-brand-text/30 transition-all duration-300">
          <img 
            src={video.channelAvatar} 
            alt={video.channelName} 
            className="w-full h-full rounded-full object-cover bg-brand-surface" 
            referrerPolicy="no-referrer"
          />
        </div>
        {isFollowing && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-text text-brand-bg rounded-full flex items-center justify-center shadow-lg border-2 border-brand-bg">
            <Check className="w-2.5 h-2.5" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1.5 w-full">
        <span className="text-[10px] font-bold text-brand-text truncate w-full text-center group-hover:text-brand-text/80 transition-colors">
          {video.channelName}
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleFollow(video.channelName);
          }}
          className={cn(
            "w-full py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider transition-all active:scale-95",
            isFollowing 
              ? "bg-brand-surface text-brand-text border border-brand-border hover:bg-brand-border" 
              : "bg-brand-text text-brand-bg hover:bg-brand-text/90"
          )}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );
};

export default function Activity() {
  const { history, shortsHistory, homeVideos, shorts, stats } = useVideoStats();
  const [activeTab, setActiveTab ] = useState<'notification' | 'messages' | 'history'>('notification');
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const historyVideos = history
    .map(id => homeVideos.find(v => v.id === id))
    .filter((v): v is typeof homeVideos[0] => !!v);

  const recentShorts = shortsHistory
    .map(id => shorts.find(s => s.id === id))
    .filter((s): s is typeof shorts[0] => !!s);

  const followedChannels = Array.from(new Set(homeVideos.map(v => v.channelName)))
    .filter(channelName => stats[channelName]?.isFollowing)
    .map(channelName => homeVideos.find(v => v.channelName === channelName))
    .filter((v): v is typeof homeVideos[0] => !!v);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-brand-bg">
      {/* Top Navigation Bar with lines underneath */}
      <div className="sticky top-0 z-10 bg-brand-bg/95 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center gap-10 md:gap-16">
            {(['notification', 'messages', 'history'] as const).map((tab) => {
              const label = tab === 'notification' ? 'Notification' : tab === 'messages' ? 'Messages' : 'History';
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                  }}
                  className={cn(
                    "py-4 font-black text-sm uppercase tracking-wider relative transition-colors duration-200 outline-none",
                    isActive ? "text-brand-text" : "text-brand-muted hover:text-brand-text"
                  )}
                >
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-text rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'notification' && (
            <motion.div
              key="notification-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto p-4 md:p-8 pb-32"
            >
              <div className="flex items-center justify-end mb-6">
                {notifications.some(n => !n.isRead) && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-brand-muted hover:text-brand-text transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      "p-4 rounded-xl transition-all cursor-pointer group flex gap-4 items-start border border-transparent hover:border-brand-border",
                      notification.isRead 
                        ? "bg-brand-surface/20" 
                        : "bg-brand-surface border-brand-border/40"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={notification.avatar} 
                        alt={notification.user} 
                        className="w-10 h-10 rounded-full object-cover border border-brand-border bg-brand-surface"
                      />
                      {!notification.isRead && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand-text rounded-full border-2 border-brand-bg animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[13px] leading-relaxed text-brand-text">
                        <span className="font-bold">{notification.user}</span>{" "}
                        <span className="text-brand-muted">{notification.content}</span>
                      </p>
                      <span className="text-[10px] font-medium text-brand-muted/70 block">
                        {notification.timestamp}
                      </span>
                    </div>

                    {notification.targetThumbnail && (
                      <div className="flex-shrink-0 w-12 aspect-square rounded-lg overflow-hidden border border-brand-border bg-brand-surface mt-0.5">
                        <img 
                          src={notification.targetThumbnail} 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                          alt="Target" 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center">
                    <Bell className="w-8 h-8 text-brand-muted" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">All caught up!</h3>
                    <p className="text-sm text-brand-muted">No new notifications at this moment.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="messages-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center py-20 text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-brand-surface/80 border border-brand-border flex items-center justify-center text-brand-muted">
                <MessageSquare className="w-10 h-10 text-brand-text" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight italic">Direct Messages</h2>
                <div className="inline-block bg-brand-text text-brand-bg text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full">
                  Upcoming Feature
                </div>
                <p className="text-sm font-medium text-brand-muted leading-relaxed pt-2">
                  We are building an immersive real-time chat interface. Soon, you will be able to start encrypted high-fidelity direct messaging threads with creators, hosts, and other video enthusiasts in our ecosystem.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 pb-32"
            >
              {/* Quick Links Section */}
              <section className="space-y-0.5">
                <Link to="/me" className="flex items-center gap-4 px-2 py-2.5 hover:bg-white/5 transition-colors group">
                  <PlaySquare className="w-6 h-6 text-white" />
                  <span className="text-lg font-medium text-white">Your videos</span>
                </Link>
                <Link to="/downloads" className="flex items-center justify-between px-2 py-2.5 hover:bg-white/5 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <Download className="w-6 h-6 text-white" />
                    <span className="text-lg font-medium text-white">Downloads</span>
                  </div>
                </Link>
              </section>

              {/* History Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 group w-fit">
                  <h2 className="text-lg font-black tracking-tight group-hover:text-brand-text/70 transition-colors">
                    {historyVideos.length > 0 ? "History" : "Watch videos"}
                  </h2>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {(historyVideos.length > 0 ? historyVideos : homeVideos).slice(0, 10).map((video) => (
                    <Link key={video.id} to={`/watch/${video.id}`} className="group flex flex-col gap-2 min-w-[170px] w-[170px]">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-brand-surface shadow-sm">
                        <ThumbnailMedia 
                          video={video} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute bottom-1.5 right-1.5 px-1 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[9px] font-bold text-white">
                          {video.duration}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[12px] font-semibold line-clamp-2 leading-snug group-hover:text-brand-text/80 transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex flex-col text-[10px] text-brand-muted font-medium">
                          <span>{video.channelName}</span>
                          <span>{video.views} views</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Followed Channels Section */}
              {followedChannels.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-border pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-brand-surface rounded-lg">
                        <Users className="w-4 h-4 text-brand-text" />
                      </div>
                      <h2 className="text-lg font-black tracking-tight">Following</h2>
                    </div>
                    <button className="text-[10px] font-bold text-brand-muted hover:text-brand-text flex items-center gap-1 transition-all group">
                      Manage <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {followedChannels.map((video) => (
                      <SubscriptionItem key={video.id} video={video} />
                    ))}
                  </div>
                </section>
              )}

              {/* Watched Shorts Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-brand-border pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-brand-surface rounded-lg">
                      <PlayCircle className="w-4 h-4 text-brand-text" />
                    </div>
                    <h2 className="text-lg font-black tracking-tight">
                      {recentShorts.length > 0 ? "Recent Shorts" : "Watch shorts"}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {(recentShorts.length > 0 ? recentShorts : shorts).map((short) => (
                    <div key={short.id} className="min-w-[120px] w-[120px] aspect-[9/16] rounded-xl overflow-hidden bg-brand-surface relative group cursor-pointer shadow-sm shrink-0">
                      <video 
                        src={short.videoUrl} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" 
                        muted 
                        playsInline 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-2 flex flex-col justify-end">
                        <TruncatedText 
                          text={short.description}
                          maxLength={100}
                          expandable={false}
                          className="text-[9px] font-bold text-white leading-tight group-hover:text-white/90 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

