import { Ad, AdAnalytics, AdPlacement, AdType, ShortsAd } from '../types';
import { safeJsonStringify } from '../lib/utils';
import { supabase } from '../lib/supabase';

// Helper mappers because DB schema differs from frontend expected structure
const mapDbRecordToAd = (record: any): Ad => ({
  ...record,
  active: record.is_active || false,
  placement_type: (record.placement?.toLowerCase() === 'shorts') ? 'shorts-feed' : record.placement?.toLowerCase(),
  destination_url: record.target_url || '',
  advertiser_name: record.title || 'Brand',
  duration_seconds: 15,
  skip_after_seconds: 5,
  cta_text: 'Learn More'
} as Ad);

const mapAdToDbRecord = (ad: Partial<Ad>): any => {
  const record: any = {
    id: ad.id,
    is_active: ad.active,
    placement: ad.placement_type === 'shorts-feed' ? 'Shorts' :
               ad.placement_type === 'pre-roll' ? 'Pre-roll' :
               ad.placement_type === 'mid-roll' ? 'Mid-roll' :
               ad.placement_type === 'post-roll' ? 'Post-roll' : ad.placement_type,
    target_url: ad.destination_url,
    title: ad.advertiser_name,
    media_url: ad.media_url,
    ad_type: ad.ad_type || 'video',
    description: ad.description
  };
  
  // if inserting new ad, omit id if it's new/generate one
  if (!record.id) {
    record.id = crypto.randomUUID();
  }
  
  return record;
};

export const adService = {
  /**
   * Public: Get ads for the video player based on placement and type
   */
  async getActiveAds(placementType?: AdPlacement, type?: AdType): Promise<Ad[]> {
    try {
      let query = supabase.from('ads').select('*').eq('is_active', true);
      
      if (placementType) {
        // Map frontend placement to DB placement
        const dbPlacement = placementType === 'pre-roll' ? 'Pre-roll' :
                            placementType === 'mid-roll' ? 'Mid-roll' :
                            placementType === 'post-roll' ? 'Post-roll' : 
                            placementType === 'shorts-feed' ? 'Shorts' : placementType;
        query = query.eq('placement', dbPlacement);
      }
      if (type) {
        query = query.eq('ad_type', type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching ads from Supabase:', error);
        return [];
      }
      
      return (data || []).map(mapDbRecordToAd);
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
      return (data || []).map(mapDbRecordToAd);
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Create or Update an Ad
   */
  async saveAd(ad: Partial<Ad>): Promise<Ad | null> {
    try {
      const dbAd = mapAdToDbRecord(ad);
      
      const { data, error } = await supabase.from('ads').upsert([dbAd]).select().single();
      if (error) throw error;
      return data ? mapDbRecordToAd(data) : null;
    } catch (error) {
      console.error("Save ad error:", error);
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
      const { data, error } = await supabase.from('ads').select('*').eq('is_active', true).eq('placement', 'Shorts');
      if (error) throw error;
      return (data || []).map(mapDbRecordToAd);
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: List all shorts ads
   */
  async getAllShortsAds(): Promise<ShortsAd[]> {
    try {
      const { data, error } = await supabase.from('ads').select('*').eq('placement', 'Shorts').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapDbRecordToAd);
    } catch (error) {
      return [];
    }
  },

  /**
   * Admin: Save (Create/Update) Shorts Ad
   */
  async saveShortsAd(ad: Partial<ShortsAd>): Promise<ShortsAd | null> {
    const shortsAd = { ...ad, placement_type: 'shorts-feed' as AdPlacement };
    return this.saveAd(shortsAd);
  },

  /**
   * Admin: Delete Shorts Ad
   */
  async deleteShortsAd(id: string): Promise<boolean> {
    return this.deleteAd(id);
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
