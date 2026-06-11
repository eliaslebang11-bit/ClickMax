import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // 1. Check Expo Public Variables
  if (typeof process !== 'undefined' && process.env?.[`EXPO_PUBLIC_${key}`]) {
    return process.env[`EXPO_PUBLIC_${key}`];
  }
  // 2. Check Vite Variables
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.[`VITE_${key}`]) {
    return import.meta.env[`VITE_${key}`];
  }
  // 3. Fallback to process.env directly
  if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
  }
  return undefined;
};

const rawUrl = getEnv('SUPABASE_URL') || "https://fbjdiqrfvwvzbyzczuqp.supabase.co";
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamRpcXJmdnd2emJ5emN6dXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjM0NDQsImV4cCI6MjA5NDMzOTQ0NH0.u41w3VYnrGQjPGiOHF-eazzv6J-kCZUrSsBUS_-8tc";

const getValidUrl = (url: string | undefined): string => {
  if (!url || url.trim() === '') return 'https://placeholder.supabase.co';
  
  // If it's just a project ref (common mistake), convert it to a URL
  if (!url.includes('.') && !url.startsWith('http')) {
    return `https://${url}.supabase.co`;
  }
  
  // Ensure it has a protocol
  if (!url.startsWith('http')) {
    return `https://${url}`;
  }
  
  return url;
};

const supabaseUrl = getValidUrl(rawUrl);

if (!rawUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder'
);
