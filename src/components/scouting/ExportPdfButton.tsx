import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, ChevronDown, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { ScoutingReportPdfTemplate } from "./pdf/ScoutingReportPdfTemplate";
import { exportToPdf, generateReportFilename } from "@/lib/pdfExport";
import { PdfPreviewModal } from "./PdfPreviewModal";
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
  outputResolution: number; // Upscale multiplier for final output
};

// CRITICAL: All quality options MUST use scale=1 for pixel-identical export.
// PDF quality comes from outputResolution (upscaling), not from html2canvas scale.
// Higher html2canvas scales (1.5x, 2x, 3x) cause subtle flex/baseline alignment shifts.
const QUALITY_OPTIONS: Record<QualityKey, QualityOption> = {
  normal: {
    label: "Normal",
    description: "Resolução padrão (2x)",
    scale: 1, // NEVER change this
    outputResolution: 2, // 2x upscale = ~1588px wide
  },
  high: {
    label: "Alta Resolução",
    description: "Para impressão (3x)",
    scale: 1, // NEVER change this - use outputResolution for quality
    outputResolution: 3, // 3x upscale = ~2382px wide
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<QualityKey>("normal");
  const templateRef = useRef<HTMLDivElement>(null);

  // Load preference from localStorage on mount
  useEffect(() => {
    setPreferredQuality(getStoredQuality());
  }, []);

  const handleOpenPreview = useCallback((quality: QualityKey) => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }

    // Save preference
    setPreferredQuality(quality);
    setStoredQuality(quality);
    setPreviewQuality(quality);
    setShowPreview(true);
  }, [report.players]);

  const handleDirectExport = useCallback(async (quality: QualityKey) => {
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

    // Wait for template to render, fonts and images to fully load
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Also wait for document fonts
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

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
        outputResolution: qualityConfig.outputResolution,
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
        <DropdownMenuContent align="end" className="w-56">
          {/* Preview options */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Com preview
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleOpenPreview("normal")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">Preview Normal</span>
              <span className="text-xs text-muted-foreground">
                Visualizar antes de exportar
              </span>
            </div>
            {preferredQuality === "normal" && (
              <Check className="w-4 h-4 text-primary ml-auto" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleOpenPreview("high")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">Preview Alta Qualidade</span>
              <span className="text-xs text-muted-foreground">
                Melhor p/ impressão
              </span>
            </div>
            {preferredQuality === "high" && (
              <Check className="w-4 h-4 text-primary ml-auto" />
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Direct export options */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Exportar direto
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleDirectExport("normal")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">{QUALITY_OPTIONS.normal.label}</span>
              <span className="text-xs text-muted-foreground">
                {QUALITY_OPTIONS.normal.description}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDirectExport("high")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">{QUALITY_OPTIONS.high.label}</span>
              <span className="text-xs text-muted-foreground">
                {QUALITY_OPTIONS.high.description}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview Modal */}
      <PdfPreviewModal
        report={report}
        open={showPreview}
        onOpenChange={setShowPreview}
        qualityScale={QUALITY_OPTIONS[previewQuality].scale}
        qualityLabel={QUALITY_OPTIONS[previewQuality].label}
      />

      {/* Hidden template for direct PDF generation - uses same fixed styling */}
      {showTemplate &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              zIndex: -1,
              overflow: "visible",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div
              style={{
                backgroundColor: "#FFFFFF",
              }}
            >
              <ScoutingReportPdfTemplate ref={templateRef} report={report} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
