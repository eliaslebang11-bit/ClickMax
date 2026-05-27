-- UNIFIED AD SYSTEM SCHEMA UPDATE (Supabase)
-- ---------------------------------------------------------
-- INSTRUCTIONS:
-- 1. Login to your Supabase Dashboard.
-- 2. Select your project.
-- 3. In the left-hand sidebar, click on "SQL Editor" (looks like >_ ).
-- 4. Click "+ New Query".
-- 5. Copy ALL the code below and paste it into the editor.
-- 6. Click the blue "Run" button at the top right.
-- ---------------------------------------------------------

-- 1. Ensure the 'ads' table has all necessary informative fields
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS destination_url TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS advertiser_name TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Learn More';

-- 2. Extend with targeting and playback controls
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS skippable BOOLEAN DEFAULT TRUE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS skip_after_seconds INTEGER DEFAULT 15;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS country_targeting TEXT[] DEFAULT '{}';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS device_targeting TEXT[] DEFAULT '{"mobile", "desktop"}';

-- 3. Ensure analytic counters exist
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- 4. Update Increment Functions
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id = ad_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = ad_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Detailed View Tracking
CREATE TABLE IF NOT EXISTS public.ad_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
    viewer_id UUID,
    watch_time_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    skipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS Policies
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Ad Views" ON public.ad_views;
CREATE POLICY "Public Insert Ad Views" ON public.ad_views FOR INSERT WITH CHECK (TRUE);

-- 7. Initialize Shorts Ad Settings
INSERT INTO ad_settings (key, value) 
VALUES ('shorts_config', '{"ad_interval": 4}')
ON CONFLICT (key) DO NOTHING;
