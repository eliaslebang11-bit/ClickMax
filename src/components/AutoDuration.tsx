import React, { useState, useEffect } from 'react';
import { formatDuration } from '../lib/utils';

interface AutoDurationProps {
  videoUrl: string;
  fallbackDuration?: string;
  className?: string;
}

export const AutoDuration: React.FC<AutoDurationProps> = ({ videoUrl, fallbackDuration, className }) => {
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl || videoUrl.startsWith('data:image')) return;

    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
        setDuration(formatDuration(video.duration));
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.src = videoUrl;

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.src = '';
      video.load();
    };
  }, [videoUrl]);

  return (
    <span className={className}>
      {duration || fallbackDuration || '0:00'}
    </span>
  );
};

export default AutoDuration;
