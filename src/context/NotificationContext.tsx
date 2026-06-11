import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";
import { getApiUrl } from "../lib/api";

export interface Notification {
  id: string;
  type: 'like' | 'reply' | 'mention' | 'follow';
  user: string;
  avatar: string;
  othersCount?: number;
  content?: string;
  targetTitle?: string;
  targetThumbnail?: string;
  targetType?: 'video' | 'shorts' | 'live';
  timestamp: string;
  isRead: boolean;
  actor_id?: string;
  target_id?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: {
    recipient_id: string;
    type: 'like' | 'reply' | 'mention' | 'follow';
    content?: string;
    video_id?: string;
    short_id?: string;
    comment_id?: string;
  }) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token) {
      setNotifications([]);
      return;
    }
    try {
      const response = await fetch(getApiUrl("/api/notifications"), {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        return;
      }
    } catch (e) {
      console.warn("[NOTIF-CTX] API notifications fetch failed (likely network/CORS), falling back to direct Supabase fetch:", e);
    }

    // Direct Supabase query as robust fallback
    try {
      if (!session?.user?.id) return;
      const { data: notificationsData, error: dbError } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (dbError) throw dbError;
      
      const rawNotifications = notificationsData || [];
      if (rawNotifications.length === 0) {
        setNotifications([]);
        return;
      }

      // Extract unique actor, video, short IDs
      const actorIds = [...new Set(rawNotifications.map(n => n.actor_id).filter(Boolean))];
      const videoIds = [...new Set(rawNotifications.map(n => n.video_id).filter(Boolean))];
      const shortIds = [...new Set(rawNotifications.map(n => n.short_id).filter(Boolean))];

      // Fetch metadata in parallel
      const [profilesRes, videosRes, shortsRes] = await Promise.all([
        actorIds.length > 0 ? supabase.from("profiles").select("id, username, avatar_url").in("id", actorIds) : Promise.resolve({ data: [] }),
        videoIds.length > 0 ? supabase.from("videos").select("id, title, thumbnail").in("id", videoIds) : Promise.resolve({ data: [] }),
        shortIds.length > 0 ? supabase.from("shorts").select("id, title, thumbnail, thumbnail_url").in("id", shortIds) : Promise.resolve({ data: [] })
      ]);

      const profiles = profilesRes.data || [];
      const videos = videosRes.data || [];
      const shorts = shortsRes.data || [];

      // Time helper
      const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHr / 24);

        if (diffSec < 60) return "just now";
        if (diffMin < 60) return `${diffMin}m`;
        if (diffHr < 24) return `${diffHr}h`;
        if (diffDays === 1) return "yesterday";
        if (diffDays < 30) return `${diffDays}d`;
        return date.toLocaleDateString();
      };

      const enriched = rawNotifications.map((n: any) => {
        const profile = profiles.find((p: any) => p.id === n.actor_id);
        const video = videos.find((v: any) => v.id === n.video_id);
        const short = shorts.find((s: any) => s.id === n.short_id);

        let content = n.content || "";
        if (!content) {
          if (n.type === 'like') {
            content = n.short_id ? "liked your latest short video." : "liked your video.";
          } else if (n.type === 'follow') {
            content = "started following you.";
          } else if (n.type === 'reply') {
            content = "replied to your comment.";
          } else if (n.type === 'mention') {
            content = "mentioned you in a comment.";
          }
        }

        return {
          id: n.id,
          type: n.type,
          user: profile?.username || "Someone",
          avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_id || 'guest'}`,
          content,
          targetTitle: video?.title || short?.title || "",
          targetThumbnail: video?.thumbnail || short?.thumbnail_url || short?.thumbnail || "",
          targetType: (n.short_id ? "shorts" : "video") as "shorts" | "video",
          timestamp: getRelativeTime(n.created_at || new Date().toISOString()),
          isRead: n.is_read || n.isRead || false
        };
      });

      setNotifications(enriched);
    } catch (fallbackErr) {
      console.warn("[NOTIF-CTX] Fallback notifications retrieval failed:", fallbackErr);
      setNotifications([]);
    }
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => {
    fetchNotifications();

    // Minor polling fallback (every 12 seconds) to sync real reactions
    if (session?.access_token) {
      const interval = setInterval(() => {
        fetchNotifications();
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [session?.access_token, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    if (!session?.access_token) return;
    try {
      const response = await fetch(getApiUrl(`/api/notifications/${id}/read`), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (response.ok) return;
    } catch (e) {
      console.warn("[NOTIF-CTX] Mark read API failed, trying direct Supabase fallback:", e);
    }

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    } catch (dbErr) {
      console.warn("[NOTIF-CTX] Direct Supabase update failed for markAsRead:", dbErr);
    }
  }, [session?.access_token]);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (!session?.access_token) return;
    try {
      const response = await fetch(getApiUrl("/api/notifications/read-all"), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (response.ok) return;
    } catch (e) {
      console.warn("[NOTIF-CTX] Mark all read API failed, trying direct Supabase fallback:", e);
    }

    try {
      if (!session?.user?.id) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", session.user.id);
    } catch (dbErr) {
      console.warn("[NOTIF-CTX] Direct Supabase update failed for markAllAsRead:", dbErr);
    }
  }, [session?.access_token, session?.user?.id]);

  const addNotification = useCallback(async (newNotif: {
    recipient_id: string;
    type: 'like' | 'reply' | 'mention' | 'follow';
    content?: string;
    video_id?: string;
    short_id?: string;
    comment_id?: string;
  }) => {
    // Notifications are created server-side upon reactions/likes/comments
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
