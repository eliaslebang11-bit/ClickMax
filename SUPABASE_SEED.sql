-- Seed Initial Data including Ads

-- 1. Profiles
INSERT INTO public.profiles (username, handle, avatar_url, followers_count, video_count, shorts_count, bio, banner_url, website_url, created_at)
VALUES 
('ZenSpaces', 'zenspaces', 'https://picsum.photos/seed/zen/200/200', 420000, 65, 30, 'Architect and minimalist.', 'https://picsum.photos/seed/zenbanner/1920/400', 'zenspaces.design', NOW()),
('TechPulse', 'techpulse', 'https://picsum.photos/seed/tech/200/200', 5100000, 1200, 500, 'Your daily pulse on technology.', 'https://picsum.photos/seed/techbanner/1920/400', 'techpulse.io', NOW()),
('Chef Table', 'cheftable', 'https://picsum.photos/seed/chef/200/200', 1200000, 156, 84, 'Professional chef sharing culinary secrets.', 'https://picsum.photos/seed/chefbanner/1920/400', 'chefstable.com', NOW()),
('BrandAds', 'brandads', 'https://picsum.photos/seed/ads/200/200', 0, 0, 0, 'Official advertising partner.', 'https://picsum.photos/seed/adsbanner/1920/400', 'ads.com', NOW())
ON CONFLICT (username) DO NOTHING;

-- 2. Videos
INSERT INTO public.videos (title, thumbnail, video_url, channel_name, channel_avatar, views_count, likes_count, posted_at, duration, description, category, is_live, visibility, status)
VALUES 
('The Art of Minimalist Living', 'https://picsum.photos/seed/minimal/800/450', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'ZenSpaces', 'https://picsum.photos/seed/zen/100/100', 12450, 1200, NOW() - INTERVAL '2 days', '12:45', 'Explore the beauty of simplicity in this deep dive.', 'Lifestyle', false, 'public', 'ready'),
('Future of Urban Transportation', 'https://picsum.photos/seed/urban/800/450', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'TechPulse', 'https://picsum.photos/seed/tech/100/100', 8500, 850, NOW() - INTERVAL '1 day', '08:20', 'How cities are evolving to handle the next generation of electric and autonomous vehicles.', 'Technology', false, 'public', 'ready');

-- 3. Shorts
INSERT INTO public.shorts (video_url, creator, avatar, description, likes_count, views_count, comments_count, is_live)
VALUES 
('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Chef Table', 'https://picsum.photos/seed/chef/100/100', 'The secret to the perfect sear! 🔥 #cooking #tips', 12450, 125000, 120, false),
('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'ZenSpaces', 'https://picsum.photos/seed/zen/100/100', 'Minimalist kitchen tour. ✨ #interior #design', 8900, 45000, 56, false);

-- 4. Ads
INSERT INTO public.ads (title, description, media_url, target_url, ad_type, placement, duration_seconds, is_active)
VALUES 
('Premium Coffee Subscription', 'Get 50% off your first month of artisan coffee delivered to your door.', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://coffee.example.com', 'video', 'pre-roll', 15, true),
('Travel the World', 'Explore hidden gems across the globe with our new app.', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'https://travelapp.example.com', 'video', 'mid-roll', 30, true);
