import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClinicalReportVectorPdf } from "./ClinicalReportVectorPdf";
import { exportVectorPdf } from "@/lib/vectorPdfExport";
import { imageUrlToBase64 } from "@/lib/imageToBase64";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface Player {
  full_name: string;
  position: string;
  age?: number | null;
  birth_date?: string | null;
  nationality?: string;
  current_club?: string | null;
  photo_url?: string | null;
}

interface ExportClinicalPdfButtonProps {
  player: Player;
  injuries: Injury[];
  physicalStatus?: string | null;
  medicalNotes?: string | null;
}

export function ExportClinicalPdfButton({
  player,
  injuries,
  physicalStatus,
  medicalNotes,
}: ExportClinicalPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Pre-convert player photo to base64 for reliable PDF embedding
      let playerPhotoBase64: string | null = null;
      if (player.photo_url) {
        console.log("Converting player photo to base64...");
        playerPhotoBase64 = await imageUrlToBase64(player.photo_url);
        console.log(playerPhotoBase64 ? "Photo converted successfully" : "Photo conversion failed, using fallback");
      }

      const fileName = `relatorio-clinico-${player.full_name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

      const pdfDocument = (
        <ClinicalReportVectorPdf
          player={player}
          injuries={injuries}
          physicalStatus={physicalStatus}
          medicalNotes={medicalNotes}
          playerPhotoBase64={playerPhotoBase64}
        />
      );

      await exportVectorPdf(pdfDocument, { filename: fileName });
      toast.success("Relatório PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}
