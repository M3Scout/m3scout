import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewsImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

export function NewsImageUpload({ 
  value, 
  onChange,
  onUploadStart,
  onUploadEnd 
}: NewsImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);
    onUploadStart?.();

    try {
      // Generate unique filename
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${randomId}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("news-images")
        .getPublicUrl(filename);

      onChange(urlData.publicUrl);
      toast.success("Imagem enviada com sucesso");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
      onUploadEnd?.();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors",
          dragOver 
            ? "border-primary bg-primary/5" 
            : "border-zinc-800 hover:border-zinc-700",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {value ? (
          // Preview
          <div className="relative aspect-video">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-1" />
                Trocar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          // Empty State
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="w-full p-8 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">Enviando...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Clique para selecionar ou arraste uma imagem
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    JPG, PNG ou WebP • Máx. 5MB
                  </p>
                </div>
              </>
            )}
          </button>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* URL Preview */}
      {value && (
        <div className="flex items-center gap-2">
          <Input
            value={value}
            readOnly
            className="bg-zinc-900/50 border-zinc-800 text-zinc-400 text-xs"
          />
        </div>
      )}
    </div>
  );
}
