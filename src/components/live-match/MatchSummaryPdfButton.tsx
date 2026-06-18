/**
 * Match Summary PDF Export Buttons
 * Uses @react-pdf/renderer for vector-based PDF generation
 * 
 * Supports:
 * - Export all players (general PDF)
 * - Export specific players (filtered PDF via modal)
 * 
 * FIX: Pre-converts player photos to base64 before PDF generation
 * to ensure images load correctly in the PDF renderer (especially
 * for Supabase Storage URLs that may have auth/expiry issues).
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
import { Match, MatchPlayer, MatchEvent, MatchEventType, MatchPlayerStats } from "@/hooks/useLiveMatch";
import { FileDown, Loader2, ChevronDown, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { MatchSummaryVectorPdf } from "./MatchSummaryVectorPdf";
import { PlayerSelectPdfModal } from "./PlayerSelectPdfModal";
import { exportVectorPdf } from "@/lib/vectorPdfExport";
import { preparePlayerPhotosForPdf, imageUrlToBase64 } from "@/lib/imageToBase64";

// Use the new logo for PDF reports
const LOGO_URL = "/logo-relatorio-pdf.png";

interface MatchSummaryPdfButtonProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  playerEventCounts: Record<string, Partial<Record<MatchEventType, number>>>;
  playerStatsMap?: Record<string, MatchPlayerStats>;
}

export function MatchSummaryPdfButton({
  match,
  matchPlayers,
  matchEvents,
  playerEventCounts,
  playerStatsMap = {},
}: MatchSummaryPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const { teamName: settingsTeamName } = useTeamSettings();

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
      
      // Determine which players to include
      const playersToExport = selectedPlayerIds && selectedPlayerIds.length > 0
        ? matchPlayers.filter(mp => selectedPlayerIds.includes(mp.player_id))
        : matchPlayers;
      
      // Pre-convert all player photos to base64 BEFORE generating PDF
      // This ensures images load correctly even with signed/private storage URLs
      console.log(`Converting ${playersToExport.length} player photos to base64...`);
      const playerPhotoBase64Map = await preparePlayerPhotosForPdf(playersToExport, {
        onProgress: (completed, total) => {
          console.log(`Photo conversion: ${completed}/${total}`);
        },
      });
      console.log(`Converted ${playerPhotoBase64Map.size} photos successfully`);
      
      // Generate filename
      let filename: string;
      if (selectedPlayerIds && selectedPlayerIds.length === 1) {
        // Single player: include player name
        const player = matchPlayers.find(mp => mp.player_id === selectedPlayerIds[0]);
        const playerName = player?.player?.full_name
          ?.split(" ")
          .slice(0, 1)[0]
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
      
      // Convert Map to Record for component props
      const playerPhotoBase64Record: Record<string, string> = {};
      playerPhotoBase64Map.forEach((value, key) => {
        playerPhotoBase64Record[key] = value;
      });
      
      // Create the PDF document with pre-converted photos
      const pdfDocument = (
        <MatchSummaryVectorPdf
          match={match}
          matchPlayers={matchPlayers}
          matchEvents={matchEvents}
          playerEventCounts={playerEventCounts}
          playerStatsMap={playerStatsMap}
          teamName={teamName}
          logoUrl={logoBase64 || undefined}
          selectedPlayerIds={selectedPlayerIds}
          playerPhotoBase64={playerPhotoBase64Record}
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
