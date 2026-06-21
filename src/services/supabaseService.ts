import { supabase } from '../lib/supabase';
import { Video, Short, UserProfile, VideoComment } from '../types';
import { safeJsonStringify } from '../lib/utils';
// Removed

const FALLBACK_VIDEOS: Video[] = [
  {
    id: 'f-1',
    title: 'The Art of Minimalist Living',
    thumbnail: 'https://picsum.photos/seed/minimal/800/450',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    channelName: 'ZenSpaces',
    channelAvatar: 'https://picsum.photos/seed/zen/100/100',
    views: '12450',
    likes: 1200,
    comments: 24,
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '12:45',
    description: 'Explore the beauty of simplicity in this deep dive.',
    category: 'Lifestyle',
    isLive: false,
    cloudflareId: ''
  },
  {
    id: 'f-2',
    title: 'Future of Urban Transportation',
    thumbnail: 'https://picsum.photos/seed/urban/800/450',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    channelName: 'TechPulse',
    channelAvatar: 'https://picsum.photos/seed/tech/100/100',
    views: '8500',
    likes: 850,
    comments: 18,
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '08:20',
    description: 'How cities are evolving to handle the next generation of electric and autonomous vehicles.',
    category: 'Technology',
    isLive: false,
    cloudflareId: ''
  },
  {
    id: 'f-3',
    title: 'Cosmopolitan Culinary Secrets',
    thumbnail: 'https://picsum.photos/seed/cooking/800/450',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    channelName: 'Chef Table',
    channelAvatar: 'https://picsum.photos/seed/chef/100/100',
    views: '15400',
    likes: 2100,
    comments: 42,
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '05:15',
    description: 'Master the art of classical sautéing with our head chef.',
    category: 'Cooking',
    isLive: false,
    cloudflareId: ''
  },
  {
    id: 'f-4',
    title: 'Tears of Steel - Sci-Fi Experience',
    thumbnail: 'https://picsum.photos/seed/steel/800/450',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    channelName: 'TechPulse',
    channelAvatar: 'https://picsum.photos/seed/tech/100/100',
    views: '45000',
    likes: 9800,
    comments: 312,
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '12:14',
    description: 'A classical VFX heavy cinematic masterwork by the Blender Foundation.',
    category: 'Science',
    isLive: false,
    cloudflareId: ''
  }
];

const FALLBACK_SHORTS: Short[] = [
  {
    id: 's-1',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    creator: 'Chef Table',
    avatar: 'https://picsum.photos/seed/chef/100/100',
    description: 'The secret to the perfect sear! 🔥 #cooking #tips',
    likes: 12450,
    views: '125000',
    comments: 120,
    isLive: false
  },
  {
    id: 's-2',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    creator: 'ZenSpaces',
    avatar: 'https://picsum.photos/seed/zen/100/100',
    description: 'Minimalist kitchen tour. ✨ #interior #design',
    likes: 8900,
    views: '45000',
    comments: 56,
    isLive: false
  }
];

const FALLBACK_PROFILES: Record<string, UserProfile> = {
  'ZenSpaces': {
    username: 'ZenSpaces',
    handle: 'zenspaces',
    avatar: 'https://picsum.photos/seed/zen/200/200',
    followers: '420K',
    following: '120',
    videoCount: 65,
    shortsCount: 30,
    description: 'Architect and minimalist.',
    joinedDate: 'Joined June 2024'
  },
  'TechPulse': {
    username: 'TechPulse',
    handle: 'techpulse',
    avatar: 'https://picsum.photos/seed/tech/200/200',
    followers: '5.1M',
    following: '420',
    videoCount: 1200,
    shortsCount: 500,
    description: 'Your daily pulse on technology.',
    joinedDate: 'Joined January 2023'
  },
  'Chef Table': {
    username: 'Chef Table',
    handle: 'cheftable',
    avatar: 'https://picsum.photos/seed/chef/200/200',
    followers: '1.2M',
    following: '85',
    videoCount: 156,
    shortsCount: 84,
    description: 'Professional chef sharing culinary secrets.',
    joinedDate: 'Joined September 2023'
  }
};

export class SupabaseInsertError extends Error {
  statusCode: number;
  supabaseError: any;
  errorCode: string | null;
  details: string | null;
  hint: string | null;
  payload: any;
  userId: string | null;
  meta: {
    video_url: string;
    title: string;
    thumbnail_url: string;
    created_at: string;
  };

  constructor(info: {
    statusCode: number;
    message: string;
    supabaseError: any;
    errorCode: string | null;
    details: string | null;
    hint: string | null;
    payload: any;
    userId: string | null;
    meta: {
      video_url: string;
      title: string;
      thumbnail_url: string;
      created_at: string;
    };
  }) {
    super(info.message);
    this.name = 'SupabaseInsertError';
    this.statusCode = info.statusCode;
    this.supabaseError = info.supabaseError;
    this.errorCode = info.errorCode;
    this.details = info.details;
    this.hint = info.hint;
    this.payload = info.payload;
    this.userId = info.userId;
    this.meta = info.meta;
  }
}

export const supabaseService = {
  async getComments(videoId?: string, shortId?: string): Promise<VideoComment[]> {
    try {
      let query = supabase.from('comments').select(`
        id, content, created_at, likes_count, parent_id,
        user:profiles!user_id(username, avatar_url)
      `);
      if (videoId && videoId !== 'undefined') query = query.eq('video_id', videoId);
      else if (shortId && shortId !== 'undefined') query = query.eq('short_id', shortId);

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) {
        console.error('Failed to fetch comments from Supabase:', error);
        return [];
      }

      // Helper to format timestamp
      const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
      };

      const allComments = (data || []).map((c: any) => ({
        id: c.id,
        videoId: videoId || undefined,
        shortId: shortId || undefined,
        user: Array.isArray(c.user) ? c.user[0]?.username : c.user?.username || 'Guest',
        avatar: Array.isArray(c.user) ? c.user[0]?.avatar_url : c.user?.avatar_url || '',
        text: c.content,
        likes: c.likes_count || 0,
        timestamp: formatTime(c.created_at),
        parentId: c.parent_id
      }));

      // Build tree structure
      const commentMap = new Map();
      const roots: VideoComment[] = [];

      allComments.forEach((c: any) => commentMap.set(c.id, { ...c, replies: [] }));
      allComments.forEach((c: any) => {
        if (c.parentId && commentMap.has(c.parentId)) {
          commentMap.get(c.parentId).replies.push(commentMap.get(c.id));
        } else {
          roots.push(commentMap.get(c.id));
        }
      });

      return roots;
    } catch (error) {
      console.error('Error fetching comments via Supabase JS:', error);
      return [];
    }
  },

  async postComment(content: string, videoId?: string, shortId?: string, parentId?: string): Promise<boolean | string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return "Authentication required";

      const { error } = await supabase.from('comments').insert([{
        content,
        video_id: videoId || null,
        short_id: shortId || null,
        parent_id: parentId || null,
        user_id: session.user.id
      }]);

      if (error) {
        return error.message || 'Failed to post comment';
      }

      // We should ideally run an RPC to increment the comment_count on videos or shorts.
      // But Supabase triggers or a separate JS call could handle this.
      try {
        if (videoId) {
           await supabase.rpc('increment_video_comments_count', { video_id: videoId });
        } else if (shortId) {
           await supabase.rpc('increment_short_comments_count', { short_id: shortId });
        }
      } catch (e) {
         // Silently ignore if RPC doesn't exist
      }

      return true;
    } catch (error: any) {
      console.error('Error posting comment via API:', error);
      return error.message || 'Operation failed';
    }
  },

  async getVideos(): Promise<Video[]> {
    try {
      // Direct fetch
      // We try to join profiles to get owner info if channel_name is missing
      const { data, error } = await supabase
        .from('videos')
        .select('*, owner:profiles!videos_owner_id_fkey(username, avatar_url)')
        .eq('status', 'ready')
        .order('views_count', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching videos direct from Supabase:', error);
        // Try one more time without the join if the join fails (e.g. relation doesn't exist yet)
        const { data: simpleData, error: simpleError } = await supabase
          .from('videos')
          .select('*')
          .eq('status', 'ready')
          .order('views_count', { ascending: false })
          .limit(100);
        
        if (simpleError) {
          console.error('Final fallback fetch failed:', simpleError);
          return [];
        }
        const mappedSimple = (simpleData || []).map(v => mapVideo(v));
        return mappedSimple.sort((a, b) => {
          const scoreA = (Number(a.views) + 5) * (0.6 + Math.random() * 0.8);
          const scoreB = (Number(b.views) + 5) * (0.6 + Math.random() * 0.8);
          return scoreB - scoreA;
        });
      }

      const mappedDirect = (data || []).map(v => mapVideo(v));
      return mappedDirect.sort((a, b) => {
        const scoreA = (Number(a.views) + 5) * (0.6 + Math.random() * 0.8);
        const scoreB = (Number(b.views) + 5) * (0.6 + Math.random() * 0.8);
        return scoreB - scoreA;
      });
    } catch (e) {
      console.error('Crash during direct Supabase video fetch fallback:', e);
      return [];
    }
  },

  async getShorts(): Promise<Short[]> {
    try {
      const { data, error } = await supabase
        .from('shorts')
        .select('*, owner:profiles!shorts_owner_id_fkey(username, avatar_url)')
        .order('views_count', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching shorts:', error);
        // Fallback without join
        const { data: simpleData } = await supabase
          .from('shorts')
          .select('*')
          .order('views_count', { ascending: false })
          .limit(100);
        const mappedSimple = (simpleData || []).map(s => mapShort(s));
        return mappedSimple.sort((a, b) => {
          const scoreA = (Number(a.views) + 5) * (0.6 + Math.random() * 0.8);
          const scoreB = (Number(b.views) + 5) * (0.6 + Math.random() * 0.8);
          return scoreB - scoreA;
        });
      }

      const mappedDirect = (data || []).map(s => mapShort(s));
      return mappedDirect.sort((a, b) => {
        const scoreA = (Number(a.views) + 5) * (0.6 + Math.random() * 0.8);
        const scoreB = (Number(b.views) + 5) * (0.6 + Math.random() * 0.8);
        return scoreB - scoreA;
      });
    } catch (e) {
      console.error('Crash during direct Supabase short fetch fallback:', e);
      return [];
    }
  },

  async getProfiles(): Promise<Record<string, UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      const profiles: Record<string, UserProfile> = {};

      if (error) {
        console.error('Error fetching profiles:', error);
        return profiles;
      }

      (data || []).forEach(p => {
        profiles[p.username] = {
          id: p.id,
          username: p.username,
          handle: p.handle,
          full_name: p.full_name || p.fullName || p.display_name || "",
          avatar: p.avatar_url || p.avatar,
          followers: p.followers_count || 0,
          following: 0,
          videoCount: p.video_count || p.videoCount,
          shortsCount: p.shorts_count || p.shortsCount,
          description: p.bio || p.description,
          banner: p.banner_url || p.banner,
          website: p.website_url || p.website,
          joinedDate: p.created_at || p.joinedDate,
          is_pinned: p.is_pinned ?? false
        };
      });
      return profiles;
    } catch (e) {
      console.error('Crash during direct Supabase profiles fetch:', e);
      return {};
    }
  },

  async getFollowingChannelIds(): Promise<string[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return [];
      
      const { data, error } = await supabase
        .from('followings')
        .select('channel_id')
        .eq('follower_id', session.user.id);
        
      if (error) {
        console.error('Error fetching followings:', error);
        return [];
      }
      return (data || []).map((f: any) => f.channel_id);
    } catch (e) {
      console.error('Crash during getFollowingChannelIds:', e);
      return [];
    }
  },

  async toggleLike(videoId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const userId = session.user.id;

      // Check if like exists
      const { data: existingMap } = await supabase
        .from('video_likes')
        .select('id')
        .match({ user_id: userId, video_id: videoId })
        .single();

      if (existingMap) {
        await supabase.from('video_likes').delete().eq('id', existingMap.id);
        await supabase.rpc('decrement_video_likes', { video_id: videoId });
      } else {
        await supabase.from('video_likes').insert({ user_id: userId, video_id: videoId });
        await supabase.rpc('increment_video_likes', { video_id: videoId });
      }
      return true;
    } catch (e) {
      console.warn('Failed to toggle like directly via Supabase:', e);
      return false;
    }
  },

  async incrementView(videoId: string): Promise<boolean> {
    try {
      await supabase.rpc('increment_video_views', { video_id: videoId });
      return true;
    } catch (e) {
      console.warn('Failed to increment view directly via Supabase:', e);
      return false;
    }
  },

  async toggleCommentLike(commentId: string): Promise<{ success: boolean; liked?: boolean }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return { success: false };
      const userId = session.user.id;

      let liked = false;
      const { data: existingMap } = await supabase
        .from('comment_likes')
        .select('id')
        .match({ user_id: userId, comment_id: commentId })
        .single();

      if (existingMap) {
        await supabase.from('comment_likes').delete().eq('id', existingMap.id);
        await supabase.rpc('decrement_comment_likes', { comment_id: commentId });
        liked = false;
      } else {
        await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId });
        await supabase.rpc('increment_comment_likes', { comment_id: commentId });
        liked = true;
      }
      return { success: true, liked };
    } catch (e) {
      console.warn('Failed to toggle comment like directly via Supabase:', e);
      return { success: false };
    }
  },

  async toggleFollow(targetId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;
      const userId = session.user.id;

      // check user
      const { data: targetProfile } = await supabase.from('profiles').select('id, username').eq('username', targetId).single();
      const targetUserId = targetProfile?.id || targetId; // Handle both channel name or raw ID

      const { data: existingMap } = await supabase
        .from('followings')
        .select('id')
        .match({ follower_id: userId, channel_id: targetUserId })
        .single();
        
      if (existingMap) {
        await supabase.from('followings').delete().eq('id', existingMap.id);
        await supabase.rpc('decrement_followers', { user_id: targetUserId });
      } else {
        await supabase.from('followings').insert({ follower_id: userId, channel_id: targetUserId });
        await supabase.rpc('increment_followers', { user_id: targetUserId });
      }
      return true;
    } catch (e) {
      console.warn('Failed to toggle follow directly via Supabase:', e);
      return false;
    }
  },

  async getLiveVideos(): Promise<Video[]> {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_live', true);

      if (error) {
        console.error('Error fetching live videos:', error);
        return [];
      }
      
      return (data || []).map(v => mapVideo(v));
    } catch (e) {
      console.error('Crash during direct Supabase live videos fetch:', e);
      return [];
    }
  },

  async debugCheck(): Promise<void> {
    try {
      const { count: vCount, error: vErr } = await supabase.from('videos').select('*', { count: 'exact', head: true });
      const { count: sCount, error: sErr } = await supabase.from('shorts').select('*', { count: 'exact', head: true });
      const { count: pCount, error: pErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      console.log('--- SUPABASE DATABASE STATUS ---');
      console.log(`Videos: ${vCount} (Error: ${vErr?.message || 'None'})`);
      console.log(`Shorts: ${sCount} (Error: ${sErr?.message || 'None'})`);
      console.log(`Profiles: ${pCount} (Error: ${pErr?.message || 'None'})`);
      console.log('-------------------------------');
    } catch (e) {
      console.error('Debug check failed:', e);
    }
  },

  async insertShort(short: Partial<Short>): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id || null;

      // Sanitize data before sending to avoid circular structure issues
      const sanitizedShort = {
        videoUrl: String(short.videoUrl || ''),
        description: String(short.description || ''),
        creator: String(short.creator || 'Guest'),
        avatar: String(short.avatar || '')
      };

      // Removed fetch block
        try {
          const { data: directData, error: directErr } = await supabase
            .from("shorts")
            .insert([{
              owner_id: userId,
              video_url: sanitizedShort.videoUrl,
              description: sanitizedShort.description,
              creator: sanitizedShort.creator,
              avatar: sanitizedShort.avatar,
              created_at: new Date().toISOString()
            }])
            .select("*")
            .maybeSingle();

          if (!directErr && directData) {
            console.log("[STORAGE] Client-side direct database insert for short succeeded.");
            return true;
          } else {
            throw new Error(directErr?.message || 'Insert short query failed');
          }
        } catch (fbErr) {
          console.error("[STORAGE] Direct database fallback failed:", fbErr);
          throw fbErr;
        }
    } catch (error) {
      console.error('Error inserting short:', error);
      throw error;
    }
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return false;

      const payload: any = {};
      if (profile.username !== undefined) payload.username = profile.username;
      if (profile.handle !== undefined) payload.handle = profile.handle;
      if (profile.description !== undefined) payload.bio = profile.description;
      if (profile.bio !== undefined) payload.bio = profile.bio;
      if (profile.avatar !== undefined) payload.avatar_url = profile.avatar;
      if (profile.banner !== undefined) payload.banner_url = profile.banner;

      const { error } = await supabase.from('profiles').update(payload).eq('id', session.user.id);
      
      if (error) {
        console.error('Failed to update profile directly via Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Crash during direct updateProfile:', e);
      return false;
    }
  },

  async uploadToCloudflareStream(file: File, onProgress?: (percent: number) => void): Promise<{ videoUrl: string, uid: string } | null> {
    try {
      console.log(`[STORAGE] Directing Stream upload to Supabase Storage for ${file.name}`);
      const videoType = file.name.toLowerCase().includes('short') || file.size < 30 * 1024 * 1024 ? 'short' : 'video';
      const videoUrl = await this.uploadFile(file, videoType, onProgress);
      if (!videoUrl) throw new Error("Supabase Storage upload failed");
      return { videoUrl, uid: "" };
    } catch (error: any) {
      console.error('[STORAGE] Stream upload to Supabase Storage failed:', error);
      throw error;
    }
  },

  async uploadFile(
    file: File, 
    type: 'video' | 'short' | 'profile-picture' | 'thumbnail' | 'banner' | 'image', 
    onProgress?: (percent: number) => void
  ): Promise<string | null> {
    try {
      console.log(`[STORAGE] Starting Supabase Storage upload for ${file.name} as type: ${type}`);
      
      // 1. Local basic checks (to catch issues early)
      const MAX_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
      const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
      
      const fileIsVideo = file.type.startsWith('video/');
      const fileIsImage = file.type.startsWith('image/');

      if (type === 'video' || type === 'short') {
        if (!fileIsVideo && !fileIsImage) {
          throw new Error('Invalid file type: Please upload a valid video or image format file.');
        }
        const maxSize = fileIsVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
          throw new Error(`File too large: File size cannot exceed ${maxSize / (1024 * 1024)}MB.`);
        }
      } else {
        if (!fileIsImage) {
          throw new Error('Invalid file type: Please upload a valid image format file.');
        }
        if (type === 'profile-picture') {
          if (file.size > MAX_PROFILE_IMAGE_SIZE) {
            throw new Error(`File too large: Profile pictures cannot exceed ${MAX_PROFILE_IMAGE_SIZE / (1024 * 1024)}MB.`);
          }
        } else if (file.size > MAX_IMAGE_SIZE) {
          throw new Error(`File too large: Image files cannot exceed ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`);
        }
      }

      // 2. Get session token reliably
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const contentType = file.type || (type === 'video' || type === 'short' ? 'video/mp4' : 'image/jpeg');
      let folder = "others";
      if (type === "profile-picture") {
        folder = "profile-pictures";
      } else if (type === "video") {
        folder = fileIsImage ? "thumbnails" : "videos";
      } else if (type === "short") {
        folder = fileIsImage ? "thumbnails" : "shorts";
      } else if (type === "banner") {
        folder = "banners";
      } else if (type === "thumbnail" || type === "image") {
        folder = "thumbnails";
      }

      const key = `${session.user.id}/${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      // 3. Try Direct client-side upload to Supabase Storage first
      try {
        console.log(`[STORAGE] Trying client-side upload to Supabase Storage: 'videos' bucket, path: ${key}`);
        
        // Note: Direct upload progress is not built-in for standard custom promise flow,
        // but since we want robust progress bars we approximate or fallback to standard XHR proxy
        const { data, error } = await supabase.storage
          .from('videos')
          .upload(key, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(key);

        console.log("[STORAGE] Client-side Supabase storage upload success:", publicUrl);
        if (onProgress) onProgress(100);

        return publicUrl;
      } catch (clientErr: any) {
        console.error(`[STORAGE] Client-side direct upload rejected:`, clientErr);
        throw clientErr;
      }
    } catch (error: any) {
      console.error('[STORAGE] Upload flow failed:', error);
      throw error;
    }
  },

  async insertVideo(videoData: any): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id || null;

      // Sanitize inputs to prevent circular structure errors (JS often attaches DOM refs to objects)
      const sanitizedData = {
        title: String(videoData.title || ''),
        description: String(videoData.description || ''),
        videoUrl: String(videoData.videoUrl || ''),
        thumbnailUrl: String(videoData.thumbnailUrl || videoData.thumbnail || ''),
        duration: String(videoData.duration || '0:00'),
        category: String(videoData.category || 'General'),
        channelName: String(videoData.channelName || 'Guest'),
        channelAvatar: String(videoData.channelAvatar || ''),
        isLive: !!videoData.isLive,
        cloudflareId: videoData.cloudflareId ? String(videoData.cloudflareId) : ''
      };

      // Removed fetch block
        try {
          const { data: directData, error: directErr } = await supabase
            .from("videos")
            .insert([{
              owner_id: userId,
              title: sanitizedData.title,
              description: sanitizedData.description,
              video_url: sanitizedData.videoUrl,
              thumbnail: sanitizedData.thumbnailUrl,
              duration: sanitizedData.duration,
              category: sanitizedData.category,
              channel_name: sanitizedData.channelName,
              channel_avatar: sanitizedData.channelAvatar,
              status: "ready",
              posted_at: new Date().toISOString()
            }])
            .select("*")
            .maybeSingle();

          if (!directErr && directData) {
            console.log("[STORAGE] Client-side direct database insert for video succeeded.");
            return true;
          } else {
            console.warn("[STORAGE] Direct database fallback returned error:", directErr);
            throw new Error(directErr?.message || 'Insert video query failed');
          }
        } catch (fbErr) {
          console.error("[STORAGE] Direct database fallback failed:", fbErr);
          throw fbErr;
        }
    } catch (error) {
      console.error('Error inserting video:', error);
      throw error;
    }
  },

  async deleteVideo(id: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return false;

      // Direct fallback
      try {
        await supabase.from("comments").delete().eq("video_id", id);
      } catch (err) {
        console.warn("Direct comments fallback deletion warning:", err);
      }
      try {
        await supabase.from("video_likes").delete().eq("video_id", id);
      } catch (err) {
        console.warn("Direct video_likes fallback deletion warning:", err);
      }
      try {
        await supabase.from("likes").delete().eq("video_id", id);
      } catch (err) {
        console.warn("Direct likes fallback deletion warning:", err);
      }
      try {
        await supabase.from("watch_history").delete().eq("video_id", id);
      } catch (err) {
        console.warn("Direct watch_history fallback deletion warning:", err);
      }

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error deleting video:', e);
      return false;
    }
  },

  async deleteShort(id: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return false;

      // Direct fallback
      try {
        await supabase.from("comments").delete().eq("short_id", id);
      } catch (err) {
        console.warn("Direct short comments fallback deletion warning:", err);
      }
      try {
        await supabase.from("likes").delete().eq("short_id", id);
      } catch (err) {
        console.warn("Direct short likes fallback deletion warning:", err);
      }

      const { error } = await supabase
        .from('shorts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error deleting short:', e);
      return false;
    }
  },

  async togglePinProfile(username: string, isPinned: boolean): Promise<boolean> {
    try {
      // Direct call fallback/update on table profiles
      const { error } = await supabase
        .from('profiles')
        .update({ is_pinned: isPinned })
        .eq('username', username);
        
      if (error) {
        // Failing silently is expected if is_pinned column is not existing yet in the table
        console.warn('Supabase togglePinProfile column update details:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Crash toggling pin on Supabase:', err);
      return false;
    }
  }
};

function mapShort(s: any): Short {
  return {
    id: s.id,
    videoUrl: s.video_url || s.videoUrl,
    creator: s.creator || s.owner?.username || 'Guest',
    avatar: s.avatar || s.owner?.avatar_url || '',
    description: s.description,
    likes: s.likes_count ?? s.likes ?? 0,
    views: s.views_count ?? s.views ?? 0,
    comments: s.comments_count ?? s.comments ?? 0,
    isLive: s.is_live ?? s.isLive,
    postedAt: s.created_at || s.created_at || s.postedAt || s.posted_at
  };
}

function mapVideo(v: any): Video {
  return {
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    videoUrl: v.video_url || v.videoUrl,
    channelName: v.channel_name || v.owner?.username || 'Unknown',
    channelAvatar: v.channel_avatar || v.owner?.avatar_url || '',
    views: String(v.views_count ?? v.views ?? 0),
    likes: v.likes_count ?? v.likes ?? 0,
    comments: v.comments_count ?? v.comments ?? 0,
    postedAt: v.posted_at || v.postedAt,
    duration: v.duration || '0:00',
    description: v.description,
    category: v.category,
    isLive: v.is_live ?? v.isLive,
    cloudflareId: v.hls_url || ''
  };
}

function fileNameSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_');
}
