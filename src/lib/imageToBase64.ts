/**
 * Image to Base64 Conversion Utilities for PDF Generation
 * 
 * @react-pdf/renderer requires images to be either:
 * - Public absolute URLs accessible without auth
 * - Base64 data URLs
 * 
 * Supabase storage URLs (especially signed/private) often fail in PDF context,
 * so we pre-convert images to base64 before rendering.
 */

export interface ImageConversionResult {
  originalUrl: string;
  base64: string | null;
  success: boolean;
  error?: string;
}

/**
 * Converts an image URL to a base64 data URL
 * Returns null if conversion fails (fallback to placeholder)
 */
export async function imageUrlToBase64(
  url: string,
  options: {
    timeout?: number;
    maxRetries?: number;
  } = {}
): Promise<string | null> {
  const { timeout = 8000, maxRetries = 2 } = options;
  
  if (!url) return null;
  
  // Already a data URL
  if (url.startsWith("data:")) {
    return url;
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store", // Avoid stale cache issues
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get("content-type") || "image/png";
      const blob = await response.blob();
      
      // Handle WEBP/HEIC - convert to PNG if needed
      // Most PDF renderers support PNG/JPEG but not WEBP/HEIC
      const needsConversion = 
        contentType.includes("webp") || 
        contentType.includes("heic") ||
        contentType.includes("heif");
      
      if (needsConversion) {
        const converted = await convertImageToCompatibleFormat(blob);
        if (converted) {
          return converted;
        }
      }
      
      // Standard conversion to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`Image conversion attempt ${attempt + 1} failed for ${url}:`, error);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  
  console.error(`Failed to convert image after ${maxRetries} attempts:`, url, lastError);
  return null;
}

/**
 * Converts WEBP/HEIC blobs to PNG using canvas
 */
async function convertImageToCompatibleFormat(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(blob);
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (error) {
        console.warn("Canvas conversion failed:", error);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    
    img.src = objectUrl;
  });
}

/**
 * Batch convert multiple image URLs to base64
 * Returns a map of originalUrl -> base64DataUrl
 */
export async function batchConvertImagesToBase64(
  urls: string[],
  options: {
    timeout?: number;
    maxRetries?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Map<string, string | null>> {
  const { onProgress } = options;
  const results = new Map<string, string | null>();
  
  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  
  // Process in parallel with concurrency limit
  const CONCURRENCY = 4;
  let completed = 0;
  
  for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY) {
    const batch = uniqueUrls.slice(i, i + CONCURRENCY);
    
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const base64 = await imageUrlToBase64(url, options);
        return { url, base64 };
      })
    );
    
    batchResults.forEach(({ url, base64 }) => {
      results.set(url, base64);
    });
    
    completed += batch.length;
    onProgress?.(completed, uniqueUrls.length);
  }
  
  return results;
}

/**
 * Prepares player photos for PDF generation
 * Converts all player photo URLs to base64 and returns a map
 */
export async function preparePlayerPhotosForPdf(
  players: Array<{ player_id: string; player?: { photo_url?: string | null } | null }>,
  options?: {
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<Map<string, string>> {
  const photoUrls = players
    .map((p) => p.player?.photo_url)
    .filter((url): url is string => !!url);
  
  const base64Map = await batchConvertImagesToBase64(photoUrls, options);
  
  // Create player_id -> base64 map for easy lookup
  const playerPhotoMap = new Map<string, string>();
  
  players.forEach((p) => {
    const url = p.player?.photo_url;
    if (url) {
      const base64 = base64Map.get(url);
      if (base64) {
        playerPhotoMap.set(p.player_id, base64);
      }
    }
  });
  
  return playerPhotoMap;
}
