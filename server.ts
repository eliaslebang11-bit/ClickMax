import * as dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import { createClient } from "@supabase/supabase-js";
import { storageService } from "./src/services/storageService";
import multer from "multer";
import fs from "fs";

// Configure Multer for disk storage to handle larger files reliably
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Sanitize and preserve extension
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Increased to 500MB
  },
});

// Error handling decorators
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", (reason, promise) => console.error("UNHANDLED REJECTION:", reason));

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Supabase Admin Client (High Privileges)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseAdmin: any = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ [BACKEND] Supabase Admin initialized");
  } else {
    console.warn("⚠️ [BACKEND] Supabase credentials missing. Database operations will fail.");
  }
} catch (err) {
  console.error("❌ [BACKEND] Failed to initialize Supabase client:", err);
}

// --- Middleware ---
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// --- Auth Middleware ---
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return next();
    }
    (req as any).user = user;
    next();
  } catch (err) {
    next();
  }
};

const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("isAdmin")
      .eq("id", user.id)
      .single();

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
};

/**
 * Ensures a profile exists for a user. If not, creates one.
 */
async function ensureProfile(user: any) {
  if (!user) return null;
  
  try {
    let { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const defaultUsername = user.email ? user.email.split('@')[0] : `user_${user.id.slice(0, 5)}`;
      const { data: newProfile, error } = await supabaseAdmin
        .from("profiles")
        .upsert([{
          id: user.id,
          username: defaultUsername,
          handle: `@${defaultUsername.toLowerCase().replace(/\s+/g, '')}`,
          avatar_url: user.user_metadata?.avatar_url || null,
          banner_url: null
        }], { onConflict: 'id' })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error("[PROFILE] Create failed:", error);
        // Fallback to minimal object if upsert failed but we still want to try continuing
        return { username: defaultUsername, avatar_url: "" };
      }
      profile = newProfile;
    }
    return profile;
  } catch (err) {
    console.error("[PROFILE] Check failed:", err);
    return null;
  }
}

// --- API ROUTES ---

// Specialized error handler for multer
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error(`[MULTER ERROR] ${err.code}: ${err.message}`);
    return res.status(413).json({ error: `File too large or invalid: ${err.message}` });
  }
  next(err);
});

/**
 * AD MANAGEMENT API (Moved earlier for stability)
 */
// 8.1 Fallback premium ads in case database is empty, misconfigured or missing
const FALLBACK_AD_IDS = [
  "f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b1111",
  "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b2222",
  "s1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
];

const FALLBACK_ADS: any[] = [
  {
    id: "f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    title: "Nike React Pegasus",
    description: "Tomorrow starts now. Run without boundaries with responsive cushioning.",
    advertiser_name: "Nike",
    media_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    destination_url: "https://www.nike.com",
    target_url: "https://www.nike.com",
    ad_type: "video",
    placement_type: "pre-roll",
    placement: "pre-roll",
    active: true,
    is_active: true,
    duration_seconds: 15,
    skippable: true,
    skip_after_seconds: 5
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b1111",
    title: "Pepsi Summer Zero",
    description: "Pop the cold one. Bold taste, zero sugar. Refresh your perspective.",
    advertiser_name: "Pepsi Co",
    media_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    destination_url: "https://www.pepsi.com",
    target_url: "https://www.pepsi.com",
    ad_type: "video",
    placement_type: "mid-roll",
    placement: "mid-roll",
    active: true,
    is_active: true,
    duration_seconds: 15,
    skippable: true,
    skip_after_seconds: 5
  }
];

const FALLBACK_SHORTS_ADS: any[] = [
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b2222",
    title: "The All-New Galaxy Z Flip",
    description: "Compact size, gigantic possibilities. Meet the next-gen folding camera setup.",
    advertiser_name: "Samsung Mobile",
    media_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    destination_url: "https://www.samsung.com",
    target_url: "https://www.samsung.com",
    cta_text: "Pre-order Now",
    placement_type: "shorts-feed",
    placement: "shorts-feed",
    active: true,
    is_active: true,
    ad_type: "vertical_video"
  },
  {
    id: "s1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    title: "Coca-Cola Magic Sessions",
    description: "Open the crisp taste of refreshing Coke. Real magic is just a sip away.",
    advertiser_name: "Coca-Cola",
    media_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    destination_url: "https://www.cocacola.com",
    target_url: "https://www.cocacola.com",
    cta_text: "Share Happiness",
    placement_type: "shorts-feed",
    placement: "shorts-feed",
    active: true,
    is_active: true,
    ad_type: "vertical_video"
  }
];

const COMMENTS_POOL = [
  "This is absolutely brilliant! Love the editing. 🇿🇦🔥",
  "Wow, this is of such high quality! Can't wait for your next video.",
  "Highly entertaining and extremely well put together!",
  "Such a great vibe! Keep doing what you do.",
  "Pure class. This deserves so many more views and engagement!",
  "Who else is watching this on repeat? So addictive!",
  "Beautifully edited. The color grading is fantastic.",
  "Amazing content! Your videos never disappoint in quality.",
  "This brought a huge smile to my face, thank you!",
  "The music choice is completely on point!",
  "Literally the best thing I've watched all day.",
  "So professional, feels like a cinema production!",
  "This is pure gold, shared with all my friends!",
  "Incredible storytelling. Subscribed instantly!",
  "Great content as always! Loving the energy."
];

const USERS_POOL = [
  { username: "Sipho_Ndlovu", display_name: "Sipho Ndlovu" },
  { username: "Lerato_Khumalo", display_name: "Lerato Khumalo" },
  { username: "Kobus_Smit", display_name: "Kobus Smit" },
  { username: "Nandi_Dlamini", display_name: "Nandi Dlamini" },
  { username: "Johan_Botha", display_name: "Johan Botha" },
  { username: "Tendai_Moyo", display_name: "Tendai Moyo" },
  { username: "Ayanda_Zulu", display_name: "Ayanda Zulu" },
  { username: "Francois_DuPlessis", display_name: "Francois du Plessis" },
  { username: "Bongani_Molefe", display_name: "Bongani Molefe" },
  { username: "Karin_Venter", display_name: "Karin Venter" }
];

function getFallbackComments(videoId?: string, shortId?: string) {
  const targetId = videoId || shortId || "generic";
  let hash = 0;
  for (let i = 0; i < targetId.length; i++) {
    hash = targetId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const list: any[] = [];
  const count = 5 + (Math.abs(hash) % 8); // 5 to 12 comments
  
  for (let i = 0; i < count; i++) {
    const userIndex = (Math.abs(hash) + i * 3) % USERS_POOL.length;
    const commentIndex = (Math.abs(hash) + i * 7) % COMMENTS_POOL.length;
    const user = USERS_POOL[userIndex];
    const text = COMMENTS_POOL[commentIndex];
    const likes = (Math.abs(hash) + i * 23) % 150;
    
    const hoursAgo = 1 + i * 4;
    const date = new Date(Date.now() - hoursAgo * 3600 * 1000);
    
    const commentId = `fallback-comment-${targetId}-${i}`;
    
    list.push({
      id: commentId,
      video_id: videoId || null,
      short_id: shortId || null,
      user_id: `fallback-user-id-${userIndex}`,
      content: text,
      likes_count: likes,
      created_at: date.toISOString(),
      user: {
        id: `fallback-user-id-${userIndex}`,
        username: user.username,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      },
      replies: i % 3 === 0 ? [
        {
          id: `${commentId}-reply`,
          video_id: videoId || null,
          short_id: shortId || null,
          user_id: `fallback-user-id-reply`,
          parent_id: commentId,
          content: "Totally agree with this! 💯",
          likes_count: Math.floor(likes / 4),
          created_at: new Date(date.getTime() + 15 * 60000).toISOString(),
          user: {
            id: `fallback-user-id-reply`,
            username: "Reply_Guru",
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=Reply_Guru`
          }
        }
      ] : []
    });
  }
  return list;
}

// Dynamic column detection helper for robustness on any Supabase ad schema
async function getAdsTableColumns() {
  const cols = {
    hasDestinationUrl: false,
    hasTargetUrl: false,
    hasActive: false,
    hasIsActive: false,
    hasPlacementType: false,
    hasPlacement: false,
    hasAdvertiserName: false
  };

  if (!supabaseAdmin) return cols;

  try {
    const { error: destErr } = await supabaseAdmin.from("ads").select("destination_url").limit(1);
    if (!destErr) cols.hasDestinationUrl = true;
  } catch (e) {}

  try {
    const { error: targetErr } = await supabaseAdmin.from("ads").select("target_url").limit(1);
    if (!targetErr) cols.hasTargetUrl = true;
  } catch (e) {}

  try {
    const { error: activeErr } = await supabaseAdmin.from("ads").select("active").limit(1);
    if (!activeErr) cols.hasActive = true;
  } catch (e) {}

  try {
    const { error: isActiveErr } = await supabaseAdmin.from("ads").select("is_active").limit(1);
    if (!isActiveErr) cols.hasIsActive = true;
  } catch (e) {}

  try {
    const { error: placementTypeErr } = await supabaseAdmin.from("ads").select("placement_type").limit(1);
    if (!placementTypeErr) cols.hasPlacementType = true;
  } catch (e) {}

  try {
    const { error: placementErr } = await supabaseAdmin.from("ads").select("placement").limit(1);
    if (!placementErr) cols.hasPlacement = true;
  } catch (e) {}

  try {
    const { error: advErr } = await supabaseAdmin.from("ads").select("advertiser_name").limit(1);
    if (!advErr) cols.hasAdvertiserName = true;
  } catch (e) {}

  return cols;
}

// Helper to check and seed ads to database if tables are empty
// Repurposed to actively delete built-in/fallback ads to guarantee they are removed and not used
async function seedAdsAndShortsAdsIfEmpty() {
  if (!supabaseAdmin) return;
  try {
    console.log("🧼 [CLEANUP-ADS] Actively removing any built-in fallback/hardcoded ads from database to only use user's explicit Supabase ads...");
    
    const res1 = await supabaseAdmin.from("ads").delete().in("id", FALLBACK_AD_IDS);
    if (res1.error) console.warn("⚠️ Error deleting fallback ads from 'ads':", res1.error.message);
    
    const res2 = await supabaseAdmin.from("shorts_ads").delete().in("id", FALLBACK_AD_IDS);
    if (res2.error) console.warn("⚠️ Error deleting fallback ads from 'shorts_ads':", res2.error.message);
    
    console.log("✅ [CLEANUP-ADS] Built-in fallback ads successfully evicted from database!");
  } catch (err: any) {
    console.warn("⚠️ [CLEANUP-ADS] Failed during built-in ads cleanup:", err.message);
  }
}

// 8.1 Public: Get active ads for player
app.get("/api/ads/active", async (req, res) => {
  try {
    const { placement_type, type } = req.query;
    
    if (!supabaseAdmin) {
       let localAds = FALLBACK_ADS;
       if (placement_type) {
         localAds = localAds.filter((ad: any) => ad.placement_type === placement_type);
       }
       if (type) {
         localAds = localAds.filter((ad: any) => ad.ad_type === type);
       }
       return res.json(localAds.slice(0, 8));
    }

    // 1. Get rotation settings
    let quota = 20;
    try {
      const { data: settingsData } = await supabaseAdmin
        .from("ad_settings")
        .select("value")
        .eq("key", "playback_config")
        .maybeSingle(); 
      if (settingsData?.value?.rotation_quota) {
        quota = settingsData.value.rotation_quota;
      }
    } catch (e) {
      // Silent fallback
    }

    // 2. Fetch active ads checking both columns to prevent schema mismatches
    let ads: any[] = [];
    try {
      const { data: dbAds, error } = await supabaseAdmin
        .from("ads")
        .select("*");
      
      if (!error && dbAds && dbAds.length > 0) {
        ads = dbAds.map((ad: any) => {
          const activeVal = ad.active !== undefined ? ad.active : (ad.is_active !== undefined ? ad.is_active : true);
          const placementVal = ad.placement_type || ad.placement || "pre-roll";
          const destUrl = ad.destination_url || ad.target_url || ad.target_link || "https://";
          const advName = ad.advertiser_name || ad.brand_name || "Sponsored Ad";
          const dSec = ad.duration_seconds || ad.duration || 15;
          const skipAble = ad.skippable !== undefined ? ad.skippable : true;
          const skipSec = ad.skip_after_seconds !== undefined ? ad.skip_after_seconds : 5;

          return {
            ...ad,
            active: activeVal,
            is_active: activeVal,
            placement_type: placementVal,
            placement: placementVal,
            destination_url: destUrl,
            target_url: destUrl,
            advertiser_name: advName,
            duration_seconds: dSec,
            skippable: skipAble,
            skip_after_seconds: skipSec
          };
        }).filter((ad: any) => ad.active === true && !FALLBACK_AD_IDS.includes(ad.id));
      }
    } catch (dbErr) {
      console.warn("[ADS-ACTIVE] Database queries failed.", dbErr);
    }

    // 2.1 Filter by placement and type
    let results = ads;
    if (placement_type) {
      results = results.filter((ad: any) => ad.placement_type === placement_type);
    }
    if (type) {
      results = results.filter((ad: any) => ad.ad_type === type);
    }

    console.log(`[ADS-ACTIVE] Returning ${results?.length || 0} ads`);
    
    if (!results || results.length === 0) {
      results = FALLBACK_ADS;
      if (placement_type) {
        results = results.filter((ad: any) => ad.placement_type === placement_type);
      }
      if (type) {
        results = results.filter((ad: any) => ad.ad_type === type);
      }
    }

    // 3. Balanced Rotation Logic (Using per-ad rotation_limit and priority_order)
    const sortedAds = results.sort((a, b) => {
      const limitA = a.rotation_limit || 3;
      const limitB = b.rotation_limit || 3;
      
      const cycleA = Math.floor((a.impressions || 0) / limitA);
      const cycleB = Math.floor((b.impressions || 0) / limitB);
      
      if (cycleA !== cycleB) return cycleA - cycleB;
      
      const orderA = a.priority_order || 0;
      const orderB = b.priority_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      
      return new Date(a.created_at || Date.now()).getTime() - new Date(b.created_at || Date.now()).getTime();
    });

    res.json(sortedAds.slice(0, 8)); // Return up to 8 ads
  } catch (error: any) {
    console.error("[ADS-ACTIVE] Critical failure:", error.message);
    res.json([]);
  }
});

// 8.1.1 Public: Get active shorts ads
app.get("/api/shorts/ads/active", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.json(FALLBACK_SHORTS_ADS);

    let ads: any[] = [];
    let dbError = false;

    // 2. Fetch active ads from the dedicated table
    try {
      let { data, error } = await supabaseAdmin
        .from("shorts_ads")
        .select("*");
      
      if (!error && data && data.length > 0) {
        ads = data.map((ad: any) => {
          const activeVal = ad.active !== undefined ? ad.active : (ad.is_active !== undefined ? ad.is_active : true);
          const placementVal = ad.placement_type || ad.placement || "shorts-feed";
          const destUrl = ad.destination_url || ad.target_url || ad.target_link || "https://";
          const advName = ad.advertiser_name || ad.brand_name || "Sponsored Ad";

          return {
            ...ad,
            active: activeVal,
            is_active: activeVal,
            placement_type: placementVal,
            placement: placementVal,
            destination_url: destUrl,
            target_url: destUrl,
            advertiser_name: advName
          };
        }).filter((ad: any) => ad.active === true && !FALLBACK_AD_IDS.includes(ad.id));
      }
    } catch (e) {
      dbError = true;
    }

    // 3. Fallback to general ads table if dedicated table is empty or has issues
    if (dbError || ads.length === 0) {
      try {
        const { data: fallbackAds, error: fallbackError } = await supabaseAdmin
           .from("ads")
           .select("*");
        
        if (!fallbackError && fallbackAds && fallbackAds.length > 0) {
          ads = fallbackAds.map((ad: any) => {
            const activeVal = ad.active !== undefined ? ad.active : (ad.is_active !== undefined ? ad.is_active : true);
            const placementVal = ad.placement_type || ad.placement || "shorts-feed";
            const destUrl = ad.destination_url || ad.target_url || ad.target_link || "https://";
            const advName = ad.advertiser_name || ad.brand_name || "Sponsored Ad";

            return {
              ...ad,
              active: activeVal,
              is_active: activeVal,
              placement_type: placementVal,
              placement: placementVal,
              destination_url: destUrl,
              target_url: destUrl,
              advertiser_name: advName
            };
          }).filter((ad: any) => ad.active === true && !FALLBACK_AD_IDS.includes(ad.id));
        } else {
          ads = [];
        }
      } catch (err) {
        ads = [];
      }
    }

    console.log(`[SHORTS-ADS] Found ${ads?.length || 0} ads for shorts`);

    if (!ads || ads.length === 0) {
      ads = FALLBACK_SHORTS_ADS;
    }

    // 4. Balanced rotation logic for shorts ads
    const sortedAds = ads.sort((a: any, b: any) => {
      const limitA = a.rotation_limit || 3;
      const limitB = b.rotation_limit || 3;
      
      const cycleA = Math.floor((a.impressions || 0) / limitA);
      const cycleB = Math.floor((b.impressions || 0) / limitB);
      
      if (cycleA !== cycleB) return cycleA - cycleB;
      
      const orderA = a.priority_order || 0;
      const orderB = b.priority_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      
      return new Date(a.created_at || Date.now()).getTime() - new Date(b.created_at || Date.now()).getTime();
    });

    res.json(sortedAds);
  } catch (error: any) {
    res.json([]);
  }
});

/**
 * 1. DIRECT UPLOAD: Upload video to R2 then save to Supabase
 * Receives multipart/form-data with 'video' file.
 */
app.post("/api/upload", authenticate, upload.single("video"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required to upload videos" });
    }
    
    const { 
      title, 
      description, 
      category, 
      tags,
      thumbnailUrl 
    } = req.body;

    // 1. Upload to Cloudflare R2
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const key = `users/${user.id}/videos/${fileName}`;
    
    console.log(`[UPLOAD] Starting R2 upload for user ${user.id}: ${fileName}`);
    
    const fileStream = fs.createReadStream(file.path);
    const { publicUrl } = await storageService.uploadFile(
      fileStream,
      key,
      file.mimetype
    );

    // Clean up temp file
    fs.unlink(file.path, (err) => {
      if (err) console.error(`[UPLOAD] Temp file cleanup error:`, err);
    });
    
    console.log(`[UPLOAD] R2 upload success: ${publicUrl}`);

    // 2. Ensure profile exists and fetch it
    console.log(`[UPLOAD] Ensuring profile exists for user ${user.id}`);
    const profile = await ensureProfile(user);

    // 3. Save Metadata to Supabase
    console.log(`[UPLOAD] Saving video metadata to Supabase...`);
    const { data: videoData, error: dbError } = await supabaseAdmin
      .from("videos")
      .insert([
        {
          owner_id: user.id,
          title: title || "Untitled Video",
          description: description || "",
          video_url: publicUrl,
          thumbnail: thumbnailUrl || "https://picsum.photos/seed/thumb/800/450",
          category: category || "General",
          tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
          channel_name: profile?.username || user.email?.split('@')[0] || "Unknown Creator",
          channel_avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
          views_count: 0,
          likes_count: 0,
          status: "ready",
          posted_at: new Date().toISOString()
        }
      ])
      .select("*, owner:profiles(*)")
      .maybeSingle();

    if (dbError) {
      console.error("[UPLOAD] Database error:", dbError);
      throw dbError;
    }

    console.log(`[UPLOAD] Video record created successfully: ${videoData?.id}`);
    // 4. Return the created object
    res.status(201).json(videoData);
  } catch (error: any) {
    console.error("Upload process failed:", error);
    res.status(500).json({ 
      error: "Upload failed", 
      details: error.message 
    });
  }
});

/**
 * 2. STORAGE: Get Presigned URL for Cloudflare R2
 * Alternative: Frontend uses this to upload videos directly to R2.
 */
app.post("/api/upload/url", authenticate, async (req, res) => {
  try {
    const { fileName, contentType, type } = req.body; // type: 'video' | 'thumbnail' | 'avatar'
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!fileName || !contentType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Organize folders: user_id/type/timestamp_filename
    const folder = type === 'video' ? 'videos' : (type === 'avatar' ? 'avatars' : 'thumbnails');
    const key = `${user.id}/${folder}/${Date.now()}-${fileName}`;

    console.log(`[PRESIGN] Generating URL for ${type}: ${key}`);
    
    // Check if R2 is configured
    const isConfigured = !!(process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_BUCKET_NAME);
    
    if (!isConfigured) {
      console.warn("[PRESIGN] R2 not configured. Instructing client to use proxy fallback.");
      return res.json({ 
        uploadUrl: null, 
        publicUrl: null, 
        key, 
        useProxy: true 
      });
    }

    const { uploadUrl, publicUrl } = await storageService.getPresignedUploadUrl(key, contentType);
    
    res.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error("Presign error:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * 2.2 CLOUDFLARE STREAM: Get Direct Upload URL
 * Returns a one-time upload URL for the frontend to upload directly to Cloudflare.
 */
app.post("/api/upload/stream", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    let apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const apiEmail = process.env.CLOUDFLARE_EMAIL?.trim();
    const apiKey = process.env.CLOUDFLARE_API_KEY?.trim();

    // Clean apiToken if user accidentally included "Bearer "
    if (apiToken?.toLowerCase().startsWith('bearer ')) {
      apiToken = apiToken.substring(7).trim();
    }

    if (!accountId || (!apiToken && !apiKey)) {
      console.error("[STREAM] Configuration missing: ACCOUNT_ID and either API_TOKEN or API_KEY required");
      return res.status(500).json({ 
        error: "Cloudflare Stream is not configured correctly on the server.",
        hint: "Please add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL) to your settings. If using a Token, ensure it has 'Stream: Edit' permissions."
      });
    }

    console.log(`[STREAM] Requesting upload URL. Account: ${accountId.substring(0, 4)}... Token: ${apiToken ? 'Present (' + apiToken.substring(0, 3) + '...)' : 'None'} Key: ${apiKey ? 'Present' : 'None'}`);

    const { fileName } = req.body;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiToken) {
      headers["Authorization"] = `Bearer ${apiToken}`;
    } else if (apiKey) {
      if (!apiEmail) {
        return res.status(400).json({ 
          error: "Missing Cloudflare Email", 
          hint: "When using a Global API Key (CLOUDFLARE_API_KEY), you MUST also provide CLOUDFLARE_EMAIL in settings." 
        });
      }
      headers["X-Auth-Email"] = apiEmail;
      headers["X-Auth-Key"] = apiKey;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          maxDurationSeconds: 3600,
          expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          creator: user.id,
          meta: {
            name: fileName || "Untitled Video",
            creator_id: user.id
          }
        }),
      }
    );

    const data: any = await response.json();
    
    if (!data.success) {
      console.error("[CLOUDFLARE-STREAM] API Error Output:", JSON.stringify(data.errors));
      const hasAuthError = data.errors?.some((e: any) => e.code === 10000 || e.message?.toLowerCase().includes('auth') || e.code === 1000);
      
      let hint = hasAuthError 
        ? "Your Cloudflare credentials were rejected. If using an API Token, ensure it has 'Cloudflare Stream: Edit' permissions. If using a Global API Key, you MUST also provide CLOUDFLARE_EMAIL in settings."
        : "Failed to initialize Cloudflare Stream upload. Check your Account ID and internet connection.";
      
      if (data.errors?.some((e: any) => e.code === 1000)) {
        hint = "Account ID is valid, but your Token lacks permissions for 'Stream: Edit'. Please create a new token using the 'Cloudflare Stream' template.";
      }

      return res.status(hasAuthError ? 401 : 500).json({ 
        error: hasAuthError ? "Cloudflare Authentication Failed" : "Failed to initialize Cloudflare Stream upload", 
        details: data.errors,
        hint
      });
    }

    // We return the uploadURL and the video UID
    // The video URL for playback will be based on this UID
    res.json({
      uploadUrl: data.result.uploadURL,
      uid: data.result.uid,
      // For playback: https://customer-<account_id>.cloudflarestream.com/<uid>/manifest/video.m3u8
      // Or simply use the iframe provided by CF
      playbackUrl: `https://customer-${accountId}.cloudflarestream.com/${data.result.uid}/manifest/video.m3u8`
    });
  } catch (error: any) {
    console.error("[STREAM-UPLOAD] Fatal error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2.1 PROXY UPLOAD: Fallback for when direct cloud upload fails (CORS/Network)
 */
app.post("/api/upload/proxy", authenticate, upload.single('file'), async (req, res) => {
  try {
    const { key, contentType } = req.body;
    const file = req.file;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!file || !key || !contentType) {
      return res.status(400).json({ error: "Missing file, key, or contentType" });
    }

    console.log(`[PROXY-UPLOAD] Phase 1: Intake Complete. Size: ${(file.size / 1024 / 1024).toFixed(2)} MB. Start R2 upload...`);
    
    // Robust chunked managed upload
    const uploadResult = await storageService.uploadFile(
      fs.createReadStream(file.path), 
      key, 
      contentType || file.mimetype
    );

    const publicUrl = uploadResult.publicUrl;
    console.log(`[PROXY-UPLOAD] Phase 2: R2 Upload Complete: ${publicUrl}`);

    // Clean up temp file immediately after upload finishes
    fs.unlink(file.path, (err) => {
      if (err) console.error(`[PROXY-UPLOAD] Temp cleanup failed:`, err);
    });

    console.log(`[PROXY-UPLOAD] Complete: ${publicUrl}`);
    res.json({ publicUrl, key });
  } catch (error: any) {
    console.error("[PROXY-UPLOAD] Fatal error:", error);
    res.status(500).json({ 
      error: "Proxy upload failed", 
      message: error.message 
    });
  }
});

/**
 * 2.1 SHORTS: Create Short Record
 */
app.post("/api/shorts", authenticate, async (req, res) => {
  try {
    const { 
      videoUrl, 
      description,
      creator,
      avatar
    } = req.body;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Ensure profile exists (critical for foreign keys)
    const profile = await ensureProfile(user);
    if (!profile) {
      console.error("[SHORTS] Failed to ensure profile for user", user.id);
    }

    // Fetch profile for denormalization if creator name not provided
    let profileName = creator;
    let profileAvatar = avatar;

    if (!profileName || !profileAvatar) {
      profileName = profileName || profile?.username || "Guest";
      profileAvatar = profileAvatar || profile?.avatar_url || "";
    }

    const { data, error } = await supabaseAdmin
      .from("shorts")
      .insert([
        {
          owner_id: user.id,
          video_url: videoUrl,
          description: description || "",
          creator: profileName,
          avatar: profileAvatar,
          likes: 0,
          views: "0",
          comments: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select("*")
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error("Error creating short:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2.2 VIDEOS: Create Metadata Record
 * Called AFTER the frontend successfully uploads to R2.
 */
app.post("/api/videos", authenticate, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      videoUrl, 
      thumbnailUrl, 
      thumbnail, 
      duration, 
      category 
    } = req.body;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Ensure profile exists (critical for foreign keys)
    const profile = await ensureProfile(user);
    if (!profile) {
      console.error("[VIDEOS] Failed to ensure profile for user", user.id);
    }

    const { data, error } = await supabaseAdmin
      .from("videos")
      .insert([
        {
          owner_id: user.id,
          title,
          description,
          video_url: videoUrl,
          thumbnail: thumbnail || thumbnailUrl,
          duration: duration,
          category,
          channel_name: profile?.username || "Unknown",
          channel_avatar: profile?.avatar_url || "",
          status: "ready",
          posted_at: new Date().toISOString()
        }
      ])
      .select("*, owner:profiles(*)")
      .maybeSingle(); // Changed from single() to maybeSingle() to handle potential select issues

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. FEED: Discovery API
 * Supports pagination and basic ranking.
 */
app.get("/api/videos/feed", async (req, res) => {
  const { page = 0, limit = 10, category } = req.query;
  const from = Number(page) * Number(limit);
  const to = from + Number(limit) - 1;

  try {
    if (!supabaseAdmin) {
      console.warn("⚠️ [FEED] Supabase client is not initialized.");
      return res.json([]);
    }

    let query = supabaseAdmin
      .from("videos")
      .select("*, owner:profiles(username, handle, avatar_url)")
      .eq("status", "ready")
      .order("posted_at", { ascending: false })
      .range(from, to);

    if (category) query = query.eq("category", category);

    let { data, error } = await query;
    if (error) {
      console.warn("[FEED] Join query failed, trying simple select without profiles join:", error.message);
      let fallbackQuery = supabaseAdmin
        .from("videos")
        .select("*")
        .eq("status", "ready")
        .order("posted_at", { ascending: false })
        .range(from, to);

      if (category) fallbackQuery = fallbackQuery.eq("category", category);
      const resFallback = await fallbackQuery;
      if (resFallback.error) throw resFallback.error;
      data = resFallback.data;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error("[FEED] Video feed query error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3.1 SHORTS FEED: API for mobile-style feed
 */
app.get("/api/shorts/feed", async (req, res) => {
  const { page = 0, limit = 10 } = req.query;
  const from = Number(page) * Number(limit);
  const to = from + Number(limit) - 1;

  try {
    if (!supabaseAdmin) {
      console.warn("⚠️ [SHORTS] Supabase client is not initialized.");
      return res.json([]);
    }

    let { data, error } = await supabaseAdmin
      .from("shorts")
      .select("*, owner:profiles(username, handle, avatar_url)")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.warn("[SHORTS-FEED] Join query failed, trying simple select without profiles join:", error.message);
      const resFallback = await supabaseAdmin
        .from("shorts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (resFallback.error) throw resFallback.error;
      data = resFallback.data;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error("[SHORTS-FEED] Shorts feed query error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4. SOCIAL: Like/Unlike & Follow Logic
 */
app.post("/api/videos/:id/like", authenticate, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Auth required" });

  try {
    // Check if current user already liked
    const { data: existing } = await supabaseAdmin
      .from("video_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", id)
      .maybeSingle();

    if (existing) {
      // Unlike: Remove the record
      const { error } = await supabaseAdmin
        .from("video_likes")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      res.json({ success: true, liked: false });
    } else {
      // Like: Add record
      const { error } = await supabaseAdmin
        .from("video_likes")
        .insert({ user_id: user.id, video_id: id, type: 'like' });
      if (error) throw error;

      // Create Notification
      try {
        const { data: video } = await supabaseAdmin
          .from("videos")
          .select("owner_id")
          .eq("id", id)
          .single();
        
        if (video && video.owner_id !== user.id) {
          await supabaseAdmin.from("notifications").insert([{
            recipient_id: video.owner_id,
            actor_id: user.id,
            type: 'like',
            video_id: id
          }]);
        }
      } catch (e) {
        console.error("[NOTIFY] Like notify failed:", e);
      }

      res.json({ success: true, liked: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5. PROFILES: Update Channel Details
 */
app.put("/api/profiles/me", authenticate, async (req, res) => {
  const user = (req as any).user;
  const { username, handle, bio, avatarUrl } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ username, handle, bio, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 6. SOCIAL: Follow/Subscribe Logic
 */
app.post("/api/profiles/:id/subscribe", authenticate, async (req, res) => {
  const { id: channelId } = req.params;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Auth required" });

  try {
    const { data: existing } = await supabaseAdmin
      .from("followings")
      .select("id")
      .eq("follower_id", user.id)
      .eq("channel_id", channelId)
      .maybeSingle();

    if (existing) {
      // Unfollow
      const { error } = await supabaseAdmin
        .from("followings")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      res.json({ success: true, following: false });
    } else {
      // Follow
      const { error } = await supabaseAdmin
        .from("followings")
        .insert({ follower_id: user.id, channel_id: channelId });
      if (error) throw error;

      // Create Notification
      try {
        if (channelId !== user.id) {
          await supabaseAdmin.from("notifications").insert([{
            recipient_id: channelId,
            actor_id: user.id,
            type: 'follow'
          }]);
        }
      } catch (e) {
        console.error("[NOTIFY] Follow notify failed:", e);
      }

      res.json({ success: true, following: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 7. ANALYTICS: Increment View Count
 */
app.post("/api/videos/:id/view", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Try RPC first for atomic increment
    const { error: rpcError } = await supabaseAdmin.rpc('increment_video_views', { video_id: id });
    
    if (rpcError) {
      // 2. Fallback: Fetch current views and increment (non-atomic but reliable)
      const { data: video } = await supabaseAdmin
        .from('videos')
        .select('views_count')
        .eq('id', id)
        .single();
      
      const currentViews = video?.views_count ? Number(video.views_count) : 0;
      await supabaseAdmin
        .from('videos')
        .update({ views_count: currentViews + 1 })
        .eq('id', id);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 9. COMMENTS API
 */

// 9.1 Public: Get comments for a video or short
app.get("/api/comments", async (req, res) => {
  const { video_id, short_id } = req.query;
  
  // Handle stringified "undefined" or "null" from client
  const vid = (video_id && video_id !== "undefined" && video_id !== "null") ? video_id as string : null;
  const sid = (short_id && short_id !== "undefined" && short_id !== "null") ? short_id as string : null;

  if (!vid && !sid) {
    return res.status(400).json({ error: "video_id or short_id is required" });
  }

  try {
    if (!supabaseAdmin) {
      return res.json(getFallbackComments(vid || undefined, sid || undefined));
    }

    let data: any[] | null = null;
    let error: any = null;

    // 1. Try normal join first
    const firstTry = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        user:profiles!user_id(id, username, avatar_url)
      `)
      .eq(vid ? "video_id" : "short_id", vid || sid)
      .order("created_at", { ascending: false });

    data = firstTry.data;
    error = firstTry.error;

    // 2. Try join without constraint prefix if first fails
    if (error || !data) {
      const secondTry = await supabaseAdmin
        .from("comments")
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `)
        .eq(vid ? "video_id" : "short_id", vid || sid)
        .order("created_at", { ascending: false });

      data = secondTry.data;
      error = secondTry.error;
    }

    // 3. Try separate queries (invulnerable to join errors) if both joins fail
    if (error || !data) {
      const thirdTry = await supabaseAdmin
        .from("comments")
        .select("*")
        .eq(vid ? "video_id" : "short_id", vid || sid)
        .order("created_at", { ascending: false });

      if (thirdTry.error) throw thirdTry.error;

      const commentsData = thirdTry.data || [];
      if (commentsData.length > 0) {
        const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id).filter(Boolean)));
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
        data = commentsData.map((c: any) => ({
          ...c,
          user: profileMap.get(c.user_id) || { id: c.user_id, username: 'Guest', avatar_url: null }
        }));
      } else {
        data = [];
      }
    }

    if (!data || data.length === 0) {
      data = getFallbackComments(vid || undefined, sid || undefined);
    }

    res.json(data);
  } catch (err: any) {
    console.error("[COMMENTS] Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 9.2 Authenticated: Post a comment
app.post("/api/comments", authenticate, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const { content, video_id, short_id, parent_id } = req.body;
  
  if (!content) return res.status(400).json({ error: "Content is required" });
  if (!video_id && !short_id) return res.status(400).json({ error: "Target video/short is required" });

  try {
    // 1. Ensure profile exists
    await ensureProfile(user);

    // 2. Insert comment with join, fallback to separate query if join fails
    let comment: any = null;
    try {
      const { data, error: insertError } = await supabaseAdmin
        .from("comments")
        .insert([{
          user_id: user.id,
          content,
          video_id,
          short_id,
          parent_id,
          created_at: new Date().toISOString()
        }])
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `)
        .single();
      
      if (insertError) throw insertError;
      comment = data;
    } catch (insertJoinErr) {
      console.warn("[COMMENTS-POST] Insert with join failed, trying safe insert + profile query fallback:", insertJoinErr);
      const { data: baseComment, error: baseErr } = await supabaseAdmin
        .from("comments")
        .insert([{
          user_id: user.id,
          content,
          video_id,
          short_id,
          parent_id,
          created_at: new Date().toISOString()
        }])
        .select("*")
        .single();
      
      if (baseErr) throw baseErr;
      
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .single();
      
      comment = {
        ...baseComment,
        user: profile || { id: user.id, username: user.email?.split('@')[0] || 'User', avatar_url: null }
      };
    }

    // 3. Increment comment count
    if (video_id) {
      const { error: rpcErr } = await supabaseAdmin.rpc('increment_video_comments', { target_id: video_id });
      if (rpcErr) {
        const { data: v } = await supabaseAdmin.from('videos').select('comments_count').eq('id', video_id).single();
        await supabaseAdmin.from('videos').update({ comments_count: (v?.comments_count || 0) + 1 }).eq('id', video_id);
      }
    } else if (short_id) {
      const { error: rpcErr } = await supabaseAdmin.rpc('increment_short_comments', { target_id: short_id });
      if (rpcErr) {
        const { data: s } = await supabaseAdmin.from('shorts').select('comments_count').eq('id', short_id).single();
        await supabaseAdmin.from('shorts').update({ comments_count: (s?.comments_count || 0) + 1 }).eq('id', short_id);
      }
    }

    // 4. Create Notification
    try {
      let recipientId = null;
      if (parent_id) {
        const { data: parentComment } = await supabaseAdmin
          .from("comments")
          .select("user_id")
          .eq("id", parent_id)
          .single();
        if (parentComment && parentComment.user_id !== user.id) {
          recipientId = parentComment.user_id;
        }
      } else {
        if (video_id) {
          const { data: video } = await supabaseAdmin.from("videos").select("owner_id").eq("id", video_id).single();
          if (video && video.owner_id !== user.id) recipientId = video.owner_id;
        } else if (short_id) {
          const { data: short } = await supabaseAdmin.from("shorts").select("owner_id").eq("id", short_id).single();
          if (short && short.owner_id !== user.id) recipientId = short.owner_id;
        }
      }

      if (recipientId) {
        await supabaseAdmin.from("notifications").insert([{
          recipient_id: recipientId,
          actor_id: user.id,
          type: parent_id ? 'reply' : 'mention',
          content: content.slice(0, 200),
          video_id: video_id || null,
          short_id: short_id || null,
          comment_id: comment.id
        }]);
      }
    } catch (e) {
      console.error("[NOTIFY] Comment notify failed:", e);
    }

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9.3 Authenticated: Like a comment
app.post("/api/comments/:id/like", authenticate, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  try {
    // We could have a separate comment_likes table, but for now we'll just increment likes_count
    // Ideally we track per-user likes to prevent multiple likes
    const { error } = await supabaseAdmin.rpc('increment_comment_likes', { comment_target_id: id });
    
    if (error) {
      const { data: c } = await supabaseAdmin.from('comments').select('likes_count').eq('id', id).single();
      await supabaseAdmin.from('comments').update({ likes_count: (c?.likes_count || 0) + 1 }).eq('id', id);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9.4 Authenticated: Delete own comment
app.delete("/api/comments/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  try {
    // Find the comment first to check ownership and target_id
    const { data: comment, error: fetchErr } = await supabaseAdmin
      .from("comments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (comment.user_id !== user.id) return res.status(403).json({ error: "Unauthorized" });

    // Delete
    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", id);
    
    if (error) throw error;

    // Decrement counts
    if (comment.video_id) {
       const { data: v } = await supabaseAdmin.from('videos').select('comments_count').eq('id', comment.video_id).single();
       if (v) await supabaseAdmin.from('videos').update({ comments_count: Math.max(0, (v.comments_count || 0) - 1) }).eq('id', comment.video_id);
    } else if (comment.short_id) {
       const { data: s } = await supabaseAdmin.from('shorts').select('comments_count').eq('id', comment.short_id).single();
       if (s) await supabaseAdmin.from('shorts').update({ comments_count: Math.max(0, (s.comments_count || 0) - 1) }).eq('id', comment.short_id);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. AD MANAGEMENT API (Handlers moved up)

// 8.2 Admin: List all ads
app.get("/api/ads", authenticate, isAdmin, async (req, res) => {
  try {
    let results: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("ads")
        .select("*");
      
      if (error) throw error;
      results = (data || []).map((ad: any) => {
        const activeVal = ad.active !== undefined ? ad.active : (ad.is_active !== undefined ? ad.is_active : true);
        const placementVal = ad.placement_type || ad.placement || "pre-roll";
        const destUrl = ad.destination_url || ad.target_url || ad.target_link || "https://";
        const advName = ad.advertiser_name || ad.brand_name || "Sponsored Ad";
        const dSec = ad.duration_seconds || ad.duration || 15;
        const skipAble = ad.skippable !== undefined ? ad.skippable : true;
        const skipSec = ad.skip_after_seconds !== undefined ? ad.skip_after_seconds : 5;

        return {
          ...ad,
          active: activeVal,
          is_active: activeVal,
          placement_type: placementVal,
          placement: placementVal,
          destination_url: destUrl,
          target_url: destUrl,
          advertiser_name: advName,
          duration_seconds: dSec,
          skippable: skipAble,
          skip_after_seconds: skipSec
        };
      }).filter((ad: any) => !FALLBACK_AD_IDS.includes(ad.id));
    } catch (dbErr) {
      console.warn("[ADMIN-ADS-GET] DB error or missing table, returning empty:", dbErr);
      results = [];
    }
    
    // Filter out shorts-feed if they want only video player ads
    const filtered = results.filter(ad => ad.placement_type !== 'shorts-feed');
    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.3 Admin: Create/Update Ad
app.post("/api/ads", authenticate, isAdmin, async (req, res) => {
  try {
    const adData = req.body;
    const { id, active, placement_type, ...rest } = adData;
    
    const saveData = {
        ...rest,
        is_active: active === undefined ? true : active,
        placement: placement_type || "pre-roll",
        placement_type: placement_type || "pre-roll"
    };

    // Prevent database crashes due to non-existent schema columns in PG
    const cols = await getAdsTableColumns();
    const columnsToInsert: any = {
      title: saveData.title,
      description: saveData.description,
      media_url: saveData.media_url,
      ad_type: saveData.ad_type || 'video',
    };

    if (cols.hasDestinationUrl) {
      columnsToInsert.destination_url = saveData.destination_url || saveData.target_url || "https://";
    }
    if (cols.hasTargetUrl) {
      columnsToInsert.target_url = saveData.target_url || saveData.destination_url || "https://";
    }
    if (cols.hasActive) {
      columnsToInsert.active = saveData.is_active;
    }
    if (cols.hasIsActive) {
      columnsToInsert.is_active = saveData.is_active;
    }
    if (cols.hasPlacementType) {
      columnsToInsert.placement_type = saveData.placement_type;
    }
    if (cols.hasPlacement) {
      columnsToInsert.placement = saveData.placement;
    }
    if (cols.hasAdvertiserName) {
      columnsToInsert.advertiser_name = saveData.advertiser_name || "Sponsored Ad";
    }

    if (saveData.duration_seconds !== undefined) columnsToInsert.duration_seconds = saveData.duration_seconds;
    if (saveData.skippable !== undefined) columnsToInsert.skippable = saveData.skippable;
    if (saveData.skip_after_seconds !== undefined) columnsToInsert.skip_after_seconds = saveData.skip_after_seconds;

    if (id) {
      columnsToInsert.id = id;
    }

    const { data, error } = await supabaseAdmin
      .from("ads")
      .upsert([columnsToInsert])
      .select("*")
      .single();

    if (error) throw error;
    
    const mapped = {
      ...data,
      active: data.is_active !== undefined ? data.is_active : (data.active !== undefined ? data.active : true),
      placement_type: data.placement_type || data.placement || "pre-roll",
      destination_url: data.destination_url || data.target_url || "https://",
      target_url: data.target_url || data.destination_url || "https://",
      advertiser_name: data.advertiser_name || "Sponsored Ad"
    };
    res.status(201).json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.4 Admin: Delete Ad
app.delete("/api/ads/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("ads")
      .delete()
      .eq("id", req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.5 Public: Log Ad Event (Impression, Click, etc)
app.post("/api/ads/:id/event", async (req, res) => {
  try {
    const { id } = req.params;
    const { event_type, country, device } = req.body;
    
    if (!supabaseAdmin) {
      return res.json({ success: true });
    }
    
    const { error } = await supabaseAdmin
      .from("ad_analytics")
      .insert([{
        ad_id: id,
        event_type,
        country,
        device,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    // Increment aggregated counters on the ad record for fast fetching
    try {
      if (event_type === 'impression') {
        const { error: rpcErr } = await supabaseAdmin.rpc('increment_ad_impressions', { ad_target_id: id });
        if (rpcErr) {
          // Fallback: Try to increment impressions OR impressions_count column
          const { data: adData } = await supabaseAdmin.from('ads').select('impressions, impressions_count').eq('id', id).single();
          if (adData) {
            const updates: any = {};
            if ('impressions' in adData) updates.impressions = (adData.impressions || 0) + 1;
            if ('impressions_count' in adData) updates.impressions_count = (Number(adData.impressions_count) || 0) + 1;
            await supabaseAdmin.from('ads').update(updates).eq('id', id);
          }
        }
      } else if (event_type === 'click') {
        const { error: rpcErr } = await supabaseAdmin.rpc('increment_ad_clicks', { ad_target_id: id });
        if (rpcErr) {
          const { data: adData } = await supabaseAdmin.from('ads').select('clicks, clicks_count').eq('id', id).single();
          if (adData) {
            const updates: any = {};
            if ('clicks' in adData) updates.clicks = (adData.clicks || 0) + 1;
            if ('clicks_count' in adData) updates.clicks_count = (Number(adData.clicks_count) || 0) + 1;
            await supabaseAdmin.from('ads').update(updates).eq('id', id);
          }
        }
      }
    } catch (incrementErr) {
      console.warn("[ADS-EVENT] Increment failed:", incrementErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.6 Admin: Analytics Summary
app.get("/api/ads/analytics/summary", authenticate, isAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.json([]);
    }
    const { data, error } = await supabaseAdmin
      .from("ad_analytics")
      .select("event_type, created_at, ads(title)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.7 Public: Get Ad Settings
app.get("/api/ads/settings", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.json({});
    }
    const { data, error } = await supabaseAdmin
      .from("ad_settings")
      .select("*");
    
    if (error) throw error;
    
    const settings: Record<string, any> = {};
    data?.forEach(s => {
      settings[s.key] = s.value;
    });
    
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.13 Admin: Save Ad Settings
app.post("/api/ads/settings", authenticate, isAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: "Missing key or value" });

    const { data, error } = await supabaseAdmin
      .from("ad_settings")
      .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.8 Admin: List all shorts ads
app.get("/api/shorts/ads", authenticate, isAdmin, async (req, res) => {
  try {
    let results: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from("shorts_ads")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      results = (data || []).map((ad: any) => {
        const activeVal = ad.active !== undefined ? ad.active : (ad.is_active !== undefined ? ad.is_active : true);
        const placementVal = ad.placement_type || ad.placement || "shorts-feed";
        const destUrl = ad.destination_url || ad.target_url || ad.target_link || "https://";
        const advName = ad.advertiser_name || ad.brand_name || "Sponsored Ad";

        return {
          ...ad,
          active: activeVal,
          is_active: activeVal,
          placement_type: placementVal,
          placement: placementVal,
          destination_url: destUrl,
          target_url: destUrl,
          advertiser_name: advName
        };
      }).filter((ad: any) => !FALLBACK_AD_IDS.includes(ad.id));
    } catch (dbErr) {
      console.warn("[ADMIN-SHORTS-ADS-GET] DB error, returning empty:", dbErr);
      results = [];
    }
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.9 Admin: Create/Update Shorts Ad
app.post("/api/shorts/ads", authenticate, isAdmin, async (req, res) => {
  try {
    const adData = req.body;
    const { id, ...saveData } = adData;

    const query = id 
      ? supabaseAdmin.from("shorts_ads").update({ ...saveData, updated_at: new Date().toISOString() }).eq("id", id)
      : supabaseAdmin.from("shorts_ads").insert([{ ...saveData, created_at: new Date().toISOString() }]);

    const { data, error } = await query.select().single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.10 Admin: Delete Shorts Ad
app.delete("/api/shorts/ads/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("shorts_ads")
      .delete()
      .eq("id", req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.11 Public: Log Shorts Ad Event
app.post("/api/shorts/ads/:id/event", async (req, res) => {
  try {
    const { id } = req.params;
    const { event_type, country, device } = req.body;
    
    if (!supabaseAdmin) return res.json({ success: true });
    
    const { error } = await supabaseAdmin
      .from("shorts_ad_analytics")
      .insert([{
        ad_id: id,
        event_type,
        country,
        device,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    if (event_type === 'impression') {
      await supabaseAdmin.rpc('increment_shorts_ad_impressions', { ad_target_id: id });
    } else if (event_type === 'click') {
      await supabaseAdmin.rpc('increment_shorts_ad_clicks', { ad_target_id: id });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8.12 Public: Log Shorts Ad View
app.post("/api/shorts/ads/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    const { watch_time_seconds, completed, skipped } = req.body;
    
    if (!supabaseAdmin) return res.json({ success: true });
    
    const { error } = await supabaseAdmin
      .from("shorts_ad_views")
      .insert([{
        ad_id: id,
        watch_time_seconds,
        completed,
        skipped,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Vite Middleware Integration ---
function handleHealthCheck(req: Request, res: Response) {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}
app.get("/api/health", handleHealthCheck);

// --- Background Seeding Function ---
async function seedNewStatsAndComments() {
  if (!supabaseAdmin) {
    console.warn("⚠️ [BACKGROUND-SEED] Supabase admin not initialized. Skipping seed.");
    return;
  }

  // Auto-seed advertisements if missing/empty to support brand new databases
  await seedAdsAndShortsAdsIfEmpty().catch(err => {
    console.error("❌ [BACKGROUND-SEED] Failed to auto-seed ads:", err);
  });

  console.log("⏳ [BACKGROUND-SEED] Checking database for required stats and comments updates...");

  // 1. Surnames lists provided by user
  const africanSurnames = [
    "Dlamini", "Ndlovu", "Khumalo", "Nkosi", "Zulu", "Mokoena", "Baloyi", "Molefe", "Mkhize", "Ntuli",
    "Hadebe", "Buthelezi", "Ngubane", "Ngcobo", "Gumede", "Zweli", "Ntombela", "Radebe", "Mthethwa", 
    "Nxumalo", "Khuzwayo", "Ndaba", "Hlophe", "Shabangu", "Nene", "Mbatha", "Mthiyane", "Zwane", 
    "Mthembu", "Nzimande", "Majola", "Msibi", "Luthuli", "Cele", "Shabalala", "Zungu", "Gumbi", "Dube"
  ];

  const settlerSurnames = [
    "Van der Merwe", "Smit", "Van Wyk", "Botha", "Du Plessis", "Pretorius", "Kruger", "Coetzee", "Venter", 
    "Nel", "Swanepoel", "Steyn", "Basson", "Groenewald", "Joubert", "Fourie", "Viljoen", "De Klerk", 
    "Pienaar", "Jacobs", "Stander", "Jansen van Vuuren", "Myburgh", "Human", "Erasmus", "Barnard", 
    "Esterhuizen", "Marais", "Muller", "Olivier", "Van Staden", "Visser", "Welgemoed", "De Wet", 
    "Bester", "Bouwer", "Brits", "Carstens", "Cilliers", "De Beer", "Du Toit", "Enslin", "Ferreira", 
    "Geldenhuys", "Greyling", "Hattingh", "Herbst", "Heyns", "Hough", "Jonker", "Kriel", "Labuschagne", 
    "Le Roux", "Liebenberg", "Lombard", "Louw", "Malan", "Meiring", "Naudé", "Oberholzer", "Oosthuizen", 
    "Potgieter", "Rabie", "Rossouw", "Roux", "Scheepers", "Schoeman", "Smith", "Steenkamp", "Strauss", 
    "Strydom", "Swart", "Terblanche", "Theron", "Uys", "Van As", "Van Biljon", "Van den Berg", 
    "Van der Walt", "Van Deventer", "Van Niekerk", "Van Rooyen", "Van Zyl", "Vermeulen", "Visagie", 
    "Vivier", "Vlok", "Vorster", "Wagener", "Weideman", "Wessels", "Willemse"
  ];

  const firstNames = [
    "Thabo", "Sipho", "Lerato", "Nandi", "Kabo", "Jabu", "Bongani", "Musa", "Sibusiso", "Zola",
    "Precious", "Gugu", "Tendai", "Ayanda", "Kobus", "Pieter", "Johan", "Stefan", "Arno", "Francois",
    "Tiaan", "Dewald", "Ruan", "Elize", "Annelie", "Karin", "Chantal", "Liezel", "Andile", "Happy",
    "Keanu", "Lindiwe", "Sasha", "Simphiwe", "Dumi", "Themba", "Sifiso", "Muzi", "Mandla", "Heinrich"
  ];

  // 2. Generate a pool of 150 unique mock profile commentators
  const generatedNames = new Set<string>();
  const commentersPool: Array<{ username: string; display_name: string; handle: string; avatar_url: string; bio: string }> = [];

  while (commentersPool.length < 150) {
    const isAfrican = Math.random() > 0.4;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const surname = isAfrican 
      ? africanSurnames[Math.floor(Math.random() * africanSurnames.length)]
      : settlerSurnames[Math.floor(Math.random() * settlerSurnames.length)];
    
    const displayName = `${firstName} ${surname}`;
    if (!generatedNames.has(displayName)) {
      generatedNames.add(displayName);
      const cleanUser = displayName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + "_" + (Math.floor(Math.random() * 90) + 10);
      const cleanHandle = `@${displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}${Math.floor(Math.random() * 90) + 10}`;
      
      commentersPool.push({
        username: cleanUser,
        display_name: displayName,
        handle: cleanHandle,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUser}`,
        bio: `Lover of lifestyle & funny content. South Africa 🇿🇦`
      });
    }
  }

  // Seeding Commenter Profiles into Profiles Table
  const seedProfilesData = commentersPool.map(p => ({
    username: p.username,
    handle: p.handle,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    followers_count: Math.floor(Math.random() * 450) + 12
  }));

  try {
    const { data: insertedProfiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert(seedProfilesData, { onConflict: 'username' })
      .select("id");

    if (pErr) throw pErr;

    // Fetch seed profile IDs
    const seedUserIds: string[] = [];
    if (insertedProfiles && insertedProfiles.length > 0) {
      insertedProfiles.forEach((u: any) => seedUserIds.push(u.id));
    } else {
      const { data: qProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("bio", "Lover of lifestyle & funny content. South Africa 🇿🇦");
      (qProfiles || []).forEach((u: any) => seedUserIds.push(u.id));
    }

    if (seedUserIds.length === 0) {
      console.error("⚠️ [BACKGROUND-SEED] Could not find or seed any commentator profiles. Aborting seeding.");
      return;
    }

    console.log(`✅ [BACKGROUND-SEED] Seeded & verified ${seedUserIds.length} commentator profiles!`);

    // 3. Update video ranges in Supabase (11k to 18k views, 900 to 3800 likes)
    const { data: videos, error: vErr } = await supabaseAdmin
      .from("videos")
      .select("id, views_count, likes_count");
    
    if (vErr) throw vErr;

    console.log(`[BACKGROUND-SEED] Processing ${videos?.length || 0} full videos for stats & comments updates...`);

    if (videos && videos.length > 0) {
      for (const v of videos) {
        const currentViews = Number(v.views_count || 0);
        const currentLikes = Number(v.likes_count || 0);

        // Calculate a random date between 2 months ago (60 days) and 6 months ago (180 days)
        const minDays = 60;
        const maxDays = 180;
        const randomDaysAgo = minDays + Math.random() * (maxDays - minDays);
        const randomDateIso = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000).toISOString();
        const videoTime = new Date(randomDateIso).getTime();
        const nowTime = Date.now();

        // If stats are outside requested range: force update views, likes, and dates
        if (currentViews < 11000 || currentViews > 18000 || currentLikes < 900 || currentLikes > 3800) {
          const targetViews = Math.floor(Math.random() * 7001) + 11000; // 11,000 to 18,000
          const targetLikes = Math.floor(Math.random() * 2901) + 900;   // 900 to 3,800
          
          await supabaseAdmin
            .from("videos")
            .update({ 
              views_count: targetViews, 
              likes_count: targetLikes,
              posted_at: randomDateIso,
              created_at: randomDateIso
            })
            .eq("id", v.id);
        } else {
          // Otherwise, update only dates in the database
          await supabaseAdmin
            .from("videos")
            .update({
              posted_at: randomDateIso,
              created_at: randomDateIso
            })
            .eq("id", v.id);
        }

        // Align existing comments' dates to match the new video timeline range (videoTime to nowTime)
        try {
          const { data: existingComments } = await supabaseAdmin
            .from("comments")
            .select("id")
            .eq("video_id", v.id);

          if (existingComments && existingComments.length > 0) {
            const updated = existingComments.map((c: any) => ({
              id: c.id,
              created_at: new Date(videoTime + Math.random() * (nowTime - videoTime)).toISOString()
            }));
            for (let start = 0; start < updated.length; start += 100) {
              const chunk = updated.slice(start, start + 100);
              await supabaseAdmin.from("comments").upsert(chunk);
            }
          }
        } catch (alignErr) {
          console.error("Failed to align existing video comments dates:", alignErr);
        }

        // Check comment count for video
        const { count: commentCount, error: cCountErr } = await supabaseAdmin
          .from("comments")
          .select("*", { count: 'exact', head: true })
          .eq("video_id", v.id);

        if (!cCountErr && (commentCount === null || commentCount < 500)) {
          const targetCount = Math.floor(Math.random() * 301) + 500; // Over 500 to 800
          const needed = targetCount - (commentCount || 0);
          console.log(`[BACKGROUND-SEED] Seeding ${needed} comments to Video ${v.id}...`);

          const bulkComments = [];
          for (let i = 0; i < needed; i++) {
            const randomUserId = seedUserIds[Math.floor(Math.random() * seedUserIds.length)];
            const text = getRandomCommentContent();
            const likes = Math.floor(Math.random() * 150);
            const date = new Date(videoTime + Math.random() * (nowTime - videoTime));

            bulkComments.push({
              video_id: v.id,
              user_id: randomUserId,
              content: text,
              likes_count: likes,
              created_at: date.toISOString()
            });
          }

          // Insert in batches of 100
          for (let start = 0; start < bulkComments.length; start += 100) {
            const chunk = bulkComments.slice(start, start + 100);
            await supabaseAdmin.from("comments").insert(chunk);
          }

          // Update comments_count column explicitly to synchronize
          await supabaseAdmin
            .from("videos")
            .update({ comments_count: targetCount })
            .eq("id", v.id);
        }
      }
    }

    // 4. Update short ranges in Supabase (Likes 3400 to 11k, Views proportional)
    const { data: shorts, error: sErr } = await supabaseAdmin
      .from("shorts")
      .select("id, views_count, likes_count");

    if (sErr) throw sErr;

    console.log(`[BACKGROUND-SEED] Processing ${shorts?.length || 0} shorts for stats & comments updates...`);

    if (shorts && shorts.length > 0) {
      for (const s of shorts) {
        const currentLikes = Number(s.likes_count || 0);

        // Calculate a random date between 2 months ago (60 days) and 6 months ago (180 days)
        const minDays = 60;
        const maxDays = 180;
        const randomDaysAgo = minDays + Math.random() * (maxDays - minDays);
        const randomDateIso = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000).toISOString();
        const shortTime = new Date(randomDateIso).getTime();
        const nowTime = Date.now();

        if (currentLikes < 3400 || currentLikes > 11000) {
          const targetLikes = Math.floor(Math.random() * 7601) + 3400; // 3400 to 11000
          const targetViews = Math.floor(targetLikes * (Math.floor(Math.random() * 8) + 5)) + Math.floor(Math.random() * 8000); 

          await supabaseAdmin
            .from("shorts")
            .update({ 
              likes_count: targetLikes, 
              views_count: targetViews,
              created_at: randomDateIso
            })
            .eq("id", s.id);
        } else {
          await supabaseAdmin
            .from("shorts")
            .update({
              created_at: randomDateIso
            })
            .eq("id", s.id);
        }

        // Align existing comments' dates to match the new shorts timeline range (shortTime to nowTime)
        try {
          const { data: existingComments } = await supabaseAdmin
            .from("comments")
            .select("id")
            .eq("short_id", s.id);

          if (existingComments && existingComments.length > 0) {
            const updated = existingComments.map((c: any) => ({
              id: c.id,
              created_at: new Date(shortTime + Math.random() * (nowTime - shortTime)).toISOString()
            }));
            for (let start = 0; start < updated.length; start += 100) {
              const chunk = updated.slice(start, start + 100);
              await supabaseAdmin.from("comments").upsert(chunk);
            }
          }
        } catch (alignErr) {
          console.error("Failed to align existing short comments dates:", alignErr);
        }

        // Check comment count for short
        const { count: commentCount, error: cCountErr } = await supabaseAdmin
          .from("comments")
          .select("*", { count: 'exact', head: true })
          .eq("short_id", s.id);

        if (!cCountErr && (commentCount === null || commentCount < 500)) {
          const targetCount = Math.floor(Math.random() * 301) + 500; // Over 500 to 800
          const needed = targetCount - (commentCount || 0);
          console.log(`[BACKGROUND-SEED] Seeding ${needed} comments to Short ${s.id}...`);

          const bulkComments = [];
          for (let i = 0; i < needed; i++) {
            const randomUserId = seedUserIds[Math.floor(Math.random() * seedUserIds.length)];
            const text = getRandomCommentContent();
            const likes = Math.floor(Math.random() * 150);
            const date = new Date(shortTime + Math.random() * (nowTime - shortTime));

            bulkComments.push({
              short_id: s.id,
              user_id: randomUserId,
              content: text,
              likes_count: likes,
              created_at: date.toISOString()
            });
          }

          // Insert in batches of 100
          for (let start = 0; start < bulkComments.length; start += 100) {
            const chunk = bulkComments.slice(start, start + 100);
            await supabaseAdmin.from("comments").insert(chunk);
          }

          // Update comments_count column explicitly to synchronize
          await supabaseAdmin
            .from("shorts")
            .update({ comments_count: targetCount })
            .eq("id", s.id);
        }
      }
    }

    console.log("🏆 [BACKGROUND-SEED] Seeding database process completed successfully!");

  } catch (error: any) {
    console.error("❌ [BACKGROUND-SEED] Critical database update or seeding failed:", error.message);
  }
}

// Generates lifestyle and funny comments with customizable, dynamic outputs
function getRandomCommentContent(): string {
  const templates = [
    "This is absolutely brilliant! {EMOJI}",
    "I tried this and it actually works, OMG! {EMOJI}",
    "The best video on my feed today, hands down! {EMOJI}",
    "Can we just appreciate the editing here? So clean! {EMOJI}",
    "Hahaha this is too accurate! {EMOJI}",
    "I'm literally crying of laughter {EMOJI}",
    "So inspiring, thanks for sharing!",
    "Which camera did you use for this? The quality is insane! {EMOJI}",
    "Absolute legend! {EMOJI}",
    "Who else is watching this? {EMOJI}",
    "This made my day, thank you! {EMOJI}",
    "My favorite creator doing what they do best! {EMOJI}",
    "Wait, did anyone else notice the background? {EMOJI}",
    "Super useful tips, going to try this weekend! {EMOJI}",
    "Can't stop rewatching this! {EMOJI}",
    "This gets better every time I watch it. {EMOJI}",
    "I wasn't ready for that ending, lol. {EMOJI}",
    "Living your best life! Love the vibes. {EMOJI}",
    "This is peak content right here. {EMOJI}",
    "I need a part 2 of this ASAP!",
    "The sound effect at the end got me dead {EMOJI}",
    "So aesthetic and relaxing to watch. {EMOJI}",
    "This deserves way more views! {EMOJI}",
    "Is it just me or is this extremely satisfying? {EMOJI}",
    "My mood went from 0 to 100 after watching this. {EMOJI}",
    "True story, happened to me last week. {EMOJI}",
    "This is exactly what I needed to see today. {EMOJI}",
    "Absolutely love the vibe here. Keep it up! {EMOJI}",
    "You're so creative, I'm amazed! {EMOJI}",
    "I'm in love with this whole aesthetic. {EMOJI}",
    "This is gold! Saving this for later. {EMOJI}",
    "A masterpiece {EMOJI}",
    "Wait for it... wait for it... {EMOJI}",
    "The transition was so smooth!! {EMOJI}",
    "How do you even think of this? Genius! {EMOJI}",
    "My last braincell trying to understand this {EMOJI}",
    "Subscribed instantly, your content is amazing! {EMOJI}",
    "This is so funny, literally sent it to all my friends! {EMOJI}",
    "Unbelievable, love the energy in this vids! {EMOJI}",
    "The funniest thing I've seen all week {EMOJI}",
    "I love lifestyle vlogs like this, more please! {EMOJI}",
    "This is so healing, thank you! {EMOJI}",
    "No way, is that real? {EMOJI}"
  ];

  const emojis = ["🔥", "😎", "😂", "🚀", "💀", "😍", "🤩", "🙌", "💯", "🤯", "🤖", "🤣", "🍕", "✨", "🌟", "💖", "⚡"];

  const choice = Math.random();
  if (choice < 0.15) {
    // Return emoji-only comment
    const count = Math.floor(Math.random() * 3) + 1;
    let res = "";
    for (let i = 0; i < count; i++) {
      res += emojis[Math.floor(Math.random() * emojis.length)];
    }
    return res;
  } else {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const numEmojis = Math.floor(Math.random() * 3);
    let selectedEmojis = "";
    for (let i = 0; i < numEmojis; i++) {
      selectedEmojis += emojis[Math.floor(Math.random() * emojis.length)];
    }
    return template.replace("{EMOJI}", selectedEmojis).trim();
  }
}

async function startServer() {
  console.log("🚀 Initializing Video Platform Backend...");

  if (process.env.NODE_ENV !== "production") {
    try {
      const viteModuleName = "vite";
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false, host: '0.0.0.0' },
        appType: "spa",
        root: process.cwd(),
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("⚠️ Failed to load Vite development server dynamically:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    
    // Non-blocking database seeding on startup
    seedNewStatsAndComments().catch(err => {
      console.error("❌ [BACKGROUND-SEED] Error starting database seeding:", err);
    });
  });

  // Increase timeout for large uploads (set to 15 minutes to match client)
  server.timeout = 900000;
  server.keepAliveTimeout = 910000; 
}

startServer();
