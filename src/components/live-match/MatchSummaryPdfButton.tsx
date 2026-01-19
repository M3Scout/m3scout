/**
 * Match Summary PDF Export Buttons
 * Uses @react-pdf/renderer for vector-based PDF generation
 * 
 * Supports:
 * - Export all players (general PDF)
 * - Export specific players (filtered PDF via modal)
 */
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Match, MatchPlayer, MatchEvent, MatchEventType } from "@/hooks/useLiveMatch";
import { FileDown, Loader2, ChevronDown, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { MatchSummaryVectorPdf } from "./MatchSummaryVectorPdf";
import { PlayerSelectPdfModal } from "./PlayerSelectPdfModal";
import { exportVectorPdf } from "@/lib/vectorPdfExport";

// Use static URL path for the logo (works reliably with react-pdf)
const LOGO_URL = "/logo-m3.png";

interface MatchSummaryPdfButtonProps {
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
}: MatchSummaryPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
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

  const handleExportAll = async () => {
    await handleExport();
  };

  const handleExportByPlayers = async (playerIds: string[]) => {
    await handleExport(playerIds);
  };

  const handleExport = async (selectedPlayerIds?: string[]) => {
    setIsExporting(true);
    try {
      const teamName = match.team_name_display || settingsTeamName || "Time";
      
      // Generate filename
      let filename: string;
      if (selectedPlayerIds && selectedPlayerIds.length === 1) {
        // Single player: include player name
        const player = matchPlayers.find(mp => mp.player_id === selectedPlayerIds[0]);
        const playerName = player?.player?.full_name
          ?.split(" ")
          .slice(-1)[0]
          .toLowerCase()
          .replace(/\s+/g, "-") || "jogador";
        filename = `resumo-jogo-${playerName}-${match.opponent_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(match.match_date), 'yyyy-MM-dd')}.pdf`;
      } else if (selectedPlayerIds && selectedPlayerIds.length > 1) {
        // Multiple players
        filename = `resumo-jogo-${selectedPlayerIds.length}jogadores-${match.opponent_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(match.match_date), 'yyyy-MM-dd')}.pdf`;
      } else {
        // All players
        filename = `resumo-jogo-${match.opponent_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(match.match_date), 'yyyy-MM-dd')}.pdf`;
      }
      
      // Create the PDF document
      const pdfDocument = (
        <MatchSummaryVectorPdf
          match={match}
          matchPlayers={matchPlayers}
          matchEvents={matchEvents}
          playerEventCounts={playerEventCounts}
          teamName={teamName}
          logoUrl={logoBase64 || undefined}
          selectedPlayerIds={selectedPlayerIds}
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
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
                <ChevronDown className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportAll} disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" />
            PDF Completo (Todos Jogadores)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowPlayerModal(true)} 
            disabled={isExporting}
          >
            <Users className="h-4 w-4 mr-2" />
            PDF por Jogador...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PlayerSelectPdfModal
        open={showPlayerModal}
        onOpenChange={setShowPlayerModal}
        matchPlayers={matchPlayers}
        onExport={handleExportByPlayers}
        isExporting={isExporting}
      />
    </>
  );
}

// Also export the old name for backwards compatibility
export { MatchSummaryPdfButton as MatchSummaryPdfButtonNew };
