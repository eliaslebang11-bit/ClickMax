/**
 * Centralized API configuration for the ClickMax app.
 */

// Use a safe way to check for environment variables across Vite, Node, and React Native
const getBaseUrl = () => {
  // 1. Check for Expo Public Variables (Standard for Expo 49+)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Check for Vite environment variables
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 3. Try getting from process.env (Node.js and some React Native setups)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL;
    if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
  }

  // 4. Try legacy @env (react-native-dotenv)
  try {
    // @ts-ignore
    const env = require('@env');
    if (env.EXPO_PUBLIC_API_URL) return env.EXPO_PUBLIC_API_URL;
    if (env.API_BASE_URL) return env.API_BASE_URL;
  } catch (e) {}

  return '';
};

const API_BASE_URL = getBaseUrl();

/**
 * Prepends the API base URL to a path if it's not already an absolute URL.
 * Falls back to relative paths if API_BASE_URL is missing.
 */
export const getApiUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  
  // Ensure we don't have double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // If API_BASE_URL is present, we use it. 
  // In development, the proxy or the same-origin server handles it if empty.
  if (API_BASE_URL) {
    // Remove trailing slash from base if path starts with slash
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}${cleanPath}`;
  }
  
  return cleanPath;
};
