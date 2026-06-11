-- Update skip timer defaults to 15 seconds
-- 1. Update general ads table
ALTER TABLE public.ads ALTER COLUMN skip_after_seconds SET DEFAULT 15;
UPDATE public.ads SET skip_after_seconds = 15 WHERE skip_after_seconds = 5 OR skip_after_seconds IS NULL;

-- 2. Update shorts_ads table
-- First ensure columns exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shorts_ads' AND column_name='skip_after_seconds') THEN
    ALTER TABLE public.shorts_ads ADD COLUMN skip_after_seconds INTEGER DEFAULT 15;
  ELSE
    ALTER TABLE public.shorts_ads ALTER COLUMN skip_after_seconds SET DEFAULT 15;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shorts_ads' AND column_name='skippable') THEN
    ALTER TABLE public.shorts_ads ADD COLUMN skippable BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

UPDATE public.shorts_ads SET skip_after_seconds = 15 WHERE skip_after_seconds = 5 OR skip_after_seconds IS NULL;
