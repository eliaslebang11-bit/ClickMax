-- Add Live Content
INSERT INTO public.videos (title, thumbnail, video_url, channel_name, channel_avatar, views_count, likes_count, posted_at, duration, description, category, is_live, visibility, status)
VALUES 
('LIVE: 24/7 Lo-fi Beats to Study/Relax', 'https://picsum.photos/seed/lofi/800/450', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'Music Pulse', 'https://api.dicebear.com/7.x/avataaars/svg?seed=music', 15400, 2300, NOW(), 'LIVE', 'Chilled beats for your focus.', 'Music', true, 'public', 'ready'),
('Tech Talks Live: AI Revolution', 'https://picsum.photos/seed/techlive/800/450', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'TechPulse', 'https://picsum.photos/seed/tech/100/100', 5000, 450, NOW(), 'LIVE', 'Breaking down the latest in AI.', 'Technology', true, 'public', 'ready');

INSERT INTO public.shorts (video_url, creator, avatar, description, likes_count, views_count, comments_count, is_live)
VALUES 
('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Chef Live', 'https://api.dicebear.com/7.x/avataaars/svg?seed=cheflive', 'Cooking Sunday Roast LIVE! 🍖', 4500, 25000, 89, true),
('https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'VibeStream', 'https://api.dicebear.com/7.x/avataaars/svg?seed=vibe', 'Weekly Q&A Session - Join in! 🎤', 1200, 8000, 45, true);
