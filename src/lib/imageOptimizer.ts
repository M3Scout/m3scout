/**
 * Image Optimizer Utility
 * 
 * Central utility for generating optimized image URLs with:
 * - Automatic WebP format with JPEG fallback
 * - Preset sizes for consistent optimization
 * - Loading attribute defaults
 * - Supabase Storage optimization support
 * 
 * @see .memory/technical/image-optimization-v1.md
 */

// ============ TYPES ============

export type ImagePreset = "avatar" | "card" | "profile" | "hero" | "thumbnail";

export interface ImageOptimizeOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels (optional, maintains aspect ratio if omitted) */
  height?: number;
  /** Quality 1-100 (default: 80) */
  quality?: number;
  /** Output format (default: webp) */
  format?: "webp" | "jpeg" | "png" | "avif";
  /** Use a preset instead of manual dimensions */
  preset?: ImagePreset;
}

export interface OptimizedImageResult {
  /** Optimized URL */
  src: string;
  /** srcSet for responsive images */
  srcSet: string;
  /** Sizes attribute for responsive images */
  sizes: string;
  /** Recommended loading attribute */
  loading: "lazy" | "eager";
  /** Recommended decoding attribute */
  decoding: "async" | "sync" | "auto";
  /** Width for layout hints */
  width: number;
  /** Height for layout hints (if calculable) */
  height?: number;
}

// ============ PRESETS ============

const IMAGE_PRESETS: Record<ImagePreset, { width: number; quality: number; sizes: string }> = {
  avatar: { width: 400, quality: 85, sizes: "48px" },
  thumbnail: { width: 800, quality: 85, sizes: "150px" },
  card: { width: 1200, quality: 85, sizes: "(max-width: 640px) 100vw, 600px" },
  profile: { width: 1920, quality: 85, sizes: "(max-width: 768px) 100vw, 800px" },
  hero: { width: 2000, quality: 85, sizes: "100vw" },
};

// Responsive multipliers for srcSet
const SRCSET_MULTIPLIERS = [0.5, 1, 1.5, 2];

// ============ SUPABASE STORAGE DETECTION ============

const SUPABASE_STORAGE_PATTERNS = [
  /supabase\.co\/storage/,
  /supabase\.in\/storage/,
  /httxbfcvzknyncprzcuy\.supabase\.co/,
];

function isSupabaseStorageUrl(url: string): boolean {
  return SUPABASE_STORAGE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Transform Supabase Storage URL to use image transformation
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */
function transformSupabaseUrl(
  url: string,
  width: number,
  quality: number,
  format: string
): string {
  try {
    const urlObj = new URL(url);
    
    // If already using render endpoint, modify params
    if (urlObj.pathname.includes("/render/image/")) {
      urlObj.searchParams.set("width", String(width));
      urlObj.searchParams.set("quality", String(quality));
      urlObj.searchParams.set("format", format);
      return urlObj.toString();
    }
    
    // Transform /object/public/ to /render/image/public/
    if (urlObj.pathname.includes("/object/public/")) {
      const newPath = urlObj.pathname.replace("/object/public/", "/render/image/public/");
      urlObj.pathname = newPath;
      urlObj.searchParams.set("width", String(width));
      urlObj.searchParams.set("quality", String(quality));
      urlObj.searchParams.set("format", format);
      return urlObj.toString();
    }
    
    // For signed URLs or other patterns, return original
    return url;
  } catch {
    return url;
  }
}

// ============ MAIN FUNCTION ============

/**
 * Get optimized image URL with responsive srcSet
 * 
 * @example
 * // Using preset
 * const { src, srcSet, sizes } = getOptimizedImageUrl(imageUrl, { preset: "card" });
 * 
 * @example
 * // Using custom dimensions
 * const { src } = getOptimizedImageUrl(imageUrl, { width: 400, quality: 85 });
 */
export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  options: ImageOptimizeOptions = {}
): OptimizedImageResult {
  const DEFAULT_PLACEHOLDER = "/placeholder.svg";
  
  // Handle null/undefined/empty URLs
  if (!originalUrl || originalUrl.trim() === "") {
    return {
      src: DEFAULT_PLACEHOLDER,
      srcSet: DEFAULT_PLACEHOLDER,
      sizes: "100vw",
      loading: "lazy",
      decoding: "async",
      width: 200,
    };
  }
  
  // Resolve preset or use custom options
  const preset = options.preset ? IMAGE_PRESETS[options.preset] : null;
  const targetWidth = options.width ?? preset?.width ?? 1200;
  const quality = options.quality ?? preset?.quality ?? 85;
  const format = options.format ?? "avif";
  const sizes = preset?.sizes ?? `${targetWidth}px`;
  
  // Check if URL is Supabase Storage (supports transformations)
  const isSupabase = isSupabaseStorageUrl(originalUrl);
  
  if (isSupabase) {
    // Generate optimized URL using Supabase Image Transformation
    const optimizedUrl = transformSupabaseUrl(originalUrl, targetWidth, quality, format);
    
    // Generate srcSet for responsive images
    const srcSetParts = SRCSET_MULTIPLIERS
      .map(mult => {
        const w = Math.round(targetWidth * mult);
        const url = transformSupabaseUrl(originalUrl, w, quality, format);
        return `${url} ${w}w`;
      })
      .join(", ");
    
    return {
      src: optimizedUrl,
      srcSet: srcSetParts,
      sizes,
      loading: options.preset === "hero" ? "eager" : "lazy",
      decoding: "async",
      width: targetWidth,
    };
  }
  
  // For non-Supabase URLs, return original with metadata hints
  // srcSet uses same URL (browser will cache)
  const srcSetParts = SRCSET_MULTIPLIERS
    .map(mult => {
      const w = Math.round(targetWidth * mult);
      return `${originalUrl} ${w}w`;
    })
    .join(", ");
  
  return {
    src: originalUrl,
    srcSet: srcSetParts,
    sizes,
    loading: options.preset === "hero" ? "eager" : "lazy",
    decoding: "async",
    width: targetWidth,
  };
}

// ============ REACT COMPONENT HELPER ============

/**
 * Get image props for an <img> element
 * Spreads directly onto img tag for optimal loading
 */
export function getImageProps(
  url: string | null | undefined,
  options: ImageOptimizeOptions & { 
    alt: string;
    className?: string;
    isLCP?: boolean;
  }
): React.ImgHTMLAttributes<HTMLImageElement> {
  const { alt, className, isLCP, ...imageOptions } = options;
  const optimized = getOptimizedImageUrl(url, imageOptions);
  
  return {
    src: optimized.src,
    srcSet: optimized.srcSet,
    sizes: optimized.sizes,
    loading: isLCP ? "eager" : optimized.loading,
    decoding: optimized.decoding,
    alt,
    className,
    width: optimized.width,
    // Add fetchpriority for LCP images
    ...(isLCP && { fetchPriority: "high" as const }),
  };
}

/**
 * Preload a critical image (for LCP optimization)
 */
export function preloadImage(url: string, options: ImageOptimizeOptions = {}): void {
  if (typeof document === "undefined") return;
  
  const optimized = getOptimizedImageUrl(url, options);
  
  // Check if already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${optimized.src}"]`);
  if (existing) return;
  
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = optimized.src;
  link.setAttribute("imagesrcset", optimized.srcSet);
  link.setAttribute("imagesizes", optimized.sizes);
  document.head.appendChild(link);
}
