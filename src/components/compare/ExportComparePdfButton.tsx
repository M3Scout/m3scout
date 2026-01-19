import React, { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ComparePdfVector } from "./ComparePdfVector";
import { exportVectorPdf } from "@/lib/vectorPdfExport";
import type { PlayerStatRow } from "@/lib/attributeRadar";
import logoM3 from "@/assets/logo-m3.png";

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
      const playerNames = players
        .map((p) => p.full_name.split(" ")[0])
        .join("-vs-")
        .toLowerCase()
        .replace(/\s+/g, "-");
      
      const filename = `comparacao-${playerNames}-${new Date().toISOString().split("T")[0]}.pdf`;

      const pdfDocument = (
        <ComparePdfVector
          players={players}
          logoUrl={logoM3}
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
