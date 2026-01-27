import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, ChevronDown, Eye } from "lucide-react";
import { toast } from "sonner";
import { ScoutingReportVectorPdf } from "./pdf/ScoutingReportVectorPdf";
import { exportVectorPdf } from "@/lib/vectorPdfExport";
import { generateReportFilename } from "@/lib/pdfExport";
import { PdfPreviewModal } from "./PdfPreviewModal";
import type { ScoutingReportData } from "@/types/scouting";
import { imageUrlToBase64 } from "@/lib/imageToBase64";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Logo URL for PDF
const LOGO_URL = "/logo-relatorio.png";

interface ExportPdfButtonProps {
  report: ScoutingReportData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportPdfButton({ report, variant = "outline", size = "sm" }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Pre-load logo as base64 for reliable PDF embedding
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const base64 = await imageUrlToBase64(LOGO_URL);
        if (base64) {
          setLogoBase64(base64);
        }
      } catch (error) {
        console.warn("Failed to load logo:", error);
      }
    };
    loadLogo();
  }, []);

  const handleOpenPreview = useCallback(() => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }
    setShowPreview(true);
  }, [report.players]);

  const handleDirectExport = useCallback(async () => {
    if (!report.players) {
      toast.error("Dados do jogador não disponíveis");
      return;
    }

    setIsExporting(true);

    try {
      // Pre-convert player photo to base64 for reliable PDF embedding
      let playerPhotoBase64: string | null = null;
      if (report.players?.photo_url) {
        console.log("Converting player photo to base64...");
        playerPhotoBase64 = await imageUrlToBase64(report.players.photo_url);
        console.log(playerPhotoBase64 ? "Photo converted successfully" : "Photo conversion failed, using fallback");
      }

      const filename = generateReportFilename(
        report.players.full_name,
        report.match_date
      );

      const pdfDocument = (
        <ScoutingReportVectorPdf
          report={report}
          logoUrl={logoBase64 || undefined}
          playerPhotoBase64={playerPhotoBase64}
        />
      );

      await exportVectorPdf(pdfDocument, {
        filename,
        onProgress: (progress) => {
          console.log(`PDF Export progress: ${progress}%`);
        },
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
    }
  }, [report, logoBase64]);

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
                <span>Gerando...</span>
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
          {/* Preview option */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Opções
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={handleOpenPreview}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">Visualizar Preview</span>
              <span className="text-xs text-muted-foreground">
                Ver antes de exportar
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Direct export */}
          <DropdownMenuItem
            onClick={handleDirectExport}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">Exportar PDF Vetorial</span>
              <span className="text-xs text-muted-foreground">
                Alta qualidade (textos nítidos)
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
        qualityScale={1}
        qualityLabel="Vetorial"
      />
    </>
  );
}
