import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
