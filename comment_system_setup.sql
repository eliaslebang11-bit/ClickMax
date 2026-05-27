-- Comment System Setup SQL
-- Run this in your Supabase SQL Editor

-- 0. Create Comments Table if not exists
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

-- Enable RLS and Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Comments" ON public.comments;
CREATE POLICY "Public Comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Post Comments" ON public.comments;
CREATE POLICY "Auth Post Comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Manage Own Comments" ON public.comments;
CREATE POLICY "Manage Own Comments" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- 1. Ensure comment counts on content tables
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.shorts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 2. Creation of atomic increment functions
CREATE OR REPLACE FUNCTION increment_video_comments(target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.videos
  SET comments_count = comments_count + 1
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_short_comments(target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shorts
  SET comments_count = comments_count + 1
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for automatic counting (Better than manual API increments)
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.video_id IS NOT NULL) THEN
      UPDATE public.videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
    ELSIF (NEW.short_id IS NOT NULL) THEN
      UPDATE public.shorts SET comments_count = comments_count + 1 WHERE id = NEW.short_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.video_id IS NOT NULL) THEN
      UPDATE public.videos SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.video_id;
    ELSIF (OLD.short_id IS NOT NULL) THEN
      UPDATE public.shorts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.short_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_added ON public.comments;
CREATE TRIGGER on_comment_added
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- 4. Like tracking support (Optional enhancement)
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_target_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.comments
  SET likes_count = likes_count + 1
  WHERE id = comment_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
