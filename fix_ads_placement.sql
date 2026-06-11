-- Migration to fix mismatch between 'placement' and 'placement_type'
-- and ensure skip defaults are set to 15 seconds.

DO $$ 
BEGIN 
  -- 1. ads table: rename placement to placement_type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='placement') THEN
    ALTER TABLE public.ads RENAME COLUMN placement TO placement_type;
  END IF;

  -- 2. ads table: ensure skip columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='skip_after_seconds') THEN
    ALTER TABLE public.ads ADD COLUMN skip_after_seconds INTEGER DEFAULT 15;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ads' AND column_name='skippable') THEN
    ALTER TABLE public.ads ADD COLUMN skippable BOOLEAN DEFAULT TRUE;
  END IF;

  -- 3. shorts_ads table: ensure skip columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shorts_ads' AND column_name='skip_after_seconds') THEN
    ALTER TABLE public.shorts_ads ADD COLUMN skip_after_seconds INTEGER DEFAULT 15;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shorts_ads' AND column_name='skippable') THEN
    ALTER TABLE public.shorts_ads ADD COLUMN skippable BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- 4. Update existing records to 15s default
  UPDATE public.ads SET skip_after_seconds = 15 WHERE skip_after_seconds IS NULL OR skip_after_seconds < 15;
  UPDATE public.shorts_ads SET skip_after_seconds = 15 WHERE skip_after_seconds IS NULL OR skip_after_seconds < 15;

END $$;
