/**
 * Post-Game Insights Card
 * 
 * Displays 2 separate sections for finished matches:
 * 1. "Mapas de Calor da Partida" - Exclusive section for zone heatmaps
 * 2. "Resumo por Jogador" - Micro-insights and Strengths/Improvements (NO heatmaps)
 * 
 * Only renders when match is finished or applied.
 * 
 * NEW: Zone Deviation Analysis
 * - Calculates deviation between current game zones vs season average
 * - Requires >= 3 previous finished games
 * - Only shows deviations >= 10%
 * - Read-only, no DB writes
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generatePostGameAnalysis,
  type PostGameAnalysis,
  type QuickIndicator,
  type MatchStatsInput,
} from "@/lib/postGameAnalysis";
import { getShortPosition, getPositionColor } from "@/lib/positionColors";
import { MiniFieldHeatmap } from "./MiniFieldHeatmap";
import { usePlayerZoneHistory } from "@/hooks/usePlayerZoneHistory";
import { calculateZoneDeviation, type ZoneDeviationResult } from "@/lib/zoneDeviationEngine";
import { ZoneDeviationBadge } from "./ZoneDeviationBadge";
import { PerformanceProfileInsight } from "./PerformanceProfileInsight";
import { PlayerHalfComparison } from "./PlayerHalfComparison";
import { PlayerGameProfileBadge } from "./PlayerGameProfileBadge";
import { type MatchEvent as HalfMatchEvent } from "@/lib/halfComparisonEngine";

// ============================================
// TYPES
// ============================================

interface MatchPlayer {
  id: string;
  player_id: string;
  started: boolean;
  minutes_played: number | null;
  position_template: string;
  player?: {
    id: string;
    full_name: string;
    position: string;
    photo_url: string | null;
  } | null;
}

interface PlayerStatsMap {
  [playerId: string]: MatchStatsInput | undefined;
}

interface MatchEventForHalf {
  minute?: number | null;
  game_time_seconds?: number | null;
  half?: number | null;
  period?: number | null;
  event_type: string;
  player_id: string;
  value?: number;
  count_in_stats?: boolean;
  event_status?: string;
}

interface PostGameInsightsCardProps {
  matchPlayers: MatchPlayer[];
  playerStatsMap: PlayerStatsMap;
  matchStatus: string;
  matchDuration?: number;
  matchId: string;
  seasonYear?: number;
  /** Match events for half comparison (optional) */
  matchEvents?: MatchEventForHalf[];
}

// ============================================
// HEATMAP MAP CARD (for exclusive heatmaps section)
// ============================================

interface HeatmapCardProps {
  player: MatchPlayer;
  analysis: PostGameAnalysis;
  matchId: string;
  seasonYear: number;
}

function HeatmapCard({ player, analysis, matchId, seasonYear }: HeatmapCardProps) {
  if (!player.player) return null;

  const positionColor = getPositionColor(player.player.position);
  const shortPos = getShortPosition(player.player.position);

  // Fetch zone history for deviation calculation (read-only)
  const { data: previousGames = [] } = usePlayerZoneHistory({
    playerId: player.player_id,
    seasonYear,
    currentMatchId: matchId,
    playerPosition: player.player.position,
    enabled: true,
  });

  // Calculate deviation (in-memory, no DB writes)
  const deviationResult: ZoneDeviationResult = useMemo(() => {
    return calculateZoneDeviation(
      analysis.zoneHeatmap.percentages,
      previousGames,
      matchId
    );
  }, [analysis.zoneHeatmap.percentages, previousGames, matchId]);

  return (
    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/40 flex flex-col items-center">
      {/* Player Header */}
      <div className="flex items-center gap-2 mb-3 w-full">
        <Avatar className="h-8 w-8">
          <AvatarImage src={player.player.photo_url || undefined} />
          <AvatarFallback className="text-[10px] bg-zinc-800">
            {player.player.full_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{player.player.full_name}</p>
          <Badge 
            variant="outline" 
            className={cn("text-[9px] px-1 py-0", positionColor.textClass, positionColor.borderClass)}
          >
            {shortPos}
          </Badge>
        </div>
      </div>

      {/* Mini Field Heatmap - Main Visual Element (full width) */}
      <MiniFieldHeatmap 
        percentages={analysis.zoneHeatmap.percentages}
        matchId={matchId}
        playerId={player.player_id}
        showLegend={true}
        showIntensityBars={true}
      />

      {/* Zone Deviation Badge (only shows if deviation >= 10% and >= 3 previous games) */}
      <ZoneDeviationBadge result={deviationResult} compact />
    </div>
  );
}

// ============================================
// QUICK INDICATORS COMPONENT
// ============================================

interface QuickIndicatorsDisplayProps {
  indicators: QuickIndicator[];
}

function QuickIndicatorsDisplay({ indicators }: QuickIndicatorsDisplayProps) {
  if (indicators.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {indicators.slice(0, 4).map((indicator) => (
        <div 
          key={indicator.id}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]",
            "border",
            indicator.type === "positive" && "border-emerald-500/30 bg-emerald-500/5",
            indicator.type === "neutral" && "border-zinc-600/30 bg-zinc-800/30",
            indicator.type === "negative" && "border-red-500/30 bg-red-500/5"
          )}
        >
          <span className="text-xs">{indicator.icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-muted-foreground truncate text-[9px]">{indicator.label}</span>
            <span className={cn(
              "font-semibold",
              indicator.type === "positive" && "text-emerald-400",
              indicator.type === "neutral" && "text-zinc-300",
              indicator.type === "negative" && "text-red-400"
            )}>
              {indicator.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// STRENGTHS / IMPROVEMENTS COMPONENT
// ============================================

interface StrengthsImprovementsDisplayProps {
  strengths: string[];
  improvements: string[];
}

function StrengthsImprovementsDisplay({ strengths, improvements }: StrengthsImprovementsDisplayProps) {
  if (strengths.length === 0 && improvements.length === 0) return null;

  return (
    <div className="space-y-2 text-[11px]">
      {strengths.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span className="font-medium">Pontos Fortes</span>
          </div>
          <ul className="space-y-0.5 text-muted-foreground pl-4">
            {strengths.slice(0, 2).map((s, i) => (
              <li key={i} className="truncate">• {s}</li>
            ))}
          </ul>
        </div>
      )}
      
      {improvements.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span className="font-medium">A Melhorar</span>
          </div>
          <ul className="space-y-0.5 text-muted-foreground pl-4">
            {improvements.slice(0, 2).map((s, i) => (
              <li key={i} className="truncate">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// PLAYER SUMMARY ROW (NO heatmap - only insights)
// ============================================

interface PlayerSummaryRowProps {
  player: MatchPlayer;
  analysis: PostGameAnalysis;
  matchId: string;
  seasonYear: number;
  /** Player-specific events for half comparison */
  playerEvents: MatchEventForHalf[];
  /** Aggregated stats for this player */
  playerStats: MatchStatsInput;
}

function PlayerSummaryRow({ player, analysis, matchId, seasonYear, playerEvents, playerStats }: PlayerSummaryRowProps) {
  if (!player.player) return null;

  const positionColor = getPositionColor(player.player.position);
  const shortPos = getShortPosition(player.player.position);

  // Fetch zone history for deviation calculation (read-only)
  const { data: previousGames = [] } = usePlayerZoneHistory({
    playerId: player.player_id,
    seasonYear,
    currentMatchId: matchId,
    playerPosition: player.player.position,
    enabled: true,
  });

  // Calculate deviation (in-memory, no DB writes)
  const deviationResult: ZoneDeviationResult = useMemo(() => {
    return calculateZoneDeviation(
      analysis.zoneHeatmap.percentages,
      previousGames,
      matchId
    );
  }, [analysis.zoneHeatmap.percentages, previousGames, matchId]);

  return (
    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/40 space-y-3">
      {/* Player Header */}
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={player.player.photo_url || undefined} />
          <AvatarFallback className="text-[10px]">
            {player.player.full_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{player.player.full_name}</p>
          <Badge 
            variant="outline" 
            className={cn("text-[9px] px-1 py-0", positionColor.textClass, positionColor.borderClass)}
          >
            {shortPos}
          </Badge>
        </div>
      </div>

      {/* Game Profile Badge - Cluster classification */}
      <PlayerGameProfileBadge
        position={player.player.position}
        stats={playerStats}
        minutesPlayed={player.minutes_played ?? 90}
        zoneDistribution={analysis.zoneHeatmap.percentages}
        compact
      />

      {/* Performance Profile Insight - Contextual text about deviation */}
      <PerformanceProfileInsight deviationResult={deviationResult} />

      {/* Half Comparison - 1st vs 2nd half zone evolution */}
      <PlayerHalfComparison
        position={player.player.position}
        events={playerEvents as HalfMatchEvent[]}
        playerStats={playerStats}
        compact
      />

      {/* Quick Indicators */}
      <QuickIndicatorsDisplay indicators={analysis.quickIndicators} />
      
      {/* Strengths / Improvements */}
      <StrengthsImprovementsDisplay 
        strengths={analysis.strengthsImprovements.strengths}
        improvements={analysis.strengthsImprovements.improvements}
      />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PostGameInsightsCard({
  matchPlayers,
  playerStatsMap,
  matchStatus,
  matchDuration = 90,
  matchId,
  seasonYear = new Date().getFullYear(),
  matchEvents = [],
}: PostGameInsightsCardProps) {
  // Only show for finished/applied matches
  const showInsights = matchStatus === "finished" || matchStatus === "applied";
  
  // Generate analysis for each player
  const playerAnalyses = useMemo(() => {
    if (!showInsights) return [];
    
    return matchPlayers
      .filter((mp) => mp.player && !mp.player_id.startsWith("removed"))
      .map((mp) => {
        const stats = playerStatsMap[mp.player_id] ?? {};
        const minutesPlayed = mp.minutes_played ?? matchDuration;
        const position = mp.player?.position ?? "Meio";
        
        const analysis = generatePostGameAnalysis(position, stats, minutesPlayed);
        
        return {
          player: mp,
          analysis,
          // Sort by total indicators quality
          sortScore: analysis.quickIndicators.filter(i => i.type === "positive").length * 2 +
                     analysis.strengthsImprovements.strengths.length -
                     analysis.strengthsImprovements.improvements.length,
        };
      })
      .sort((a, b) => b.sortScore - a.sortScore);
  }, [matchPlayers, playerStatsMap, showInsights, matchDuration]);
  
  if (!showInsights || playerAnalyses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* SECTION 1: Mapas de Calor da Partida */}
      {/* ============================================ */}
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
            Mapas de Calor da Partida
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Distribuição de atuação por zonas do campo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Responsive Grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playerAnalyses.map(({ player, analysis }) => (
              <HeatmapCard
                key={player.id}
                player={player}
                analysis={analysis}
                matchId={matchId}
                seasonYear={seasonYear}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* SECTION 2: Resumo por Jogador */}
      {/* ============================================ */}
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
            Resumo por Jogador
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Indicadores rápidos e pontos-chave
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="h-[400px] sm:h-[480px]">
            <div className="space-y-3 pr-3">
              {playerAnalyses.map(({ player, analysis }) => {
                // Filter events for this specific player
                const playerEvents = matchEvents.filter(e => e.player_id === player.player_id);
                const playerStats = playerStatsMap[player.player_id] ?? {};
                
                return (
                  <PlayerSummaryRow
                    key={player.id}
                    player={player}
                    analysis={analysis}
                    matchId={matchId}
                    seasonYear={seasonYear}
                    playerEvents={playerEvents}
                    playerStats={playerStats}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
