-- Unified Repair Script for SQL Editor
-- This ensures all columns match the "Followers" and "Ads" requirements

-- 1. Profiles Table Updates
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    followers_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    shorts_count INTEGER DEFAULT 0,
    website_url TEXT,
    "isAdmin" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rename legacy column if exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscribers_count') THEN
    ALTER TABLE public.profiles RENAME COLUMN subscribers_count TO followers_count;
  END IF;
END $$;

-- 2. Videos Table Updates
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    video_url TEXT,
    hls_url TEXT,
    channel_name TEXT,
    channel_avatar TEXT,
    duration TEXT,
    duration_seconds INTEGER DEFAULT 0,
    views_count BIGINT DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    category TEXT,
    tags TEXT[],
    visibility TEXT DEFAULT 'public',
    status TEXT DEFAULT 'ready',
    is_live BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shorts Table Updates
CREATE TABLE IF NOT EXISTS public.shorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    creator TEXT,
    avatar TEXT,
    description TEXT,
    likes_count INTEGER DEFAULT 0,
    views_count BIGINT DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ads Table Creation
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    target_url TEXT,
    ad_type TEXT DEFAULT 'video',
    placement TEXT DEFAULT 'mid-roll',
    duration_seconds INTEGER,
    impressions_count BIGINT DEFAULT 0,
    clicks_count BIGINT DEFAULT 0,
    budget_remaining DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Followings Table (renamed from subscriptions)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='subscriptions') THEN
    ALTER TABLE public.subscriptions RENAME TO followings;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='followings' AND column_name='subscriber_id') THEN
        ALTER TABLE public.followings RENAME COLUMN subscriber_id TO follower_id;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.followings (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, channel_id)
);

-- Enable RLS for everything
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followings ENABLE ROW LEVEL SECURITY;

-- Apply Select policies at minimum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Profiles') THEN
    CREATE POLICY "Public Profiles" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Videos') THEN
    CREATE POLICY "Public Videos" ON public.videos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Shorts') THEN
    CREATE POLICY "Public Shorts" ON public.shorts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Ads') THEN
    CREATE POLICY "Public Ads" ON public.ads FOR SELECT USING (true);
  END IF;
END $$;

-- 6. Uploads Record Table (Metadata Storage for Cloudflare R2 Uploads)
CREATE TABLE IF NOT EXISTS public.uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_type TEXT NOT NULL CHECK (upload_type IN ('profile-picture', 'video', 'short', 'thumbnail', 'banner')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Uploads Access') THEN
    CREATE POLICY "Public Uploads Access" ON public.uploads FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Manage Own Uploads') THEN
    CREATE POLICY "Manage Own Uploads" ON public.uploads FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_storage_key ON public.uploads(storage_key);

