import { supabase } from '../lib/supabase';
import { Video, Short, UserProfile, VideoComment } from '../types';
import { safeJsonStringify } from '../lib/utils';
import { getApiUrl } from '../lib/api';

export const supabaseService = {
  async getComments(videoId?: string, shortId?: string): Promise<VideoComment[]> {
    try {
      const params = new URLSearchParams();
      if (videoId && videoId !== 'undefined') params.append('video_id', videoId);
      else if (shortId && shortId !== 'undefined') params.append('short_id', shortId);
      
      const url = getApiUrl(`/api/comments?${params.toString()}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch comments:', errorData.error || response.statusText);
        throw new Error(errorData.error || 'Failed to fetch comments');
      }
      
      const data = await response.json();

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
        videoId: c.video_id,
        shortId: c.short_id,
        user: c.user?.username || 'Guest',
        avatar: c.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user_id}`,
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
      console.error('Error fetching comments via API:', error);
      return [];
    }
  },

  async postComment(content: string, videoId?: string, shortId?: string, parentId?: string): Promise<boolean | string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return "Authentication required";

      const token = session.access_token;
      
      const response = await fetch(getApiUrl('/api/comments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify({
          content,
          video_id: videoId || null,
          short_id: shortId || null,
          parent_id: parentId || null
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return err.error || 'Failed to post comment';
      }

      return true;
    } catch (error: any) {
      console.error('Error posting comment via API:', error);
      return error.message || 'Operation failed';
    }
  },

  async getVideos(): Promise<Video[]> {
    try {
      const response = await fetch(getApiUrl('/api/videos/feed?limit=50'));
      if (response.ok) {
        const data = await response.json();
        return (data || []).map((v: any) => mapVideo(v));
      } else {
        console.warn('API feed returned status:', response.status);
      }
    } catch (e) {
      console.warn('API feed failed, falling back to direct supabase fetch', e);
    }

    try {
      // Direct fetch as fallback or if API failed
      // We try to join profiles to get owner info if channel_name is missing
      const { data, error } = await supabase
        .from('videos')
        .select('*, owner:profiles!videos_owner_id_fkey(username, avatar_url)')
        .eq('status', 'ready')
        .order('posted_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos direct from Supabase:', error);
        // Try one more time without the join if the join fails (e.g. relation doesn't exist yet)
        const { data: simpleData, error: simpleError } = await supabase
          .from('videos')
          .select('*')
          .limit(50);
        
        if (simpleError) {
          console.error('Final fallback fetch failed:', simpleError);
          return [];
        }
        return (simpleData || []).map(v => mapVideo(v));
      }

      return (data || []).map(v => mapVideo(v));
    } catch (e) {
      console.error('Crash during direct Supabase video fetch fallback:', e);
      return [];
    }
  },

  async getShorts(): Promise<Short[]> {
    try {
      const response = await fetch(getApiUrl('/api/shorts/feed?limit=50'));
      if (response.ok) {
        const data = await response.json();
        return (data || []).map((s: any) => mapShort(s));
      }
    } catch (e) {
      console.warn('API shorts feed failed, falling back to direct supabase fetch', e);
    }

    try {
      const { data, error } = await supabase
        .from('shorts')
        .select('*, owner:profiles!shorts_owner_id_fkey(username, avatar_url)');

      if (error) {
        console.error('Error fetching shorts:', error);
        // Fallback without join
        const { data: simpleData } = await supabase.from('shorts').select('*').limit(50);
        return (simpleData || []).map(s => mapShort(s));
      }

      return (data || []).map(s => mapShort(s));
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

      if (error) {
        console.error('Error fetching profiles:', error);
        return {};
      }

      const profiles: Record<string, UserProfile> = {};
      (data || []).forEach(p => {
        profiles[p.username] = {
          id: p.id,
          username: p.username,
          handle: p.handle,
          avatar: p.avatar_url || p.avatar,
          followers: p.followers_count || 0,
          following: 0,
          videoCount: p.video_count || p.videoCount,
          shortsCount: p.shorts_count || p.shortsCount,
          description: p.bio || p.description,
          banner: p.banner_url || p.banner,
          website: p.website_url || p.website,
          joinedDate: p.created_at || p.joinedDate
        };
      });
      return profiles;
    } catch (e) {
      console.error('Crash during direct Supabase profiles fetch:', e);
      return {};
    }
  },

  async toggleLike(videoId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;

      const response = await fetch(getApiUrl(`/api/videos/${videoId}/like`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async toggleFollow(targetId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;

      const response = await fetch(getApiUrl(`/api/profiles/${targetId}/subscribe`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch (e) {
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

      // Sanitize data before sending to avoid circular structure issues
      const sanitizedShort = {
        videoUrl: String(short.videoUrl || ''),
        description: String(short.description || ''),
        creator: String(short.creator || 'Guest'),
        avatar: String(short.avatar || '')
      };

      const response = await fetch(getApiUrl('/api/shorts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: safeJsonStringify(sanitizedShort)
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('[SUPABASE] Short insert failed:', err.error || response.statusText);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error inserting short:', error);
      return false;
    }
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<boolean> {
    if (!profile.username) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          handle: profile.handle,
          avatar: profile.avatar,
          description: profile.description,
          banner: profile.banner
        })
        .eq('username', profile.username);

      if (error) {
        console.error('Error updating profile:', error);
        // If error is because record doesn't exist, try insert
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              username: profile.username,
              handle: profile.handle,
              avatar: profile.avatar,
              description: profile.description,
              banner: profile.banner
            }
          ]);
        if (insertError) {
          console.error('Error inserting profile:', insertError);
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Crash during direct Supabase updateProfile:', e);
      return false;
    }
  },

  async uploadToCloudflareStream(file: File, onProgress?: (percent: number) => void): Promise<{ videoUrl: string, uid: string } | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authentication required');

      // 1. Get upload URL from our backend
      const response = await fetch(getApiUrl('/api/upload/stream'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify({ fileName: file.name })
      });

      if (!response.ok) {
         const err = await response.json().catch(() => ({}));
         const error: any = new Error(err.error || 'Failed to get Stream upload URL');
         error.hint = err.hint;
         throw error;
      }

      const { uploadUrl, uid, playbackUrl } = await response.json();

      // 2. Upload file to Cloudflare directly
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`[STREAM] Direct upload successful. UID: ${uid}`);
            resolve({ videoUrl: playbackUrl, uid });
          } else {
            reject(new Error(`Cloudflare rejected upload (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during Cloudflare Stream upload'));
        
        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      });
    } catch (error: any) {
      console.error('[STREAM] Upload error:', error);
      throw error;
    }
  },

  async uploadFile(file: File, type: 'video' | 'image', onProgress?: (percent: number) => void): Promise<string | null> {
    try {
      console.log(`[STORAGE] Starting upload for ${file.name} (${file.type || 'unknown type'})`);
      
      // 1. Get session token reliably
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      // 2. Get presigned URL from backend
      const contentType = file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg');
      console.log(`[STORAGE] Requesting presigned URL for ${file.name} with content-type: ${contentType}`);
      
      const response = await fetch(getApiUrl('/api/upload/url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify({
          fileName: fileNameSafe(file.name),
          contentType: contentType,
          type
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[STORAGE] Backend rejected presign request:', errorData);
        throw new Error(errorData.error || `Server error (${response.status}): Failed to get upload URL`);
      }
      
      const { uploadUrl, publicUrl, key, useProxy } = await response.json();
      
      // The user wants to remove unstable proxy implementation and prefer direct architecture
      if (useProxy) {
        console.warn(`[STORAGE] Backend requested proxy fallback because R2 is not configured. Falling back to backend proxy...`);
        return await this.performProxyUpload(file, key, contentType, token, onProgress);
      }

      console.log(`[STORAGE] Presigned URL obtained. Starting direct upload to cloud storage...`);

      // 3. Trying Direct Upload first (faster)
      try {
        console.log(`[STORAGE] Attempting direct cloud upload (Attempting R2)...`);
        return await this.performDirectUpload(uploadUrl, publicUrl, file, contentType, onProgress);
      } catch (err: any) {
        // Fallback to proxy for almost any error during direct upload as a fail-safe
        console.warn(`[STORAGE] Direct upload failed or blocked (${err.message}). Falling back to backend proxy...`);
        return await this.performProxyUpload(file, key, contentType, token, onProgress);
      }

    } catch (error: any) {
      console.error('[STORAGE] Upload flow failed:', error);
      throw error;
    }
  },

  /**
   * Performs direct upload to storage (R2/S3) using XHR for progress tracking
   */
  async performDirectUpload(uploadUrl: string, publicUrl: string, file: File, contentType: string, onProgress?: (percent: number) => void): Promise<string> {
    const MAX_RETRIES = 2;
    let attempt = 0;

    const executeUpload = async (currentAttempt: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Open request
        xhr.open('PUT', uploadUrl);
        
        // Headers - Content-Type MUST match exactly what was signed in backend
        xhr.setRequestHeader('Content-Type', contentType);
        
        // Try to handle private network restrictions if in sandbox
        try {
          xhr.setRequestHeader('Access-Control-Allow-Private-Network', 'true');
        } catch (e) {}

        // Reliability: Disable timeout for large videos, but add fallback for UI
        xhr.timeout = 0; 
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`[STORAGE] Direct upload success on attempt ${currentAttempt + 1}`);
            resolve(publicUrl);
          } else {
            console.error(`[STORAGE] Direct upload rejected with status ${xhr.status}`);
            let errorMsg = `Cloud rejected upload (${xhr.status})`;
            if (xhr.status === 403) errorMsg += ". Check if your R2 pre-signed URL expired or credentials changed.";
            reject(new Error(errorMsg));
          }
        };
        
        xhr.onerror = () => {
          // Downgraded to warn because we have an automatic proxy fallback
          console.warn('[STORAGE] Network issue detected during direct cloud upload. Browser policy or connection may be blocking the direct R2 endpoint.');
          const msg = 'Network error during direct upload. Switching to proxy...';
          reject(new Error(msg));
        };

        xhr.send(file);
      });
    };

    while (attempt < MAX_RETRIES) {
      try {
        return await executeUpload(attempt);
      } catch (err: any) {
        // If it's a "Network error" (potential CORS), don't bother retrying as it will fail again
        if (err.message.includes('CORS') || err.message.includes('Network error')) {
          throw err;
        }

        attempt++;
        if (attempt >= MAX_RETRIES) throw err;
        
        console.warn(`[STORAGE] Upload attempt ${attempt} failed, retrying in ${attempt * 2}s...`);
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
    throw new Error('Upload failed after multiple retries.');
  },

  async performProxyUpload(file: File, key: string, contentType: string, token: string, onProgress?: (percent: number) => void): Promise<string> {
    console.log(`[STORAGE] Initiating proxy upload via server (Size: ${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
    
    const MAX_RETRIES = 2;
    let attempt = 0;

    const executeProxyUpload = async (currentAttempt: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', getApiUrl('/api/upload/proxy'));
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              console.log(`[STORAGE] Proxy upload success on attempt ${currentAttempt + 1}`);
              resolve(data.publicUrl);
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            let errorMsg = `Proxy failed (${xhr.status})`;
            try {
              const data = JSON.parse(xhr.responseText);
              errorMsg = data.error || errorMsg;
            } catch (e) {}
            reject(new Error(errorMsg));
          }
        };
        
        xhr.onerror = () => {
          console.warn(`[STORAGE] Proxy upload attempt ${currentAttempt + 1} failed with network error.`);
          reject(new Error('Network error during proxy upload.'));
        };

        xhr.ontimeout = () => reject(new Error('Proxy upload timed out.'));
        
        // 15 minutes for proxy upload of large files
        xhr.timeout = 900000; 
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', key);
        formData.append('contentType', contentType);
        
        xhr.send(formData);
      });
    };

    while (attempt < MAX_RETRIES) {
      try {
        return await executeProxyUpload(attempt);
      } catch (err: any) {
        attempt++;
        if (attempt >= MAX_RETRIES) throw err;
        
        console.warn(`[STORAGE] Proxy retry ${attempt}/${MAX_RETRIES} starting in ${attempt * 3}s...`);
        await new Promise(r => setTimeout(r, attempt * 3000));
      }
    }
    throw new Error('Proxy upload failed after multiple retries.');
  },

  async insertVideo(videoData: any): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

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
        isLive: !!videoData.isLive
      };

      const response = await fetch(getApiUrl('/api/videos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify(sanitizedData)
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Video metadata save failed:', err);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error inserting video:', error);
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
    isLive: s.is_live ?? s.isLive
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
    isLive: v.is_live ?? v.isLive
  };
}

function fileNameSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_');
}
