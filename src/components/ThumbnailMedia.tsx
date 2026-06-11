import React from 'react';
import { Video } from '../types';
import { cn } from '../lib/utils';

interface ThumbnailMediaProps {
  video: Video;
  className?: string;
  autoplayOnHover?: boolean;
}

const ThumbnailMedia: React.FC<ThumbnailMediaProps> = ({ 
  video, 
  className, 
  autoplayOnHover = true 
}) => {
  // Use video source if thumbnail is missing or looks like a video
  const hasNoThumbnail = !video.thumbnail || video.thumbnail.trim() === '';
  const effectiveThumbnail = hasNoThumbnail ? video.videoUrl : video.thumbnail;
  
  const isVideoThumbnail = 
    effectiveThumbnail === video.videoUrl || 
    effectiveThumbnail?.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i) || 
    effectiveThumbnail?.startsWith('data:video');

  if (!effectiveThumbnail || (typeof effectiveThumbnail === 'string' && effectiveThumbnail.trim() === '')) return null;

  if (isVideoThumbnail) {
    return (
      <video 
        src={`${effectiveThumbnail}#t=0.5`} 
        className={cn("w-full h-full object-cover transition-transform duration-500", className)}
        muted
        playsInline
        preload="metadata"
        onMouseOver={e => {
          if (autoplayOnHover) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        onMouseOut={e => {
          if (autoplayOnHover) {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0.5;
          }
        }}
      />
    );
  }

  if (!effectiveThumbnail) return null;

  return (
    <img 
      src={effectiveThumbnail} 
      alt={video.title}
      className={cn("w-full h-full object-cover transition-transform duration-500", className)}
      referrerPolicy="no-referrer"
    />
  );
};

export default ThumbnailMedia;
