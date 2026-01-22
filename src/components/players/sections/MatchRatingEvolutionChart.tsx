/**
 * Match Rating Evolution Chart - Premium Version
 * 
 * Displays a sophisticated line chart showing how a player's match ratings evolved over time.
 * Can be filtered by season and shows key performance indicators.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlayerMatchRatings, type MatchWithRating } from "@/hooks/usePlayerMatchRatings";
import { getRatingBgColor, getRatingColor } from "@/lib/matchRatingEngine";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Activity, Loader2, Trophy, Target, BarChart3 } from "lucide-react";
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
  isLast?: boolean;
}

// Premium KPI Card Component
const KPICard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  variant = "default" 
}: { 
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  variant?: "default" | "success" | "accent" | "muted";
}) => {
  const variantStyles = {
    default: "from-zinc-900/80 to-zinc-950/80 border-white/[0.04]",
    success: "from-emerald-500/[0.08] via-zinc-900/80 to-zinc-950/80 border-emerald-500/15",
    accent: "from-primary/[0.06] via-zinc-900/80 to-zinc-950/80 border-primary/10",
    muted: "from-zinc-900/60 to-zinc-950/60 border-zinc-800/30",
  };

  const iconStyles = {
    default: "bg-zinc-800/60 text-zinc-500",
    success: "bg-emerald-500/10 text-emerald-400/80",
    accent: "bg-primary/10 text-primary",
    muted: "bg-zinc-800/40 text-zinc-600",
  };

  return (
    <div className={cn(
      "group relative p-4 rounded-xl",
      "bg-gradient-to-br border backdrop-blur-sm",
      "transition-all duration-200",
      "hover:border-white/[0.08]",
      variantStyles[variant]
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconStyles[variant])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-0.5">{label}</p>
          <div className="text-xl font-bold text-white leading-none">{value}</div>
          {subValue && <p className="text-[10px] text-zinc-600 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

// Premium Tooltip
const PremiumTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const ratingColor = getRatingColor(data.rating);
    
    return (
      <div className="bg-zinc-900/95 border border-zinc-800/60 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        {/* Rating Badge */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-lg font-bold",
            getRatingBgColor(data.rating),
            "text-white"
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
        
        {/* Match Info */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-200">vs {data.opponent}</p>
          {data.competition && (
            <p className="text-xs text-zinc-500">{data.competition}</p>
          )}
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-2">{data.dateFormatted}</p>
        </div>
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

    return sorted.map((match, idx): ChartDataPoint => ({
      date: match.match_date,
      dateFormatted: format(new Date(match.match_date), "dd MMM yyyy", { locale: ptBR }),
      rating: match.rating.rating!,
      opponent: match.opponent_name,
      competition: match.competition_name,
      matchId: match.match_id,
      isLast: idx === sorted.length - 1,
    }));
  }, [matches]);

  // Available seasons
  const availableSeasons = useMemo(() => {
    return Object.keys(ratingsBySeason)
      .map(Number)
      .sort((a, b) => b - a);
  }, [ratingsBySeason]);

  // Trend info
  const trendInfo = useMemo(() => {
    if (recentTrend === "up") return { icon: TrendingUp, color: "text-emerald-400/90", bg: "bg-emerald-500/[0.08] border-emerald-500/20", label: "Em Alta" };
    if (recentTrend === "down") return { icon: TrendingDown, color: "text-rose-400/90", bg: "bg-rose-500/[0.08] border-rose-500/20", label: "Em Baixa" };
    return { icon: Minus, color: "text-zinc-500", bg: "bg-zinc-800/40 border-zinc-700/40", label: "Estável" };
  }, [recentTrend]);

  if (isLoading) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Evolução das Notas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-900/60 flex items-center justify-center">
              <Activity className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600">Nenhuma partida com nota disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trendInfo.icon;

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Evolução das Notas
            </span>
          </CardTitle>
          {availableSeasons.length > 1 && (
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-[110px] h-8 bg-zinc-900/50 border-zinc-800/60 text-xs">
                <SelectValue placeholder="Temporada" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
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
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Premium KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard
            icon={BarChart3}
            label="Média"
            value={averageRating !== null ? (
              <span className={getRatingColor(averageRating)}>{averageRating.toFixed(1)}</span>
            ) : "—"}
            variant="accent"
          />
          <KPICard
            icon={Target}
            label="Jogos"
            value={chartData.length}
            variant="muted"
          />
          <KPICard
            icon={Trophy}
            label="Melhor"
            value={bestMatch ? (
              <span className={getRatingColor(bestMatch.rating.rating!)}>{bestMatch.rating.rating!.toFixed(1)}</span>
            ) : "—"}
            subValue={bestMatch ? `vs ${bestMatch.opponent_name}` : undefined}
            variant="success"
          />
          <KPICard
            icon={TrendIcon}
            label="Tendência"
            value={
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-semibold border backdrop-blur-sm px-2 py-0.5",
                  trendInfo.bg,
                  trendInfo.color
                )}
              >
                {trendInfo.label}
              </Badge>
            }
            variant="default"
          />
        </div>

        {/* Premium Chart */}
        <div className="h-[220px] w-full -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="matchRatingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              {/* Subtle grid */}
              <XAxis
                dataKey="dateFormatted"
                stroke="transparent"
                tick={{ fontSize: 9, fill: "hsl(240,5%,40%)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 10]}
                ticks={[2, 4, 6, 8, 10]}
                stroke="transparent"
                tick={{ fontSize: 9, fill: "hsl(240,5%,40%)" }}
                tickLine={false}
                axisLine={false}
              />
              
              <Tooltip content={<PremiumTooltip />} />
              
              {/* Rating zone reference lines - very subtle */}
              <ReferenceLine y={6} stroke="hsl(240,5%,25%)" strokeDasharray="4 4" strokeWidth={1} />
              <ReferenceLine y={7} stroke="hsl(142,60%,35%)" strokeDasharray="4 4" strokeWidth={1} opacity={0.3} />
              
              {/* Average line */}
              {averageRating !== null && (
                <ReferenceLine 
                  y={averageRating} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="6 4" 
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )}
              
              {/* Area fill */}
              <Area
                type="monotone"
                dataKey="rating"
                stroke="none"
                fill="url(#matchRatingGradient)"
              />
              
              {/* Main line - stronger and elegant */}
              <Line
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const isLast = payload.isLast;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={isLast ? 6 : 4} 
                      fill={isLast ? "hsl(var(--primary))" : "hsl(var(--background))"}
                      stroke="hsl(var(--primary))"
                      strokeWidth={isLast ? 0 : 2}
                    />
                  );
                }}
                activeDot={{ 
                  r: 7, 
                  fill: "hsl(var(--primary))", 
                  stroke: "hsl(var(--background))", 
                  strokeWidth: 3 
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Season Breakdown */}
        {selectedSeason === "all" && availableSeasons.length > 1 && (
          <div className="pt-4 border-t border-zinc-800/40">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-3">Por Temporada</p>
            <div className="flex flex-wrap gap-2">
              {availableSeasons.map((year) => {
                const data = ratingsBySeason[year];
                if (!data) return null;
                return (
                  <Badge 
                    key={year} 
                    variant="outline" 
                    className="flex items-center gap-2 bg-zinc-900/40 border-zinc-800/40 text-zinc-300 px-3 py-1.5"
                  >
                    <span className="font-semibold">{year}</span>
                    <span className="w-px h-3 bg-zinc-700" />
                    <span className={cn("font-bold", getRatingColor(data.averageRating))}>
                      {data.averageRating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      ({data.matches})
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
