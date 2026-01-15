import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Loader2, X, ZoomIn, ZoomOut, Eye } from "lucide-react";
import { toast } from "sonner";
import { ScoutingReportPdfTemplate } from "./pdf/ScoutingReportPdfTemplate";
import { exportToPdf, generateReportFilename } from "@/lib/pdfExport";
import type { ScoutingReportData } from "@/types/scouting";

interface PdfPreviewModalProps {
  report: ScoutingReportData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qualityScale: number;
  qualityLabel: string;
}

export function PdfPreviewModal({
  report,
  open,
  onOpenChange,
  qualityScale,
  qualityLabel,
}: PdfPreviewModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(0.5);
  const templateRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      // Use the SAME template element that's visible in the preview
      const templateElement = templateRef.current;
      if (!templateElement) {
        throw new Error("Template não encontrado");
      }

      // Temporarily reset zoom transform for accurate capture
      const previewWrapper = templateElement.parentElement;
      const originalTransform = previewWrapper?.style.transform;
      if (previewWrapper) {
        previewWrapper.style.transform = "none";
      }

      // Small delay for the transform change to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      const filename = generateReportFilename(
        report.players.full_name,
        report.match_date
      );

      await exportToPdf(templateElement, {
        filename,
        scale: qualityScale,
        onProgress: setProgress,
      });

      // Restore original transform
      if (previewWrapper && originalTransform !== undefined) {
        previewWrapper.style.transform = originalTransform;
      }

      toast.success("PDF exportado com sucesso!", {
        description: `${filename} (${qualityLabel})`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar PDF", {
        description: "Tente novamente em alguns instantes",
      });
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [report, qualityScale, qualityLabel, onOpenChange]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.3));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Preview do Relatório
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Verifique o layout antes de exportar
                </p>
              </div>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
                disabled={zoom <= 0.3}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
                disabled={zoom >= 1}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview area - uses fixed A4 width container */}
        <ScrollArea className="flex-1 bg-muted/30">
          <div className="p-6 flex justify-center">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.2s ease",
              }}
            >
              <div
                className="bg-white shadow-2xl rounded-lg overflow-hidden"
                style={{
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
              >
                <ScoutingReportPdfTemplate ref={templateRef} report={report} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Qualidade: <span className="font-medium">{qualityLabel}</span>
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExporting}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {progress > 0 ? `${Math.round(progress)}%` : "Gerando..."}
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
