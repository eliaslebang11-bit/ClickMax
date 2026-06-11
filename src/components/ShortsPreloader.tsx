import React, { useEffect, useState } from "react";
import { useVideoStats } from "../context/VideoContext";
import { adService } from "../services/adService";
import { ShortsAd } from "../types";

export function ShortsPreloader() {
  const { shorts } = useVideoStats();
  const [ads, setAds] = useState<ShortsAd[]>([]);

  useEffect(() => {
    // Fetch active shorts ads to preload ads as well
    const loadAds = async () => {
      try {
        const activeAds = await adService.getActiveShortsAds();
        setAds(activeAds || []);
      } catch (err) {
        console.error("[Preloader] Failed to fetch ads for preloading:", err);
      }
    };

    // Slight delay of 1 second to let the active page load its first resources
    const timer = setTimeout(() => {
      loadAds();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!shorts || shorts.length === 0) return null;

  // Preload the first 12 shorts in the feed to make sure the entry experience is fast
  const preloadedShorts = shorts.slice(0, 12);

  // Filter video ads that need to be preloaded (videos/vertical videos)
  const preloadedAdUrls = ads
    .filter(ad => ad.ad_type === "vertical_video" || ad.ad_type === "video")
    .map(ad => ad.media_url)
    .filter((url): url is string => !!url);

  return (
    <div 
      style={{ 
        position: "absolute", 
        width: "1px", 
        height: "1px", 
        padding: "0", 
        margin: "-1px", 
        overflow: "hidden", 
        clip: "rect(0, 0, 0, 0)", 
        whiteSpace: "nowrap", 
        border: "0",
        opacity: 0,
        pointerEvents: "none"
      }} 
      aria-hidden="true"
    >
      {/* Prefetching Short Videos in the background */}
      {preloadedShorts.map((short) => (
        short.videoUrl ? (
          <video
            key={`preload-short-${short.id}`}
            src={short.videoUrl}
            preload="auto"
            muted
            playsInline
          />
        ) : null
      ))}

      {/* Prefetching Ad videos in the background */}
      {preloadedAdUrls.map((url, idx) => (
        <video
          key={`preload-ad-${idx}`}
          src={url}
          preload="auto"
          muted
          playsInline
        />
      ))}
    </div>
  );
}
