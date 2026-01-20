/**
 * Match Rating Evolution Chart
 * 
 * Displays a line chart showing how a player's match ratings evolved over time.
 * Can be filtered by season and shows trends.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlayerMatchRatings, type MatchWithRating } from "@/hooks/usePlayerMatchRatings";
import { getRatingBgColor, getRatingColor } from "@/lib/matchRatingEngine";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Star, Loader2, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchRatingEvolutionChartProps {
  playerId: string;
  playerName?: string;
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  rating: number;
  opponent: string;
  competition: string | null;
  matchId: string;
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const ratingColor = getRatingColor(data.rating);
    
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn(
            "px-2 py-0.5 rounded text-white text-sm font-bold",
            getRatingBgColor(data.rating)
          )}>
            {data.rating.toFixed(1)}
          </div>
          <span className={cn("text-sm font-medium", ratingColor)}>
            {data.rating >= 9 ? "Excepcional" :
             data.rating >= 8 ? "Excelente" :
             data.rating >= 7 ? "Muito Bom" :
             data.rating >= 6.5 ? "Bom" :
             data.rating >= 6 ? "Regular" :
             data.rating >= 5 ? "Fraco" : "Muito Fraco"}
          </span>
        </div>
        <p className="text-sm font-medium">vs {data.opponent}</p>
        {data.competition && (
          <p className="text-xs text-muted-foreground">{data.competition}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{data.dateFormatted}</p>
      </div>
    );
  }
  return null;
};

export function MatchRatingEvolutionChart({ playerId, playerName }: MatchRatingEvolutionChartProps) {
  const currentYear = new Date().getFullYear();
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  
  const {
    matches,
    averageRating,
    bestMatch,
    worstMatch,
    ratingsBySeason,
    recentTrend,
    isLoading,
  } = usePlayerMatchRatings({
    playerId,
    seasonYear: selectedSeason !== "all" ? Number(selectedSeason) : undefined,
  });

  // Filter matches with ratings and prepare chart data
  const chartData = useMemo(() => {
    const ratedMatches = matches.filter((m) => m.rating.hasRating);
    
    // Sort by date ascending for chart
    const sorted = [...ratedMatches].sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

    return sorted.map((match): ChartDataPoint => ({
      date: match.match_date,
      dateFormatted: format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR }),
      rating: match.rating.rating!,
      opponent: match.opponent_name,
      competition: match.competition_name,
      matchId: match.match_id,
    }));
  }, [matches]);

  // Available seasons
  const availableSeasons = useMemo(() => {
    return Object.keys(ratingsBySeason)
      .map(Number)
      .sort((a, b) => b - a);
  }, [ratingsBySeason]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-5 h-5 text-amber-400" />
            Evolução das Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma partida com nota disponível.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            Evolução das Notas
          </CardTitle>
          <div className="flex items-center gap-2">
            {availableSeasons.length > 1 && (
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Temporada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availableSeasons.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3">
          {/* Average Rating */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground mb-1">Média</span>
            {averageRating !== null ? (
              <div className={cn(
                "text-lg font-bold",
                getRatingColor(averageRating)
              )}>
                {averageRating.toFixed(1)}
              </div>
            ) : (
              <span className="text-lg font-bold text-muted-foreground">—</span>
            )}
          </div>
          
          {/* Matches */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground mb-1">Jogos</span>
            <span className="text-lg font-bold">{chartData.length}</span>
          </div>
          
          {/* Best */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-green-500/10">
            <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Melhor
            </span>
            {bestMatch ? (
              <div className={cn(
                "text-lg font-bold",
                getRatingColor(bestMatch.rating.rating!)
              )}>
                {bestMatch.rating.rating!.toFixed(1)}
              </div>
            ) : (
              <span className="text-lg font-bold text-muted-foreground">—</span>
            )}
          </div>
          
          {/* Trend */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground mb-1">Tendência</span>
          <div className="flex items-center gap-2">
              <TrendIcon trend={recentTrend as "up" | "down" | "stable"} />
              <span className="text-sm font-medium">
                {recentTrend === "up" ? "↑" : recentTrend === "down" ? "↓" : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for rating zones */}
              <ReferenceLine y={6} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="3 3" opacity={0.3} />
              <ReferenceLine y={8} stroke="#06b6d4" strokeDasharray="3 3" opacity={0.3} />
              
              {/* Average line */}
              {averageRating !== null && (
                <ReferenceLine 
                  y={averageRating} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5" 
                  opacity={0.8}
                  label={{ 
                    value: `Média: ${averageRating.toFixed(1)}`, 
                    position: "right",
                    fontSize: 10,
                    fill: "hsl(var(--primary))"
                  }}
                />
              )}
              
              <Area
                type="monotone"
                dataKey="rating"
                stroke="none"
                fill="url(#ratingGradient)"
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "white", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Season Breakdown */}
        {selectedSeason === "all" && availableSeasons.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Por Temporada</p>
            <div className="flex flex-wrap gap-2">
              {availableSeasons.map((year) => {
                const data = ratingsBySeason[year];
                if (!data) return null;
                return (
                  <Badge 
                    key={year} 
                    variant="outline" 
                    className="flex items-center gap-1.5"
                  >
                    <span className="font-medium">{year}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className={getRatingColor(data.averageRating)}>
                      {data.averageRating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      ({data.matches} jogos)
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
