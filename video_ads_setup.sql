-- VIDEO ADS SCHEMA & SETTINGS
-- ---------------------------------------------------------
-- Use this to ensure your Supabase tables support carousel ads
-- and are configured for 10-second intervals.
-- ---------------------------------------------------------

-- 1. Ensure 'ads' table has carousel support
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';

-- 2. Ensure 'shorts_ads' table has carousel support
ALTER TABLE public.shorts_ads 
ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';

-- 3. Ensure 'ad_type' supports 'image_carousel'
-- (Check if your existing ads table has a constraint on ad_type, 
-- if so you might need to update it, but usually it's just TEXT)

-- 4. SET AD INTERVAL SETTINGS
-- This ensures the player knows to trigger ads every 10 seconds.
INSERT INTO public.ad_settings (key, value)
VALUES 
    ('playback_config', '{"midroll_interval": 10, "rotation_quota": 5}'),
    ('shorts_config', '{"ad_interval": 1}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
