/**
 * Card that displays all player ratings for a match.
 * Shows players sorted by rating (highest first).
 * 
 * Uses the matchRatingEngine and displays the SofaScore-style ratings.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayerRatingBadge } from "./PlayerRatingBadge";
import { useSortedPlayersByRating, type MatchPlayer } from "@/hooks/useMatchRatings";
import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          Notas da Partida
        </CardTitle>
        <CardDescription className="flex items-center gap-3">
          <span>Avaliação de desempenho individual (0-10)</span>
        {playersWithRatings.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            Média: {teamAverage.toFixed(1)} ({playersWithRatings.length} jogadores)
          </Badge>
        )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Highlights - only show if we have players who played */}
        {playersWithRatings.length >= 2 && (
          <div className="grid grid-cols-2 gap-3">
            {/* Best Player */}
            {bestPlayer && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-emerald-400 font-medium">Destaque</p>
                  <p className="text-sm font-medium truncate">{bestPlayer.playerName.split(" ")[0]}</p>
                </div>
                <PlayerRatingBadge rating={bestPlayer.rating} size="sm" showTooltip={false} />
              </div>
            )}
            
            {/* Needs Improvement */}
            {worstPlayer && worstPlayer.rating.rating !== null && worstPlayer.rating.rating < 6.0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <TrendingDown className="h-4 w-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-orange-400 font-medium">A Evoluir</p>
                  <p className="text-sm font-medium truncate">{worstPlayer.playerName.split(" ")[0]}</p>
                </div>
                <PlayerRatingBadge rating={worstPlayer.rating} size="sm" showTooltip={false} />
              </div>
            )}
            
            {/* If no one is below 6, show average */}
            {worstPlayer && worstPlayer.rating.rating !== null && worstPlayer.rating.rating >= 6.0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Minus className="h-4 w-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase text-blue-400 font-medium">Consistente</p>
                  <p className="text-sm font-medium">Todos ≥ 6.0</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
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
                </div>
                
                {/* Rating Badge */}
                <PlayerRatingBadge rating={player.rating} size="md" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
