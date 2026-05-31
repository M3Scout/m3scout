/**
 * Responsive image utilities for Supabase Storage.
 * Uses the Supabase Image Transformation API to serve optimized images.
 * 
 * Supabase render endpoint: /storage/v1/render/image/public/{bucket}/{path}
 * Supports: width, height, quality, format (origin | webp)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

/**
 * Convert a Supabase storage URL to a resized/optimized variant.
 * Works with both /storage/v1/object/public/ and /storage/v1/render/image/public/ URLs.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: {
    width?: number;
    quality?: number;
    format?: "origin" | "webp" | "avif";
  } = {}
): string {
  if (!url) return "";

  const { width = 1200, quality = 85, format = "avif" } = options;

  // Only transform Supabase storage URLs
  if (!url.includes("supabase.co/storage/")) return url;

  // Extract bucket and path from the URL
  // Pattern: /storage/v1/object/public/{bucket}/{path}
  // or:      /storage/v1/render/image/public/{bucket}/{path}
  const objectMatch = url.match(/\/storage\/v1\/object\/public\/(.+)/);
  const renderMatch = url.match(/\/storage\/v1\/render\/image\/public\/(.+)/);

  const storagePath = objectMatch?.[1] || renderMatch?.[1];
  if (!storagePath) return url;

  // Strip any existing query params from storagePath
  const cleanPath = storagePath.split("?")[0];

  // Use the render endpoint with transformation params
  const baseUrl = url.split("/storage/")[0];
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality),
    format,
  });

  return `${baseUrl}/storage/v1/render/image/public/${cleanPath}?${params}`;
}

/**
 * Generate srcSet string for responsive images.
 * Returns sizes optimized for mobile-first approach.
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [800, 1200, 1920],
  quality = 85
): string {
  if (!url) return "";
  if (!url.includes("supabase.co/storage/")) return "";

  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w, quality })} ${w}w`)
    .join(", ");
}

/**
 * Default sizes attribute for athlete cards.
 */
export const ATHLETE_CARD_SIZES = "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 600px";

/**
 * Default sizes attribute for athlete profile hero.
 */
export const ATHLETE_HERO_SIZES = "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 600px";
