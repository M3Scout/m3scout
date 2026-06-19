import { useState, useCallback, useRef, useEffect } from "react";
import { RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CropPosition = {
  x: number; // 0–100 (CSS object-position %)
  y: number;
  scale: number;
};

interface ImageCropEditorProps {
  imageUrl: string;
  heroCrop: CropPosition | null;
  cardCrop: CropPosition | null;
  onHeroCropChange: (crop: CropPosition) => void;
  onCardCropChange: (crop: CropPosition) => void;
}

const DEFAULT_CROP: CropPosition = { x: 50, y: 50, scale: 1 };

interface CropPanelProps {
  label: string;
  sublabel: string;
  aspectRatio: number;
  crop: CropPosition;
  imageUrl: string;
  onChange: (crop: CropPosition) => void;
}

function CropPanel({ label, sublabel, aspectRatio, crop, imageUrl, onChange }: CropPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; cropX: number; cropY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, cropX: crop.x, cropY: crop.y };
  }, [crop]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    onChange({
      scale: 1,
      x: Math.max(0, Math.min(100, dragRef.current.cropX - dx)),
      y: Math.max(0, Math.min(100, dragRef.current.cropY - dy)),
    });
  }, [dragging, crop, onChange]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    dragRef.current = null;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setDragging(true);
    dragRef.current = { startX: t.clientX, startY: t.clientY, cropX: crop.x, cropY: crop.y };
  }, [crop]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging || !dragRef.current || !containerRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((t.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((t.clientY - dragRef.current.startY) / rect.height) * 100;
    onChange({
      scale: 1,
      x: Math.max(0, Math.min(100, dragRef.current.cropX - dx)),
      y: Math.max(0, Math.min(100, dragRef.current.cropY - dy)),
    });
  }, [dragging, crop, onChange]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp, onTouchMove]);

  useEffect(() => {
    setLoaded(false);
  }, [imageUrl]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-white uppercase tracking-wide">{label}</p>
          <p className="text-[10px] text-zinc-500">{sublabel}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_CROP)}
          className="h-6 px-2 text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-800"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Centralizar
        </Button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 select-none",
          dragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ aspectRatio }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt="preview"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            objectPosition: `${crop.x}% ${crop.y}%`,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s",
          }}
          onLoad={() => setLoaded(true)}
        />
        {loaded && !dragging && (
          <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px]">
              <Move className="w-3 h-3" />
              Arraste para ajustar
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-zinc-600 text-center">
        Posição: {Math.round(crop.x)}%, {Math.round(crop.y)}%
      </p>
    </div>
  );
}

export function ImageCropEditor({
  imageUrl,
  heroCrop,
  cardCrop,
  onHeroCropChange,
  onCardCropChange,
}: ImageCropEditorProps) {
  if (!imageUrl) return null;

  const hero = heroCrop ?? DEFAULT_CROP;
  const card = cardCrop ?? DEFAULT_CROP;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <CropPanel
        label="Card — /imprensa"
        sublabel="Ratio 4:3 · Como aparece na listagem"
        aspectRatio={4 / 3}
        crop={card}
        imageUrl={imageUrl}
        onChange={onCardCropChange}
      />
      <CropPanel
        label="Hero — dentro da matéria"
        sublabel="Ratio 16:9 · Como aparece ao abrir a notícia"
        aspectRatio={16 / 9}
        crop={hero}
        imageUrl={imageUrl}
        onChange={onHeroCropChange}
      />
    </div>
  );
}
