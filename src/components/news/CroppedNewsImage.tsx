import { useState } from "react";
import { cn } from "@/lib/utils";

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
const PLACEHOLDER_IMAGE = "/placeholder.svg";

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

  // Use placeholder if no src provided or if image failed to load
  const imageSrc = (!src || hasError) ? PLACEHOLDER_IMAGE : src;
  const isPlaceholder = imageSrc === PLACEHOLDER_IMAGE;

  return (
    <div 
      className={cn("overflow-hidden bg-neutral-800/50 relative", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {isLoading && !isPlaceholder && (
        <div className="absolute inset-0 bg-neutral-800/50 animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading && !isPlaceholder ? "opacity-0" : "opacity-100"
        )}
        style={
          isPlaceholder
            ? undefined
            : {
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${position.scale})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }
        }
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        loading="lazy"
      />
    </div>
  );
}
