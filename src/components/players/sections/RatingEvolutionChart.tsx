import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatFixed } from "@/lib/formatters";

interface RatingHistoryEntry {
  id: string;
  player_id: string;
  rating: number;
  recorded_at: string;
}

interface RatingEvolutionChartProps {
  playerId: string;
  currentRating: number | null;
}

export function RatingEvolutionChart({ playerId, currentRating }: RatingEvolutionChartProps) {
  const [history, setHistory] = useState<RatingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [playerId]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("player_rating_history")
      .select("*")
      .eq("player_id", playerId)
      .order("recorded_at", { ascending: true });

    if (Array.isArray(data)) {
      setHistory(data);
    } else {
      setHistory([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
        </CardContent>
      </Card>
    );
  }

  // If no history, show message
  const safeHistory = Array.isArray(history) ? history : [];
  if (safeHistory.length === 0) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Evolução da Nota
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-900/60 flex items-center justify-center">
              <Activity className="w-6 h-6 text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-600">Sem histórico de evolução ainda</p>
            <p className="text-[11px] text-zinc-700 mt-1">O gráfico será atualizado conforme as estatísticas mudam</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = safeHistory.map((entry) => ({
    date: format(new Date(entry.recorded_at), "dd/MM", { locale: ptBR }),
    fullDate: format(new Date(entry.recorded_at), "dd/MM/yyyy", { locale: ptBR }),
    rating: Number(entry.rating),
  }));

  // Calculate trend
  const firstRating = safeHistory[0]?.rating ?? 0;
  const lastRating = safeHistory.length > 0 ? (safeHistory[safeHistory.length - 1]?.rating ?? 0) : 0;
  const trend = lastRating - firstRating;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-400/90" : trend < 0 ? "text-rose-400/90" : "text-zinc-500";
  const trendBg = trend > 0 ? "bg-emerald-500/[0.08] border-emerald-500/20" : 
                  trend < 0 ? "bg-rose-500/[0.08] border-rose-500/20" : 
                  "bg-zinc-800/40 border-zinc-700/40";

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 border border-zinc-800/60 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-2xl font-bold text-white">
            {formatFixed(payload[0].value, 1)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-cyan-400/80" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Evolução da Nota
          </span>
        </CardTitle>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] font-semibold border backdrop-blur-sm",
            trendBg,
            trendColor
          )}
        >
          <TrendIcon className="w-3 h-3 mr-1" />
          {trend > 0 ? "+" : ""}{formatFixed(trend, 1)}
        </Badge>
      </CardHeader>
      <CardContent>
        {/* Chart - Sophisticated, focus on curve */}
        <div className="h-36 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="transparent"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(240,5%,40%)" }}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                stroke="transparent"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(240,5%,40%)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={2.5} 
                stroke="hsl(240,5%,25%)" 
                strokeDasharray="4 4" 
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#ratingGradient)"
                dot={false}
                activeDot={{ 
                  r: 5, 
                  fill: "hsl(var(--primary))", 
                  strokeWidth: 2,
                  stroke: "hsl(var(--background))"
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary - Clean footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Inicial</span>
            <span className="text-sm font-semibold text-zinc-400">{formatFixed(firstRating, 1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Atual</span>
            <span className="text-sm font-semibold text-white">{formatFixed(lastRating, 1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
