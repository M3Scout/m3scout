/**
 * Match Summary PDF Export Button
 * Uses @react-pdf/renderer for vector-based PDF generation
 */
import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Match, MatchPlayer, MatchEvent, MatchEventType } from "@/hooks/useLiveMatch";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { MatchSummaryVectorPdf } from "./MatchSummaryVectorPdf";
import { exportVectorPdf } from "@/lib/vectorPdfExport";

// Import the logo as a URL for react-pdf
import logoM3 from "@/assets/logo-m3.png";

interface MatchSummaryPdfProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  playerEventCounts: Record<string, Partial<Record<MatchEventType, number>>>;
}

export function MatchSummaryPdfButton({
  match,
  matchPlayers,
  matchEvents,
  playerEventCounts,
}: MatchSummaryPdfProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { teamName: settingsTeamName } = useTeamSettings();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filename = `resumo-jogo-${match.opponent_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(match.match_date), 'yyyy-MM-dd')}.pdf`;
      
      const teamName = match.team_name_display || settingsTeamName || "Time";
      
      // Create the PDF document
      const pdfDocument = (
        <MatchSummaryVectorPdf
          match={match}
          matchPlayers={matchPlayers}
          matchEvents={matchEvents}
          playerEventCounts={playerEventCounts}
          teamName={teamName}
          logoUrl={logoM3}
        />
      );
      
      await exportVectorPdf(pdfDocument, {
        filename,
        onProgress: (progress) => {
          console.log(`PDF Export progress: ${progress}%`);
        },
      });
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("PDF export error:", error);
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
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </>
      )}
    </Button>
  );
}
