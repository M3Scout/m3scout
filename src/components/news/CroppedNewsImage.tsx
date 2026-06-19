import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

export type CropPosition = {
  x: number;
  y: number;
  scale: number;
};

interface CroppedNewsImageProps {
  src: string;
  alt: string;
  crop?: CropPosition | null;
  className?: string;
  width?: number;
  aspectRatio?: number;
  objectFit?: "cover" | "contain";
}

const DEFAULT_CROP: CropPosition = { x: 50, y: 20, scale: 1 };

export function CroppedNewsImage({
  src,
  alt,
  crop,
  className,
  aspectRatio,
  width = 1200,
  objectFit = "cover",
}: CroppedNewsImageProps) {
  const position = crop ?? DEFAULT_CROP;
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const optimizedSrc = getOptimizedImageUrl(src, { width, quality: 85, format: "avif" }) || src;

  // Check if URL is likely expired (Discord CDN with ex= parameter from the past)
  const isLikelyExpired = src?.includes('cdn.discordapp.com') && src?.includes('ex=');

  // Use placeholder if no src provided, URL is expired, or image failed to load
  const showPlaceholder = !src || hasError || isLikelyExpired;

  return (
    <div 
      className={cn("overflow-hidden bg-neutral-800/50 relative", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {showPlaceholder ? (
        // Placeholder with icon
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800/50">
          <ImageOff className="w-8 h-8 text-neutral-500" strokeWidth={1.5} />
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-neutral-800/50 animate-pulse" />
          )}
          <img
            src={optimizedSrc}
            alt={alt}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-300",
              objectFit === "contain" ? "object-contain" : "object-cover",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            style={{
              objectPosition: `${position.x}% ${position.y}%`,
              ...(position.scale !== 1 && {
                transform: `scale(${position.scale})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }),
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
}
