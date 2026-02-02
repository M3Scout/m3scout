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

export function CroppedNewsImage({
  src,
  alt,
  crop,
  className,
  aspectRatio,
}: CroppedNewsImageProps) {
  const position = crop ?? DEFAULT_CROP;

  return (
    <div 
      className={cn("overflow-hidden", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          objectPosition: `${position.x}% ${position.y}%`,
          transform: `scale(${position.scale})`,
          transformOrigin: `${position.x}% ${position.y}%`,
        }}
      />
    </div>
  );
}
