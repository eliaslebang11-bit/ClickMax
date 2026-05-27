-- AD ROTATION & SEQUENCING UPDATE
-- ---------------------------------------------------------
-- Adding columns for custom sequencing and per-ad rotation limits.
-- ---------------------------------------------------------

-- 1. Update 'ads' table
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rotation_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Update 'shorts_ads' table
ALTER TABLE public.shorts_ads 
ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rotation_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. Update rotation logic references in ad_settings (Optional, logic is in server.ts)
INSERT INTO public.ad_settings (key, value)
VALUES ('rotation_config', '{"default_rotation_limit": 3}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
