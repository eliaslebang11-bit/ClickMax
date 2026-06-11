import React, { useEffect } from "react";
import { ThumbsUp, MessageSquare, Clock, ChevronRight, UserPlus, AtSign, Heart, MessageCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useNotifications } from "../context/NotificationContext";

export default function Notifications() {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-8 pb-32">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-brand-text/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-brand-text" />
          </button>
          <h1 className="text-xl font-black tracking-tight text-brand-text">Notifications</h1>
        </div>

      <div className="space-y-1">
        {notifications.map((notification, index) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            index={index} 
            markAsRead={markAsRead} 
          />
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center">
            <Clock className="w-8 h-8 text-brand-muted" />
          </div>
          <div>
            <h3 className="text-lg font-bold">No notifications yet</h3>
            <p className="text-sm text-brand-muted">We'll notify you when someone interacts with your content.</p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function NotificationItem({ notification, index, markAsRead }: { notification: any, index: number, markAsRead: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => markAsRead(notification.id)}
      className={cn(
        "p-4 rounded-xl transition-all cursor-pointer group flex gap-4 items-start",
        notification.isRead 
          ? "hover:bg-brand-surface" 
          : "bg-brand-text/5 hover:bg-brand-text/10"
      )}
    >
      <div className="flex-shrink-0">
        <img 
          src={notification.avatar} 
          alt={notification.user} 
          className="w-12 h-12 rounded-full object-cover border border-brand-border"
        />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="space-y-0.5">
          <p className="text-[13px] leading-snug">
            <span className="text-brand-text">
              <span className="font-bold">{notification.user}</span>
              {notification.othersCount && <span className="font-bold"> and {notification.othersCount} others</span>}
              {" "}
              <span className="text-brand-muted">
                {notification.type === 'like' ? (
                  `liked your ${notification.targetType === 'shorts' ? 'shorts video' : notification.targetType === 'live' ? 'Live video' : 'video'}.`
                ) : notification.type === 'reply' ? (
                  "replied to your comment:"
                ) : notification.type === 'mention' ? (
                  "mentioned you in a comment:"
                ) : notification.type === 'follow' ? (
                  "followed you."
                ) : "interacted with you."}
              </span>
            </span>
            <span className="text-[10px] font-medium text-brand-muted/60 whitespace-nowrap ml-1">
              . {(notification.timestamp || "").replace(' ago', '')}
            </span>
          </p>
          
          {(notification.type === 'reply' || notification.type === 'mention') && notification.content && (
            <p className="text-[13px] text-brand-text/90 line-clamp-3 leading-tight">
              {notification.content}
            </p>
          )}
        </div>

        {(notification.type === 'reply' || notification.type === 'mention') && (
          <div className="flex items-center gap-4 pt-1">
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-brand-muted hover:text-brand-text transition-colors">
              <Heart className="w-4 h-4" />
              Like
            </button>
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-brand-muted hover:text-brand-text transition-colors">
              <MessageCircle className="w-4 h-4" />
              Reply
            </button>
          </div>
        )}
      </div>

      {notification.targetThumbnail && (
        <div className="flex-shrink-0 w-14 aspect-square rounded-lg overflow-hidden border border-brand-border bg-brand-surface mt-1">
          <img 
            src={notification.targetThumbnail} 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
            alt="Target" 
          />
        </div>
      )}
    </motion.div>
  );
}
