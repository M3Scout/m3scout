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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BarChart3, Target, TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generatePostGameAnalysis,
  type PostGameAnalysis,
  type FieldZone,
  type QuickIndicator,
  type MatchStatsInput,
} from "@/lib/postGameAnalysis";
import { getShortPosition, getPositionColor } from "@/lib/positionColors";

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
}

// ============================================
// ZONE HEATMAP COMPONENT
// ============================================

interface ZoneHeatmapMiniProps {
  zones: PostGameAnalysis["zoneHeatmap"];
}

function ZoneHeatmapMini({ zones }: ZoneHeatmapMiniProps) {
  const getZoneColor = (zone: FieldZone, intensity: "low" | "medium" | "high") => {
    const colors = {
      low: "bg-zinc-700/30",
      medium: "bg-emerald-500/40",
      high: "bg-emerald-500/80",
    };
    return colors[intensity];
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Field representation (vertical - attack on top) */}
      <div className="flex flex-col gap-0.5 w-12">
        <TooltipProvider delayDuration={100}>
          {(["attack", "midfield", "defense"] as FieldZone[]).map((zone) => (
            <Tooltip key={zone}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-4 rounded-sm transition-colors",
                    getZoneColor(zone, zones.intensities[zone])
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p className="font-medium capitalize">{zone === "attack" ? "Ataque" : zone === "midfield" ? "Meio" : "Defesa"}</p>
                <p className="text-muted-foreground">{zones.percentages[zone]}%</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      {/* Primary zone label */}
      <span className="text-[9px] text-muted-foreground mt-1">
        {zones.primaryZone === "attack" ? "ATA" : zones.primaryZone === "midfield" ? "MEI" : "DEF"}
      </span>
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
    <div className="flex flex-wrap gap-1.5">
      {indicators.slice(0, 4).map((indicator) => (
        <TooltipProvider key={indicator.id} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0.5 gap-1",
                  indicator.type === "positive" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                  indicator.type === "neutral" && "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
                  indicator.type === "negative" && "border-red-500/40 bg-red-500/10 text-red-400"
                )}
              >
                <span>{indicator.icon}</span>
                <span className="font-medium">{indicator.value}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {indicator.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
}

function PlayerInsightRow({ player, analysis }: PlayerInsightRowProps) {
  if (!player.player) return null;

  const positionColor = getPositionColor(player.player.position);
  const shortPos = getShortPosition(player.player.position);

  return (
    <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/40 space-y-3">
      {/* Header: Player info + Zone Heatmap */}
      <div className="flex items-start gap-3">
        {/* Zone Heatmap */}
        <ZoneHeatmapMini zones={analysis.zoneHeatmap} />
        
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
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-zinc-800/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Zonas:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
              <span>Alta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/40" />
              <span>Média</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-zinc-700/30" />
              <span>Baixa</span>
            </div>
          </div>
        </div>

        {/* Player insights */}
        <ScrollArea className="h-[450px] sm:h-[520px]">
          <div className="space-y-3 pr-3">
            {playerAnalyses.map(({ player, analysis }) => (
              <PlayerInsightRow
                key={player.id}
                player={player}
                analysis={analysis}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
