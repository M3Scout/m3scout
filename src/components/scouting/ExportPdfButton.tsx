import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { ScoutingReportPdfTemplate } from "./pdf/ScoutingReportPdfTemplate";
import { exportToPdf, generateReportFilename } from "@/lib/pdfExport";
import type { ScoutingReportData } from "@/types/scouting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface ExportPdfButtonProps {
  report: ScoutingReportData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

type QualityKey = "normal" | "high";

type QualityOption = {
  label: string;
  description: string;
  scale: number;
};

const QUALITY_OPTIONS: Record<QualityKey, QualityOption> = {
  normal: {
    label: "Normal",
    description: "Mais rápido (~3s)",
    scale: 2,
  },
  high: {
    label: "Alta Qualidade",
    description: "Melhor p/ impressão (~6s)",
    scale: 3,
  },
};

const STORAGE_KEY = "pdf-quality-preference";

function getStoredQuality(): QualityKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "normal" || stored === "high") {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return "normal";
}

function setStoredQuality(quality: QualityKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, quality);
  } catch {
    // localStorage not available
  }
}

export function ExportPdfButton({ report, variant = "outline", size = "sm" }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTemplate, setShowTemplate] = useState(false);
  const [preferredQuality, setPreferredQuality] = useState<QualityKey>("normal");
  const templateRef = useRef<HTMLDivElement>(null);

  // Load preference from localStorage on mount
  useEffect(() => {
    setPreferredQuality(getStoredQuality());
  }, []);

  const handleExport = useCallback(async (quality: QualityKey) => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }

    // Save preference
    setPreferredQuality(quality);
    setStoredQuality(quality);

    const qualityConfig = QUALITY_OPTIONS[quality];
    setIsExporting(true);
    setProgress(0);
    setShowTemplate(true);

    // Wait for template to render
    await new Promise((resolve) => setTimeout(resolve, 600));

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
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Escolha a qualidade
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleExport("normal")}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">{QUALITY_OPTIONS.normal.label}</span>
              <span className="text-xs text-muted-foreground">
                {QUALITY_OPTIONS.normal.description}
              </span>
            </div>
            {preferredQuality === "normal" && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport("high")}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">{QUALITY_OPTIONS.high.label}</span>
              <span className="text-xs text-muted-foreground">
                {QUALITY_OPTIONS.high.description}
              </span>
            </div>
            {preferredQuality === "high" && (
              <Check className="w-4 h-4 text-primary" />
            )}
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
              overflow: "visible",
            }}
          >
            <ScoutingReportPdfTemplate ref={templateRef} report={report} />
          </div>,
          document.body
        )}
    </>
  );
}
