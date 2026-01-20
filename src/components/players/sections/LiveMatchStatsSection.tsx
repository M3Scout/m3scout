/**
 * LiveMatchStatsSection - Stats derived from Live Match events (Single Source of Truth)
 * 
 * This component displays player statistics aggregated from the live match system.
 * It uses usePlayerMatchStats hook which derives all data from match_player_stats,
 * ensuring consistency with the Match Review screen.
 * 
 * Now includes match ratings history with SofaScore-style ratings.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Activity,
  BarChart3,
  Loader2,
  Clock,
  Target,
  Trophy,
  Users,
  Star,
} from "lucide-react";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import { toOutfieldStatsFormat } from "@/hooks/usePlayerMatchStats";
import { OutfieldPlayerStats } from "@/components/players/stats/OutfieldPlayerStats";
import { getRatingBgColor, getRatingColor } from "@/lib/matchRatingEngine";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface LiveMatchStatsSectionProps {
  playerId: string;
  playerPosition?: string;
}

const currentYear = new Date().getFullYear();

export function LiveMatchStatsSection({ playerId, playerPosition }: LiveMatchStatsSectionProps) {
  // Note: playerPosition kept for future GK-specific rendering
  const { 
    matches, 
    totals, 
    bySeason, 
    averageRating,
    bestMatch,
    recentTrend,
    isLoading 
  } = usePlayerMatchRatings({
    playerId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5" />
            Estatísticas de Partidas Ao Vivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma partida ao vivo registrada para este jogador.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Convert to format expected by OutfieldPlayerStats
  const statsFormat = toOutfieldStatsFormat(totals);

  // Get season years available
  const seasons = Object.keys(bySeason).map(Number).sort((a, b) => b - a);

  // Matches with ratings for display
  const ratedMatches = matches.filter(m => m.rating.hasRating);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5" />
              Estatísticas de Partidas Ao Vivo
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Fonte Única
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick stats row - now includes average rating */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <QuickStat 
              icon={<Trophy className="w-4 h-4" />} 
              label="Jogos" 
              value={totals.matches} 
            />
            <QuickStat 
              icon={<Clock className="w-4 h-4" />} 
              label="Minutos" 
              value={totals.minutes} 
            />
            <QuickStat 
              icon={<Target className="w-4 h-4" />} 
              label="Gols" 
              value={totals.goals} 
              highlight 
            />
            <QuickStat 
              icon={<Users className="w-4 h-4" />} 
              label="Assist." 
              value={totals.assists} 
            />
            {/* Average Rating */}
            {averageRating !== null && (
              <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-1" />
                <span className={cn(
                  "text-lg font-bold",
                  getRatingColor(averageRating)
                )}>
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-[10px] text-muted-foreground">Média</span>
              </div>
            )}
          </div>

          {/* Season tabs */}
          {seasons.length > 1 && (
            <div className="mb-4">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {seasons.map((year) => (
                    <Badge 
                      key={year} 
                      variant={year === currentYear ? "default" : "outline"}
                      className="whitespace-nowrap"
                    >
                      {year}: {bySeason[year]?.matches || 0} jogos
                    </Badge>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Full stats display */}
          {/* Stats display - using OutfieldPlayerStats format for all */}
          <OutfieldPlayerStats stats={statsFormat} />
        </CardContent>
      </Card>

      {/* Match-by-match breakdown with ratings */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5" />
              Histórico de Partidas ({matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {matches.map((match) => (
                  <Link 
                    key={match.match_id}
                    to={`/app/live-match/${match.match_id}/review`}
                    className="block"
                  >
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            vs {match.opponent_name}
                          </span>
                          {match.competition_name && (
                            <Badge variant="outline" className="text-xs truncate max-w-[100px]">
                              {match.competition_name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {/* Minutes */}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {match.minutes_played}'
                        </span>
                        
                        {/* Goals/Assists badges */}
                        {match.stats.goals > 0 && (
                          <Badge variant="default" className="bg-green-600 text-xs h-5">
                            {match.stats.goals}G
                          </Badge>
                        )}
                        {match.stats.assists > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {match.stats.assists}A
                          </Badge>
                        )}
                        
                        {/* Rating Badge */}
                        {match.rating.hasRating ? (
                          <div className={cn(
                            "px-2 py-0.5 rounded text-white text-xs font-bold min-w-[36px] text-center",
                            getRatingBgColor(match.rating.rating!)
                          )}>
                            {match.rating.rating!.toFixed(1)}
                          </div>
                        ) : (
                          <div className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs font-medium">
                            —
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component for quick stats
function QuickStat({ 
  icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center p-2 rounded-lg",
      highlight ? "bg-primary/10" : "bg-muted/50"
    )}>
      <div className={cn(
        "mb-1",
        highlight ? "text-primary" : "text-muted-foreground"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-lg font-bold",
        highlight && "text-primary"
      )}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
