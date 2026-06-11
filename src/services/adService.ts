import { Ad, AdAnalytics, AdPlacement, AdType, ShortsAd } from '../types';
import { safeJsonStringify } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../lib/api';

export const adService = {
  /**
   * Public: Get ads for the video player based on placement and type
   */
  async getActiveAds(placementType?: AdPlacement, type?: AdType): Promise<Ad[]> {
    try {
      const queryString = placementType || type ? new URLSearchParams({
        ...(placementType ? { placement_type: placementType } : {}),
        ...(type ? { type } : {})
      }).toString() : '';
      
      const url = getApiUrl(`/api/ads/active${queryString ? `?${queryString}` : ''}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Return empty array on network failure
      return [];
    }
  },

  /**
   * Admin: List all ads
   */
  async getAllAds(): Promise<Ad[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/ads'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to list ads');
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Create or Update an Ad
   */
  async saveAd(ad: Partial<Ad>): Promise<Ad | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/ads'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify(ad)
      });

      if (!response.ok) throw new Error('Failed to save ad');
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  /**
   * Admin: Delete an Ad
   */
  async deleteAd(id: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl(`/api/ads/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Public: Log an ad event (impression, click, etc.)
   */
  async logEvent(adId: string, eventType: AdAnalytics['event_type']): Promise<void> {
    try {
      // Basic targeting info
      const country = (navigator as any).language?.split('-')[1] || 'Unknown';
      const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

      await fetch(getApiUrl(`/api/ads/${adId}/event`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify({
          event_type: eventType,
          country,
          device
        })
      });
    } catch (error) {
      // Silent on event logging failure
    }
  },

  /**
   * Admin: Get analytics summary
   */
  async getAnalyticsSummary(): Promise<any[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/ads/analytics/summary'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch ad analytics');
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Save ad system settings
   */
  async saveSettings(key: string, value: any): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/ads/settings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify({ key, value })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Public: Get ad system settings
   */
  async getSettings(): Promise<any> {
    try {
      const response = await fetch(getApiUrl('/api/ads/settings'));
      if (!response.ok) {
        return { playback_config: { midroll_interval: 10 } };
      }
      return await response.json();
    } catch (error) {
      // Intentionally silent - fallback to default config
      return { playback_config: { midroll_interval: 10 } };
    }
  },

  /**
   * Public: Get active ads for Shorts feed
   */
  async getActiveShortsAds(): Promise<ShortsAd[]> {
    try {
      const response = await fetch(getApiUrl('/api/shorts/ads/active'));
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: List all shorts ads
   */
  async getAllShortsAds(): Promise<ShortsAd[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/shorts/ads'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to list shorts ads');
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Save (Create/Update) Shorts Ad
   */
  async saveShortsAd(ad: Partial<ShortsAd>): Promise<ShortsAd | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl('/api/shorts/ads'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: safeJsonStringify(ad)
      });

      if (!response.ok) throw new Error('Failed to save shorts ad');
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  /**
   * Admin: Delete Shorts Ad
   */
  async deleteShortsAd(id: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(getApiUrl(`/api/shorts/ads/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Public: Log Shorts Ad Event
   */
  async logShortsEvent(adId: string, eventType: 'impression' | 'click'): Promise<void> {
    try {
      const country = (navigator as any).language?.split('-')[1] || 'Unknown';
      const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

      await fetch(getApiUrl(`/api/shorts/ads/${adId}/event`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify({
          event_type: eventType,
          country,
          device
        })
      });
    } catch (error) {}
  },

  /**
   * Public: Log Shorts Ad View
   */
  async logShortsView(adId: string, data: { watch_time_seconds: number, completed: boolean, skipped: boolean }): Promise<void> {
    try {
      await fetch(getApiUrl(`/api/shorts/ads/${adId}/view`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify(data)
      });
    } catch (error) {}
  }
};
