import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

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
  aspectRatio?: number;
}

const DEFAULT_CROP: CropPosition = { x: 50, y: 50, scale: 1 };

export function CroppedNewsImage({
  src,
  alt,
  crop,
  className,
  aspectRatio,
}: CroppedNewsImageProps) {
  const position = crop ?? DEFAULT_CROP;
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            style={{
              objectPosition: `${position.x}% ${position.y}%`,
              transform: `scale(${position.scale})`,
              transformOrigin: `${position.x}% ${position.y}%`,
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
