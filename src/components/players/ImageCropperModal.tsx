import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw, ZoomIn } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatFixed } from "@/lib/formatters";

interface ImageCropperModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

// Helper function to create cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const outputWidth = 1200;
  const outputHeight = 1600;
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Save context state
  ctx.save();

  // Move to center, rotate, then draw
  ctx.translate(outputWidth / 2, outputHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-outputWidth / 2, -outputHeight / 2);

  // Draw the cropped portion scaled to 1200×1600
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/webp",
      0.95
    );
  });
}

export function ImageCropperModal({
  open,
  onClose,
  imageSrc,
  onCropComplete,
}: ImageCropperModalProps) {
  const isMobile = useIsMobile();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((value: number) => {
    setZoom(value);
  }, []);

  const onCropAreaComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleRecenter = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    handleRecenter();
    onClose();
  };

  const content = (
    <div className="flex flex-col gap-4">
      {/* Cropper area */}
      <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={3 / 4}
          cropShape="rect"
          showGrid={false}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropAreaComplete}
        />
      </div>

      {/* Controls */}
      <div className="space-y-4 px-1">
        {/* Zoom */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">Zoom</Label>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatFixed(zoom, 1)}x
            </span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([value]) => setZoom(value)}
          />
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">Rotação</Label>
            <span className="text-xs text-muted-foreground ml-auto">
              {rotation}°
            </span>
          </div>
          <Slider
            value={[rotation]}
            min={-15}
            max={15}
            step={1}
            onValueChange={([value]) => setRotation(value)}
          />
        </div>

        {/* Recenter button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRecenter}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Recentralizar
        </Button>
      </div>
    </div>
  );

  const footer = (
    <div className="flex gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        className="flex-1"
        disabled={processing}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={handleSave}
        className="flex-1"
        disabled={processing}
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          "Salvar Foto"
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ajustar Foto</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Foto</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
