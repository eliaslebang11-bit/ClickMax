-- Comprehensive Video Platform Schema (Followers Version)
-- Optimized for Supabase PostgreSQL

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
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

-- 2. Videos Table (Full Length)
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
    comments_count INTEGER DEFAULT 0,
    category TEXT,
    tags TEXT[],
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),
    status TEXT DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    is_live BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shorts Table (Vertical Videos)
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

-- 4. Ads Table
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    target_url TEXT,
    ad_type TEXT DEFAULT 'video' CHECK (ad_type IN ('video', 'banner', 'short', 'overlay')),
    placement TEXT DEFAULT 'mid-roll',
    duration_seconds INTEGER,
    impressions_count BIGINT DEFAULT 0,
    clicks_count BIGINT DEFAULT 0,
    budget_remaining DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Followings
CREATE TABLE IF NOT EXISTS public.followings (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, channel_id)
);

-- 6. Video/Short Likes
CREATE TABLE IF NOT EXISTS public.content_likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    short_id UUID REFERENCES public.shorts(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id),
    CONSTRAINT like_target_check CHECK (
        (video_id IS NOT NULL AND short_id IS NULL) OR 
        (video_id IS NULL AND short_id IS NOT NULL)
    )
);

-- 7. Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    short_id UUID REFERENCES public.shorts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT comment_target_check CHECK (
        (video_id IS NOT NULL AND short_id IS NULL) OR 
        (video_id IS NULL AND short_id IS NOT NULL)
    )
);

-- 8. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;

-- 9. Basic Policies
CREATE POLICY "Public Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Manage Own Profile" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Public Videos" ON public.videos FOR SELECT USING (visibility = 'public' AND status = 'ready');
CREATE POLICY "Manage Own Videos" ON public.videos FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Public Shorts" ON public.shorts FOR SELECT USING (true);
CREATE POLICY "Manage Own Shorts" ON public.shorts FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Public Ads" ON public.ads FOR SELECT USING (is_active = true);

CREATE POLICY "Public Comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Auth Post Comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Manage Own Comments" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'reply', 'mention', 'follow')),
    content TEXT,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    short_id UUID REFERENCES public.shorts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and Policies for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications" ON public.notifications 
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Update own notifications" ON public.notifications 
    FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "System insert notifications" ON public.notifications 
    FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
