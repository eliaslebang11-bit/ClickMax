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

const rawUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

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
