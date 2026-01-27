import React, { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ComparePdfVector } from "./ComparePdfVector";
import { exportVectorPdf } from "@/lib/vectorPdfExport";
import { batchConvertImagesToBase64 } from "@/lib/imageToBase64";
import type { PlayerStatRow } from "@/lib/attributeRadar";

// Use the new logo for PDF reports
const LOGO_URL = "/logo-relatorio-pdf.png";

interface PlayerData {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
  height?: number | null;
}

interface AggregatedStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots?: number;
  shots_on_target?: number;
  key_passes?: number;
  chances_created?: number;
  duels_won?: number;
  total_duels?: number;
  accurate_passes?: number;
  total_passes?: number;
  successful_dribbles?: number;
  total_dribbles?: number;
}

interface PlayerWithStats extends PlayerData {
  aggregatedStats: AggregatedStats | null;
  statsRows?: PlayerStatRow[];
}

interface ExportComparePdfButtonProps {
  players: PlayerWithStats[];
  disabled?: boolean;
}

export function ExportComparePdfButton({ players, disabled }: ExportComparePdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (players.length < 2) return;

    setIsExporting(true);
    try {
      // Pre-convert all player photos to base64 for reliable PDF embedding
      const photoUrls = players.map(p => p.photo_url).filter((url): url is string => !!url);
      const base64Map = await batchConvertImagesToBase64(photoUrls);
      
      // Create player_id -> base64 map
      const playerPhotoBase64: Record<string, string> = {};
      players.forEach(p => {
        if (p.photo_url) {
          const base64 = base64Map.get(p.photo_url);
          if (base64) {
            playerPhotoBase64[p.id] = base64;
          }
        }
      });

      const playerNames = players
        .map((p) => p.full_name.split(" ")[0])
        .join("-vs-")
        .toLowerCase()
        .replace(/\s+/g, "-");
      
      const filename = `comparacao-${playerNames}-${new Date().toISOString().split("T")[0]}.pdf`;

      const pdfDocument = (
        <ComparePdfVector
          players={players}
          logoUrl={LOGO_URL}
          playerPhotoBase64={playerPhotoBase64}
        />
      );

      await exportVectorPdf(pdfDocument, { filename });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  if (players.length < 2) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isExporting || players.length < 2}
      onClick={handleExport}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}
