import { useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface UseExportPngOptions {
  filename?: string;
  backgroundColor?: string;
  scale?: number;
}

export function useExportPng(options: UseExportPngOptions = {}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPng = useCallback(
    async (element: HTMLElement | null) => {
      if (!element) {
        toast.error("Elemento não encontrado para exportar");
        return;
      }

      setIsExporting(true);

      try {
        const canvas = await html2canvas(element, {
          backgroundColor: options.backgroundColor || "#1a1a1a",
          scale: options.scale || 2,
          useCORS: true,
          logging: false,
          // Ensure proper rendering
          onclone: (clonedDoc) => {
            // Fix any styling issues in the clone
            const clonedElement = clonedDoc.body.querySelector('[data-export-target]');
            if (clonedElement instanceof HTMLElement) {
              clonedElement.style.padding = '16px';
            }
          },
        });

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error("Erro ao gerar imagem");
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${options.filename || "export"}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success("Imagem exportada com sucesso!");
        }, "image/png");
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Erro ao exportar imagem");
      } finally {
        setIsExporting(false);
      }
    },
    [options.backgroundColor, options.filename, options.scale]
  );

  return { exportToPng, isExporting };
}
