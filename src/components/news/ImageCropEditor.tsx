import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  ZoomIn, 
  RotateCcw, 
  Move, 
  Image as ImageIcon,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CropPosition = {
  x: number; // 0-100 (percentage)
  y: number; // 0-100 (percentage)
  scale: number; // 1-3
};

interface ImageCropEditorProps {
  imageUrl: string;
  heroCrop: CropPosition | null;
  cardCrop: CropPosition | null;
  onHeroCropChange: (crop: CropPosition) => void;
  onCardCropChange: (crop: CropPosition) => void;
}

const DEFAULT_CROP: CropPosition = { x: 50, y: 50, scale: 1 };

type CropMode = "hero" | "card";

export function ImageCropEditor({
  imageUrl,
  heroCrop,
  cardCrop,
  onHeroCropChange,
  onCardCropChange,
}: ImageCropEditorProps) {
  const [mode, setMode] = useState<CropMode>("hero");
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null);

  const currentCrop = mode === "hero" 
    ? (heroCrop ?? DEFAULT_CROP) 
    : (cardCrop ?? DEFAULT_CROP);
  
  const setCrop = mode === "hero" ? onHeroCropChange : onCardCropChange;

  // Aspect ratios
  const aspectRatio = mode === "hero" ? 16 / 9 : 1.91; // Hero: 16:9, Card: 1.91:1

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cropX: currentCrop.x,
      cropY: currentCrop.y,
    };
  }, [currentCrop]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    
    // Invert the delta because we're moving the viewport, not the image
    const newX = Math.max(0, Math.min(100, dragStartRef.current.cropX - deltaX));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.cropY - deltaY));
    
    setCrop({ ...currentCrop, x: newX, y: newY });
  }, [isDragging, currentCrop, setCrop]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      cropX: currentCrop.x,
      cropY: currentCrop.y,
    };
  }, [currentCrop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((touch.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((touch.clientY - dragStartRef.current.y) / rect.height) * 100;
    
    const newX = Math.max(0, Math.min(100, dragStartRef.current.cropX - deltaX));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.cropY - deltaY));
    
    setCrop({ ...currentCrop, x: newX, y: newY });
  }, [isDragging, currentCrop, setCrop]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Reset image state when URL changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [imageUrl]);

  const handleReset = () => {
    setCrop(DEFAULT_CROP);
  };

  const handleScaleChange = (value: number[]) => {
    setCrop({ ...currentCrop, scale: value[0] });
  };

  if (!imageUrl) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 flex flex-col items-center justify-center gap-3">
        <ImageIcon className="w-8 h-8 text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          Cole uma URL de imagem acima para ajustar o enquadramento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "hero" ? "default" : "outline"}
          onClick={() => setMode("hero")}
          className={cn(
            "flex-1",
            mode === "hero" 
              ? "bg-primary text-white" 
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          )}
        >
          <Maximize2 className="w-4 h-4 mr-2" />
          Hero (16:9)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "card" ? "default" : "outline"}
          onClick={() => setMode("card")}
          className={cn(
            "flex-1",
            mode === "card" 
              ? "bg-primary text-white" 
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          )}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Card (1.91:1)
        </Button>
      </div>

      {/* Preview Container */}
      <div 
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 cursor-move select-none",
          isDragging && "cursor-grabbing"
        )}
        style={{ aspectRatio }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Image */}
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
            <p className="text-xs text-zinc-500">Erro ao carregar imagem</p>
          </div>
        ) : (
          <>
            <img
              src={imageUrl}
              alt="Preview"
              className="absolute w-full h-full object-cover transition-opacity duration-300"
              style={{
                objectPosition: `${currentCrop.x}% ${currentCrop.y}%`,
                transform: `scale(${currentCrop.scale})`,
                transformOrigin: `${currentCrop.x}% ${currentCrop.y}%`,
                opacity: imageLoaded ? 1 : 0,
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              draggable={false}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <div className="w-6 h-6 border-2 border-zinc-600 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </>
        )}

        {/* Drag hint overlay */}
        {imageLoaded && !isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs">
              <Move className="w-3.5 h-3.5" />
              Arraste para ajustar
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Zoom */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-xs text-zinc-400">
              <ZoomIn className="w-3.5 h-3.5" />
              Zoom
            </Label>
            <span className="text-xs text-zinc-500">{currentCrop.scale.toFixed(1)}x</span>
          </div>
          <Slider
            value={[currentCrop.scale]}
            min={1}
            max={2.5}
            step={0.1}
            onValueChange={handleScaleChange}
            className="w-full"
          />
        </div>

        {/* Position display + Reset */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            Posição: {currentCrop.x.toFixed(0)}%, {currentCrop.y.toFixed(0)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Centralizar
          </Button>
        </div>
      </div>

      {/* Both previews side by side */}
      <div className="pt-4 border-t border-zinc-800">
        <Label className="text-xs text-zinc-500 uppercase tracking-wide mb-3 block">
          Prévia dos dois formatos
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {/* Hero preview */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Hero</span>
            <div 
              className={cn(
                "overflow-hidden rounded border bg-zinc-900",
                mode === "hero" ? "border-primary" : "border-zinc-800"
              )}
              style={{ aspectRatio: 16 / 9 }}
            >
              {imageUrl && !imageError && (
                <img
                  src={imageUrl}
                  alt="Hero preview"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${(heroCrop ?? DEFAULT_CROP).x}% ${(heroCrop ?? DEFAULT_CROP).y}%`,
                    transform: `scale(${(heroCrop ?? DEFAULT_CROP).scale})`,
                    transformOrigin: `${(heroCrop ?? DEFAULT_CROP).x}% ${(heroCrop ?? DEFAULT_CROP).y}%`,
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Card preview */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Card</span>
            <div 
              className={cn(
                "overflow-hidden rounded border bg-zinc-900",
                mode === "card" ? "border-primary" : "border-zinc-800"
              )}
              style={{ aspectRatio: 1.91 }}
            >
              {imageUrl && !imageError && (
                <img
                  src={imageUrl}
                  alt="Card preview"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${(cardCrop ?? DEFAULT_CROP).x}% ${(cardCrop ?? DEFAULT_CROP).y}%`,
                    transform: `scale(${(cardCrop ?? DEFAULT_CROP).scale})`,
                    transformOrigin: `${(cardCrop ?? DEFAULT_CROP).x}% ${(cardCrop ?? DEFAULT_CROP).y}%`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
