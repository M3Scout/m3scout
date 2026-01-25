/**
 * Card that displays all player ratings for a match.
 * Shows players sorted by rating (highest first).
 * 
 * Uses the matchRatingEngine and displays the SofaScore-style ratings.
 * Now includes Match Profile (Perfil do Jogo) - qualitative performance interpretation.
 * Also includes Match Efficiency (Eficiência no Jogo) - quality vs risk indicator.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerRatingBadge } from "./PlayerRatingBadge";
import { MatchProfileText } from "./MatchProfileBadge";
import { MatchEfficiencyBadge } from "./MatchEfficiencyBadge";
import { useSortedPlayersByRating, type MatchPlayer } from "@/hooks/useMatchRatings";
import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import { matchPlayerStatsToInput } from "@/lib/matchRatingEngine";
import { classifyMatchProfile } from "@/lib/matchProfileEngine";
import { calculateMatchEfficiency } from "@/lib/matchEfficiencyEngine";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchRatingsCardProps {
  matchPlayers: MatchPlayer[];
  playerStatsMap: Record<string, MatchPlayerStats>;
  matchStatus: "draft" | "live" | "finished" | "applied";
}

export function MatchRatingsCard({
  matchPlayers,
  playerStatsMap,
  matchStatus,
}: MatchRatingsCardProps) {
  const sortedPlayers = useSortedPlayersByRating(matchPlayers, playerStatsMap);
  
  // Only show ratings after match is finished or applied
  const showRatings = matchStatus === "finished" || matchStatus === "applied";
  
  // Filter players with valid ratings (played > 0 minutes)
  const playersWithRatings = useMemo(() => 
    sortedPlayers.filter(p => p.rating.hasRating),
    [sortedPlayers]
  );
  
  // Calculate team average (only from players who actually played)
  const teamAverage = useMemo(() => {
    if (playersWithRatings.length === 0) return 0;
    const sum = playersWithRatings.reduce((acc, p) => acc + (p.rating.rating ?? 0), 0);
    return Math.round((sum / playersWithRatings.length) * 10) / 10;
  }, [playersWithRatings]);
  
  // Best and worst ratings (only from players who played)
  const bestPlayer = playersWithRatings[0];
  const worstPlayer = playersWithRatings[playersWithRatings.length - 1];
  
  if (!showRatings) {
    return null;
  }
  
  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 fill-amber-400" />
          Notas da Partida
        </CardTitle>
        <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-sm">Avaliação de desempenho individual (0-10)</span>
        {playersWithRatings.length > 0 && (
          <Badge variant="secondary" className="text-xs w-fit">
            Média: {teamAverage.toFixed(1)} ({playersWithRatings.length} jogadores)
          </Badge>
        )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6 p-4 sm:p-6">
        {/* Highlights - only show if we have players who played */}
        {playersWithRatings.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Best Player */}
            {bestPlayer && (
              <div className="flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs uppercase text-emerald-400 font-medium">Destaque</p>
                  <p className="text-sm sm:text-base font-medium truncate">{bestPlayer.playerName.split(" ")[0]}</p>
                </div>
                <PlayerRatingBadge rating={bestPlayer.rating} playerName={bestPlayer.playerName} size="sm" showTooltip={false} showDetailButton={false} />
              </div>
            )}
            
            {/* Needs Improvement */}
            {worstPlayer && worstPlayer.rating.rating !== null && worstPlayer.rating.rating < 6.0 && (
              <div className="flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <TrendingDown className="h-5 w-5 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs uppercase text-orange-400 font-medium">A Evoluir</p>
                  <p className="text-sm sm:text-base font-medium truncate">{worstPlayer.playerName.split(" ")[0]}</p>
                </div>
                <PlayerRatingBadge rating={worstPlayer.rating} playerName={worstPlayer.playerName} size="sm" showTooltip={false} showDetailButton={false} />
              </div>
            )}
            
            {/* If no one is below 6, show average */}
            {worstPlayer && worstPlayer.rating.rating !== null && worstPlayer.rating.rating >= 6.0 && (
              <div className="flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
                <Minus className="h-5 w-5 text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs uppercase text-zinc-400 font-medium">Consistente</p>
                  <p className="text-sm sm:text-base font-medium">Todos ≥ 6.0</p>
                </div>
                <Badge className="bg-zinc-800/60 text-zinc-300 border-zinc-700/40">
                  ✓
                </Badge>
              </div>
            )}
          </div>
        )}
        
        {/* Player List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.playerId}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors",
                  "hover:bg-muted/50",
                  index === 0 && "bg-emerald-500/5 border border-emerald-500/10"
                )}
              >
                {/* Rank */}
                <div className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0",
                  index === 0 && "bg-amber-500 text-black",
                  index === 1 && "bg-zinc-400 text-black",
                  index === 2 && "bg-amber-700 text-white",
                  index > 2 && "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                
                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={player.photoUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {player.playerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Name & Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{player.playerName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{player.position}</span>
                    <span>•</span>
                    <span>{player.minutesInfo.durationDisplay}</span>
                  </div>
                  {/* Match Profile + Efficiency - Perfil e Eficiência do Jogo */}
                  {player.rating.hasRating && (() => {
                    const statsInput = matchPlayerStatsToInput(playerStatsMap[player.playerId]);
                    const profile = classifyMatchProfile(statsInput, player.minutesInfo.minutesPlayed);
                    const efficiency = calculateMatchEfficiency(statsInput, player.minutesInfo.minutesPlayed);
                    return (
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <MatchProfileText profile={profile} showIcon={false} className="text-[9px]" />
                        <MatchEfficiencyBadge efficiency={efficiency} playerName={player.playerName} size="sm" showIcon={true} />
                      </div>
                    );
                  })()}
                </div>
                
                {/* Rating Badge */}
                <PlayerRatingBadge rating={player.rating} playerName={player.playerName} size="md" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
