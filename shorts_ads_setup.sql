-- SHORTS ADS DEDICATED TABLE SETUP
-- ---------------------------------------------------------
-- INSTRUCTIONS:
-- 1. Login to your Supabase Dashboard.
-- 2. Select your project.
-- 3. Click on "SQL Editor".
-- 4. Click "+ New Query".
-- 5. Copy and paste this code and click "Run".
-- ---------------------------------------------------------

-- 1. Create the dedicated shorts ads table
CREATE TABLE IF NOT EXISTS public.shorts_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT, -- Keep this for single video/image ads
    gallery_urls JSONB DEFAULT '[]', -- New column for carousel ads (array of strings)
    thumbnail_url TEXT,
    destination_url TEXT NOT NULL,
    advertiser_name TEXT NOT NULL,
    profile_picture_url TEXT,
    cta_text TEXT DEFAULT 'Learn More',
    active BOOLEAN DEFAULT TRUE,
    placement_type TEXT DEFAULT 'shorts-feed',
    ad_type TEXT DEFAULT 'vertical_video', -- 'vertical_video' or 'image_carousel'
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create increment functions for the new table
CREATE OR REPLACE FUNCTION increment_shorts_ad_impressions(ad_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE shorts_ads
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id = ad_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_shorts_ad_clicks(ad_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE shorts_ads
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = ad_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create dedicated analytics for shorts ads
CREATE TABLE IF NOT EXISTS public.shorts_ad_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.shorts_ads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'impression', 'click'
    country TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shorts_ad_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.shorts_ads(id) ON DELETE CASCADE,
    watch_time_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    skipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Set RLS Policies
ALTER TABLE public.shorts_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts_ad_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts_ad_views ENABLE ROW LEVEL SECURITY;

-- Allow public read of active ads
DROP POLICY IF EXISTS "Public Read Active Shorts Ads" ON public.shorts_ads;
CREATE POLICY "Public Read Active Shorts Ads" ON public.shorts_ads 
    FOR SELECT USING (active = TRUE);

-- Allow public insert of analytics/views
DROP POLICY IF EXISTS "Public Insert Shorts Analytics" ON public.shorts_ad_analytics;
CREATE POLICY "Public Insert Shorts Analytics" ON public.shorts_ad_analytics 
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public Insert Shorts Views" ON public.shorts_ad_views;
CREATE POLICY "Public Insert Shorts Views" ON public.shorts_ad_views 
    FOR INSERT WITH CHECK (TRUE);

-- 6. SETUP COMPLETE
-- Your database is now ready to receive ads from your Supabase Dashboard.
-- Use the 'shorts_ads' and 'ads' tables to add your own data.

-- 7. SET AD INTERVAL SETTING
INSERT INTO public.ad_settings (key, value)
VALUES ('shorts_config', '{"ad_interval": 1}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
