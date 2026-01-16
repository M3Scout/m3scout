import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely returns an array. If the input is not an array, returns an empty array.
 * Use this helper to protect against `.length` or `.map()` on undefined/null values.
 * 
 * @example
 * safeArray(undefined) // []
 * safeArray(null) // []
 * safeArray([1, 2, 3]) // [1, 2, 3]
 * safeArray("string") // []
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Extracts YouTube video ID from various URL formats
 * Supports:
 * - Full URL: https://www.youtube.com/watch?v=VIDEO_ID
 * - Short URL: https://youtu.be/VIDEO_ID
 * - Embed URL: https://www.youtube.com/embed/VIDEO_ID
 * - Direct video ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct video ID (11 characters, alphanumeric with - and _)
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdRegex.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    
    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes("youtube.com") && url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      if (videoId && videoIdRegex.test(videoId)) {
        return videoId;
      }
    }
    
    // youtube.com/embed/VIDEO_ID
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/embed/")) {
      const videoId = url.pathname.split("/embed/")[1]?.split("?")[0];
      if (videoId && videoIdRegex.test(videoId)) {
        return videoId;
      }
    }
    
    // youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.slice(1).split("?")[0];
      if (videoId && videoIdRegex.test(videoId)) {
        return videoId;
      }
    }
  } catch {
    // Not a valid URL, check if it looks like a video ID with extra chars
    const match = trimmed.match(/[a-zA-Z0-9_-]{11}/);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Converts any YouTube URL format to an embed URL
 * Returns null if the input is not a valid YouTube URL/ID
 */
export function getYouTubeEmbedUrl(input: string): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Gets the high-quality thumbnail URL for a YouTube video
 * Returns maxresdefault (1280x720) with fallback to hqdefault (480x360)
 */
export function getYouTubeThumbnailUrl(input: string, quality: "maxres" | "hq" | "mq" | "sd" = "maxres"): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;
  
  const qualityMap = {
    maxres: "maxresdefault",
    hq: "hqdefault",
    mq: "mqdefault",
    sd: "sddefault",
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
