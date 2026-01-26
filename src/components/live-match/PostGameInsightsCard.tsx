/**
 * Post-Game Insights Card
 * 
 * Displays 3 derived analysis blocks for finished matches:
 * 1. Zone Heatmap (simplified field zones)
 * 2. Quick Indicators (micro-insights)
 * 3. Strengths / Areas to Improve
 * 
 * Only renders when match is finished or applied.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generatePostGameAnalysis,
  type PostGameAnalysis,
  type QuickIndicator,
  type MatchStatsInput,
} from "@/lib/postGameAnalysis";
import { getShortPosition, getPositionColor } from "@/lib/positionColors";
import { MiniFieldHeatmap } from "./MiniFieldHeatmap";

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

interface PostGameInsightsCardProps {
  matchPlayers: MatchPlayer[];
  playerStatsMap: PlayerStatsMap;
  matchStatus: string;
  matchDuration?: number;
  matchId: string;
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
    <div className="grid grid-cols-2 gap-1.5 mt-2">
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
// PLAYER INSIGHT ROW
// ============================================

interface PlayerInsightRowProps {
  player: MatchPlayer;
  analysis: PostGameAnalysis;
  matchId: string;
}

function PlayerInsightRow({ player, analysis, matchId }: PlayerInsightRowProps) {
  if (!player.player) return null;

  const positionColor = getPositionColor(player.player.position);
  const shortPos = getShortPosition(player.player.position);

  return (
    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/40 space-y-3">
      {/* Header: Player info + Zone Heatmap */}
      <div className="flex items-start gap-3">
        {/* Mini Field Heatmap */}
        <MiniFieldHeatmap 
          percentages={analysis.zoneHeatmap.percentages}
          matchId={matchId}
          playerId={player.player_id}
          width={100}
          height={140}
          showLegend={true}
        />
        
        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-7 w-7">
              <AvatarImage src={player.player.photo_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {player.player.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{player.player.full_name}</p>
              <Badge 
                variant="outline" 
                className={cn("text-[9px] px-1 py-0", positionColor.textClass, positionColor.borderClass)}
              >
                {shortPos}
              </Badge>
            </div>
          </div>
          
          {/* Quick Indicators */}
          <QuickIndicatorsDisplay indicators={analysis.quickIndicators} />
        </div>
      </div>
      
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
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          Análise Pós-Jogo
        </CardTitle>
        <CardDescription className="text-sm mt-1">
          Zonas de atuação, indicadores rápidos e pontos-chave por jogador
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {/* Legend removed - now integrated in MiniFieldHeatmap */}
        <ScrollArea className="h-[450px] sm:h-[520px]">
          <div className="space-y-3 pr-3">
            {playerAnalyses.map(({ player, analysis }) => (
              <PlayerInsightRow
                key={player.id}
                player={player}
                analysis={analysis}
                matchId={matchId}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
