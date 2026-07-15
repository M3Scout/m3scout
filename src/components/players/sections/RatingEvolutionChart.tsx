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
import { RATING_SCALE_CUTOVER } from "@/lib/ratingScale";

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

// ── Cor por nota (escala M3 0-100, mesma paleta do Market Score) ─────────────
function getMatchRatingColor(rating: number): string {
  if (rating >= 85) return "#2DCE8A"; // elite
  if (rating >= 70) return "#4ade80"; // alto
  if (rating >= 50) return "#E8C84A"; // médio
  if (rating >= 30) return "#f97316"; // baixo
  return "#ef4444";                   // muito baixo
}

// ── Dot customizado com badge flutuante ───────────────────────────────────────
const CustomDot = (props: any) => {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined || value === undefined) return null;

  const color   = getMatchRatingColor(value);
  const label   = Number(value).toFixed(1);
  const bW      = 30;
  const bH      = 16;
  const bX      = cx - bW / 2;
  const bY      = cy - 32;

  return (
    <g>
      {/* Badge acima do ponto */}
      <rect x={bX} y={bY} width={bW} height={bH} rx={3} fill={color} />
      <text
        x={cx}
        y={bY + bH / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fontWeight="bold"
        fill="#ffffff"
      >
        {label}
      </text>
      {/* Círculo no ponto */}
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#09090b" strokeWidth={1.5} />
    </g>
  );
};

// ── Tooltip customizado ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  const color = getMatchRatingColor(value);
  return (
    <div className="bg-zinc-900/95 border border-zinc-800/60 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
        {payload[0].payload.fullDate}
      </p>
      <p className="text-2xl font-bold" style={{ color }}>
        {formatFixed(value, 1)}
      </p>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export function RatingEvolutionChart({ playerId, currentRating }: RatingEvolutionChartProps) {
  const [history, setHistory] = useState<RatingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, [playerId]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("player_rating_history")
      .select("*")
      .eq("player_id", playerId)
      // Only the current 0-99 scale — see RATING_SCALE_CUTOVER for why.
      .gte("recorded_at", RATING_SCALE_CUTOVER)
      .order("recorded_at", { ascending: true });

    setHistory(Array.isArray(data) ? data : []);
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

  const safeHistory = Array.isArray(history) ? history : [];

  if (safeHistory.length === 0) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
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
            <p className="text-[11px] text-zinc-700 mt-1">
              O gráfico será atualizado conforme as estatísticas mudam
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = safeHistory.map((entry) => ({
    date:     format(new Date(entry.recorded_at), "dd/MM", { locale: ptBR }),
    fullDate: format(new Date(entry.recorded_at), "dd/MM/yyyy", { locale: ptBR }),
    rating:   Number(entry.rating),
  }));

  const firstRating = safeHistory[0]?.rating ?? 0;
  const lastRating  = safeHistory[safeHistory.length - 1]?.rating ?? 0;
  const trend       = lastRating - firstRating;

  const TrendIcon  = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-400/90" : trend < 0 ? "text-rose-400/90" : "text-zinc-500";
  const trendBg    = trend > 0
    ? "bg-emerald-500/[0.08] border-emerald-500/20"
    : trend < 0
    ? "bg-rose-500/[0.08] border-rose-500/20"
    : "bg-zinc-800/40 border-zinc-700/40";

  const lastColor = getMatchRatingColor(lastRating);

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
          className={cn("text-[10px] font-semibold border backdrop-blur-sm", trendBg, trendColor)}
        >
          <TrendIcon className="w-3 h-3 mr-1" />
          {trend > 0 ? "+" : ""}{formatFixed(trend, 1)}
        </Badge>
      </CardHeader>

      <CardContent>
        {/* Gráfico — margem top alta para as badges não serem cortadas */}
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 36, right: 12, bottom: 0, left: -25 }}
            >
              <defs>
                <linearGradient id="rating-evolution-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={lastColor} stopOpacity={0.45} />
                  <stop offset="60%"  stopColor={lastColor} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={lastColor} stopOpacity={0} />
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
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                stroke="transparent"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(240,5%,40%)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Linha de referência na nota 50 (limiar "Médio") */}
              <ReferenceLine
                y={50}
                stroke="hsl(240,5%,22%)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke={lastColor}
                strokeWidth={2}
                fill="url(#rating-evolution-gradient)"
                dot={<CustomDot />}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Inicial</span>
            <span className="text-sm font-semibold text-zinc-400">
              {formatFixed(firstRating, 1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Atual</span>
            <span className="text-sm font-bold" style={{ color: lastColor }}>
              {formatFixed(lastRating, 1)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
