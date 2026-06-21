import { Ad, AdAnalytics, AdPlacement, AdType, ShortsAd } from '../types';
import { safeJsonStringify } from '../lib/utils';
import { supabase } from '../lib/supabase';
// Removed

export const adService = {
  /**
   * Public: Get ads for the video player based on placement and type
   */
  async getActiveAds(placementType?: AdPlacement, type?: AdType): Promise<Ad[]> {
    try {
      let query = supabase.from('ads').select('*').eq('active', true);
      
      if (placementType) {
        query = query.eq('placement_type', placementType);
      }
      if (type) {
        query = query.eq('ad_type', type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching ads from Supabase:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: List all ads
   */
  async getAllAds(): Promise<Ad[]> {
    try {
      const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Create or Update an Ad
   */
  async saveAd(ad: Partial<Ad>): Promise<Ad | null> {
    try {
      const { data, error } = await supabase.from('ads').upsert([ad]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Admin: Delete an Ad
   */
  async deleteAd(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      return !error;
    } catch (error) {
      return false;
    }
  },

  /**
   * Public: Log an ad event (impression, click, etc.)
   */
  async logEvent(adId: string, eventType: AdAnalytics['event_type']): Promise<void> {
    try {
      const country = (navigator as any).language?.split('-')[1] || 'Unknown';
      const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      const { data: { session } } = await supabase.auth.getSession();

      await supabase.from('ad_analytics').insert([{
        ad_id: adId,
        event_type: eventType,
        country,
        device,
        viewer_id: session?.user?.id || null,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      // Silent on event logging failure
    }
  },

  /**
   * Admin: Get analytics summary
   */
  async getAnalyticsSummary(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('ad_analytics').select('*');
      if (error) throw error;
      // Primitive grouping since we don't have rpc here
      // Ideally should be RPC or grouped query, but for simplicity returning raw format if no RPC
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Save ad system settings
   */
  async saveSettings(key: string, value: any): Promise<boolean> {
    try {
      const { error } = await supabase.from('ad_settings').upsert([{ key, value }], { onConflict: 'key' });
      return !error;
    } catch (error) {
      return false;
    }
  },

  /**
   * Public: Get ad system settings
   */
  async getSettings(): Promise<any> {
    try {
      const { data, error } = await supabase.from('ad_settings').select('value').eq('key', 'playback_config').single();
      if (error || !data) {
        return { playback_config: { midroll_interval: 10 } };
      }
      return data.value;
    } catch (error) {
      return { playback_config: { midroll_interval: 10 } };
    }
  },

  /**
   * Public: Get active ads for Shorts feed
   */
  async getActiveShortsAds(): Promise<ShortsAd[]> {
    try {
      let { data, error } = await supabase.from('shorts_ads').select('*').eq('active', true);
      if (error || !data || data.length === 0) {
        // Fallback to general ads
        const fallback = await supabase.from('ads').select('*').eq('active', true).eq('placement_type', 'shorts-feed');
        data = fallback.data;
      }
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: List all shorts ads
   */
  async getAllShortsAds(): Promise<ShortsAd[]> {
    try {
      const { data, error } = await supabase.from('shorts_ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Save (Create/Update) Shorts Ad
   */
  async saveShortsAd(ad: Partial<ShortsAd>): Promise<ShortsAd | null> {
    try {
      const { data, error } = await supabase.from('shorts_ads').upsert([ad]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Admin: Delete Shorts Ad
   */
  async deleteShortsAd(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('shorts_ads').delete().eq('id', id);
      return !error;
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
      const { data: { session } } = await supabase.auth.getSession();

      await supabase.from('shorts_ad_analytics').insert([{
        ad_id: adId,
        event_type: eventType,
        country,
        device,
        viewer_id: session?.user?.id || null,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {}
  },

  /**
   * Public: Log Shorts Ad View
   */
  async logShortsView(adId: string, data: { watch_time_seconds: number, completed: boolean, skipped: boolean }): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('shorts_ad_views').insert([{
        ad_id: adId,
        ...data,
        viewer_id: session?.user?.id || null,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {}
  }
};
