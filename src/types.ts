export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  channelName: string;
  channelAvatar: string;
  views: string;
  likes: string | number;
  postedAt: string;
  duration: string;
  description: string;
  category: string;
  comments: string | number;
  isLive?: boolean;
  cloudflareId?: string;
}

export interface Short {
  id: string;
  videoUrl: string;
  creator: string;
  avatar: string;
  thumbnail?: string;
  description: string;
  likes: string | number;
  views: string;
  comments: string | number;
  isLive?: boolean;
  postedAt?: string;
}

export interface UserProfile {
  id?: string;
  email?: string;
  full_name?: string;
  username: string;
  handle: string;
  avatar?: string;
  followers: string | number;
  following: string | number;
  videoCount: number;
  shortsCount: number;
  description: string;
  bio?: string;
  banner?: string;
  website?: string;
  joinedDate: string;
  isAdmin?: boolean;
  is_pinned?: boolean;
}

export type AdType = 'video' | 'interstitial' | 'banner' | 'popup' | 'vertical_video' | 'image' | 'sponsored-feed-card' | 'image_carousel';
export type AdPlacement = 'pre-roll' | 'mid-roll' | 'post-roll' | 'overlay' | 'shorts-feed';

export type ShortsAd = Ad;

export interface Advertiser {
  id: string;
  name: string;
  email: string;
  website_url?: string;
  created_at: string;
}

export interface AdCampaign {
  id: string;
  advertiser_id: string;
  name: string;
  budget?: number;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

export interface Ad {
  id: string;
  campaign_id: string;
  title: string;
  description?: string;
  ad_type: AdType;
  media_url: string;
  gallery_urls?: string[];
  thumbnail_url?: string;
  destination_url: string;
  advertiser_name: string;
  profile_picture_url?: string;
  active: boolean;
  skippable: boolean;
  skip_after_seconds: number;
  duration_seconds: number;
  cta_text?: string;
  country_targeting: string[];
  device_targeting: string[];
  placement_type: AdPlacement;
  impressions: number;
  clicks: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  priority_order?: number;
  rotation_limit?: number;
  phone_number?: string;
}

export interface AdAnalytics {
  id: string;
  ad_id: string;
  event_type: 'impression' | 'click' | 'skip' | 'complete';
  viewer_id?: string;
  country?: string;
  device?: string;
  created_at: string;
}

export interface VideoComment {
  id: string;
  videoId?: string;
  shortId?: string;
  user: string;
  avatar: string;
  text: string;
  likes: number;
  timestamp: string;
  parentId?: string;
  replies?: VideoComment[];
}
