import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ChevronRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MatchWithRating {
  id: string;
  match_date: string;
  opponent_name: string;
  team_name_display?: string | null; // Home team name
  rating: number | null;
  hasRating: boolean;
}

interface AthleteRatingEvolutionCardProps {
  matches: MatchWithRating[];
  athleteId: string;
  averageRating: number | null;
  recentTrend: "up" | "down" | "stable";
}

const getRatingColor = (rating: number): string => {
  if (rating >= 8.0) return "text-emerald-400";
  if (rating >= 7.0) return "text-blue-400";
  if (rating >= 6.0) return "text-amber-400";
  return "text-red-400";
};

const getRatingBg = (rating: number): string => {
  if (rating >= 8.0) return "bg-emerald-500/20";
  if (rating >= 7.0) return "bg-blue-500/20";
  if (rating >= 6.0) return "bg-amber-500/20";
  return "bg-red-500/20";
};

// Build full matchup string: "Home vs Away" or fallback
const getMatchupDisplay = (teamName: string | null | undefined, opponentName: string): string => {
  if (teamName && teamName.trim()) {
    return `${teamName} vs ${opponentName}`;
  }
  return `vs ${opponentName}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs font-medium text-foreground">{data.matchup}</p>
        <p className="text-[10px] text-muted-foreground">{data.fullDate}</p>
        <p className={`text-sm font-bold mt-1 ${getRatingColor(data.rating)}`}>
          Nota: {data.rating.toFixed(1)}
        </p>
      </div>
    );
  }
  return null;
};

export function AthleteRatingEvolutionCard({
  matches,
  athleteId,
  averageRating,
  recentTrend,
}: AthleteRatingEvolutionCardProps) {
  const chartData = useMemo(() => {
    return matches
      .filter((m) => m.hasRating && m.rating !== null)
      .slice(0, 10)
      .reverse()
      .map((match) => ({
        id: match.id,
        date: format(new Date(match.match_date), "dd/MM", { locale: ptBR }),
        fullDate: format(new Date(match.match_date), "dd 'de' MMM", { locale: ptBR }),
        opponent: match.opponent_name,
        matchup: getMatchupDisplay(match.team_name_display, match.opponent_name),
        rating: match.rating,
      }));
  }, [matches]);

  const recentMatches = useMemo(() => {
    return matches
      .filter((m) => m.hasRating && m.rating !== null)
      .slice(0, 5);
  }, [matches]);

  const trendLabel = recentTrend === "up" ? "Em Alta" : recentTrend === "down" ? "Em Baixa" : "Estável";
  const trendColor = recentTrend === "up" ? "success" : recentTrend === "down" ? "destructive" : "secondary";

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.35 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col flex-1"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-blue-500/20 to-violet-600/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Evolução da Nota</h2>
            <p className="text-[10px] text-muted-foreground">Últimas {chartData.length} partidas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {averageRating !== null && (
            <Badge variant="outline" className="text-[10px] border-zinc-700">
              Média: {averageRating.toFixed(1)}
            </Badge>
          )}
          <Badge variant={trendColor} className="text-[10px]">
            {trendLabel}
          </Badge>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-4 flex-1">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                domain={[5, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={7} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.3} />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#ratingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            Dados insuficientes para gráfico
          </div>
        )}
      </div>

      {/* Recent Matches List */}
      <div className="px-4 pb-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Últimos 5 jogos</p>
        <div className="space-y-1.5">
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => (
              <Link
                key={match.id}
                to={`/dashboard/aovivo/${match.id}/review`}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(match.match_date), "dd/MM", { locale: ptBR })}
                  </span>
                  <span className="text-xs text-foreground truncate">
                    {getMatchupDisplay(match.team_name_display, match.opponent_name)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-sm font-bold ${getRatingColor(match.rating!)}`}>
                    {match.rating!.toFixed(1)}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma partida com nota registrada
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
