import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScoutingReportPdfTemplate } from "./pdf/ScoutingReportPdfTemplate";
import { exportToPdf, generateReportFilename } from "@/lib/pdfExport";
import type { ScoutingReportData } from "@/types/scouting";

interface ExportPdfButtonProps {
  report: ScoutingReportData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportPdfButton({ report, variant = "outline", size = "sm" }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTemplate, setShowTemplate] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setShowTemplate(true);

    // Wait for template to render
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const templateElement = templateRef.current;
      if (!templateElement) {
        throw new Error("Template não encontrado");
      }

      const filename = generateReportFilename(
        report.players.full_name,
        report.match_date
      );

      await exportToPdf(templateElement, {
        filename,
        scale: 2,
        onProgress: setProgress,
      });

      toast.success("PDF exportado com sucesso!", {
        description: filename,
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar PDF", {
        description: "Tente novamente em alguns instantes",
      });
    } finally {
      setIsExporting(false);
      setShowTemplate(false);
      setProgress(0);
    }
  }, [report]);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {progress > 0 && <span className="ml-1">{Math.round(progress)}%</span>}
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Exportar PDF</span>
          </>
        )}
      </Button>

      {/* Hidden template for PDF generation */}
      {showTemplate &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              zIndex: -1,
              overflow: "hidden",
            }}
          >
            <ScoutingReportPdfTemplate ref={templateRef} report={report} />
          </div>,
          document.body
        )}
    </>
  );
}
