import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(username, avatar_url),
          video:videos(title, thumbnail),
          short:shorts(description)
        `)
        .eq('recipient_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Notification[] = (data || []).map(n => ({
        id: n.id,
        type: n.type as any,
        user: n.actor?.username || 'Someone',
        avatar: n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_id}`,
        content: n.content,
        targetTitle: n.video?.title || n.short?.description || 'Content',
        targetThumbnail: n.video?.thumbnail,
        targetType: n.video_id ? 'video' : n.short_id ? 'shorts' : undefined,
        timestamp: new Date(n.created_at).toLocaleString(),
        isRead: n.is_read,
        actor_id: n.actor_id,
        target_id: n.video_id || n.short_id
      }));

      setNotifications(formatted);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();

    if (!session?.user) return;

    // Real-time subscription
    const subscription = supabase
      .channel(`notifications:${session.user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `recipient_id=eq.${session.user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', session.user.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [session]);

  const addNotification = useCallback(async (newNotif: {
    recipient_id: string;
    type: 'like' | 'reply' | 'mention' | 'follow';
    content?: string;
    video_id?: string;
    short_id?: string;
    comment_id?: string;
  }) => {
    if (!session?.user || session.user.id === newNotif.recipient_id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          ...newNotif,
          actor_id: session.user.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }, [session]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
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
