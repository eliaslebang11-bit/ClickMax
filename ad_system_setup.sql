-- SUPABASE SQL SETUP FOR AD MANAGEMENT SYSTEM
-- Run this in your Supabase SQL Editor

-- 1. Create Advertisers
CREATE TABLE IF NOT EXISTS advertisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget DECIMAL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Ads Table (Main)
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  ad_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'interstitial', 'banner', 'popup'
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  destination_url TEXT NOT NULL,
  advertiser_name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  skippable BOOLEAN DEFAULT true,
  skip_after_seconds INTEGER DEFAULT 15,
  duration_seconds INTEGER DEFAULT 30,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  country_targeting TEXT[] DEFAULT '{}',
  device_targeting TEXT[] DEFAULT '{"desktop", "mobile"}',
  placement_type TEXT NOT NULL DEFAULT 'pre-roll', -- 'pre-roll', 'mid-roll', 'post-roll', 'overlay'
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  display_priority INTEGER DEFAULT 0, -- Higher number = higher priority
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Analytics Table
CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'impression', 'click', 'skip', 'complete'
  viewer_id UUID,
  country TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Helper Functions for increments (RPCs)
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads
  SET impressions = impressions + 1
  WHERE id = ad_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads
  SET clicks = clicks + 1
  WHERE id = ad_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add isAdmin column to profiles (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'isAdmin') THEN
        ALTER TABLE profiles ADD COLUMN "isAdmin" BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 7. Global Ad Settings
CREATE TABLE IF NOT EXISTS ad_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ad_settings (key, value) 
VALUES ('playback_config', '{"midroll_interval": 10, "rotation_quota": 20}')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS and basic policies if needed, though we use Service Role in backend
-- For simplicity in this demo, we assume the backend handles authentication/admin checks.
