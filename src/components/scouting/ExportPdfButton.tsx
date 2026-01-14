import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ScoutingReportPdfTemplate } from "./pdf/ScoutingReportPdfTemplate";
import { exportToPdf, generateReportFilename } from "@/lib/pdfExport";
import type { ScoutingReportData } from "@/types/scouting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportPdfButtonProps {
  report: ScoutingReportData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

type QualityOption = {
  label: string;
  description: string;
  scale: number;
};

const QUALITY_OPTIONS: Record<string, QualityOption> = {
  normal: {
    label: "Normal",
    description: "Mais rápido",
    scale: 2,
  },
  high: {
    label: "Alta Qualidade",
    description: "Melhor para impressão",
    scale: 3,
  },
};

export function ExportPdfButton({ report, variant = "outline", size = "sm" }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTemplate, setShowTemplate] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async (quality: keyof typeof QUALITY_OPTIONS) => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }

    const qualityConfig = QUALITY_OPTIONS[quality];
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
        scale: qualityConfig.scale,
        onProgress: setProgress,
      });

      toast.success("PDF exportado com sucesso!", {
        description: `${filename} (${qualityConfig.label})`,
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isExporting}
            className="gap-1"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress > 0 && <span>{Math.round(progress)}%</span>}
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => handleExport("normal")}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className="font-medium">{QUALITY_OPTIONS.normal.label}</span>
            <span className="text-xs text-muted-foreground">
              {QUALITY_OPTIONS.normal.description}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport("high")}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className="font-medium">{QUALITY_OPTIONS.high.label}</span>
            <span className="text-xs text-muted-foreground">
              {QUALITY_OPTIONS.high.description}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
