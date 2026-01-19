/**
 * Match Summary PDF Export Button
 * Uses @react-pdf/renderer for vector-based PDF generation
 */
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Match, MatchPlayer, MatchEvent, MatchEventType } from "@/hooks/useLiveMatch";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { MatchSummaryVectorPdf } from "./MatchSummaryVectorPdf";
import { exportVectorPdf } from "@/lib/vectorPdfExport";

// Use static URL path for the logo (works reliably with react-pdf)
const LOGO_URL = "/logo-m3.png";

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
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const { teamName: settingsTeamName } = useTeamSettings();

  // Pre-load logo as base64 for reliable PDF embedding
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch(LOGO_URL);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.warn("Failed to load logo:", error);
      }
    };
    loadLogo();
  }, []);

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
          logoUrl={logoBase64 || undefined}
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
