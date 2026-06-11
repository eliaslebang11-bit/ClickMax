import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string) {
  if (dateString === 'LIVE') return 'LIVE';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

export function parseCount(c: string | number | null | undefined): number {
  if (c === null || c === undefined) return 0;
  
  const str = String(c).replace(/,/g, '').toUpperCase();
  if (!str) return 0;

  if (str.endsWith('K')) {
    return parseFloat(str.slice(0, -1)) * 1000;
  }
  if (str.endsWith('M')) {
    return parseFloat(str.slice(0, -1)) * 1000000;
  }
  return parseInt(str) || 0;
}

export function formatCount(num: number): string {
  if (!num || isNaN(num)) return "0";
  if (num < 10000) return num.toString();
  if (num < 100000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  if (num < 1000000) {
    return Math.floor(num / 1000) + 'k';
  }
  const val = num / 1000000;
  return num % 1000000 === 0 ? val.toFixed(0) + 'M' : val.toFixed(1) + 'M';
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hours = Math.floor(mins / 60);
  
  if (hours > 0) {
    const remainingMins = mins % 60;
    return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Safely stringifies an object to JSON, handling circular references 
 * and removing DOM elements that cause crashes.
 */
export function safeJsonStringify(obj: any): string {
  try {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      
      // Specifically handle DOM elements which have circular refs via Fiber
      if (value instanceof Node) return `[DOM Node: ${value.nodeName}]`;
      if (value instanceof Window) return '[Window Object]';
      if (value instanceof Error) return { message: value.message, stack: value.stack };
      
      return value;
    });
  } catch (e) {
    console.error('Failed to stringify safely:', e);
    return '{"error": "serialization_failed"}';
  }
}
