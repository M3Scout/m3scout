import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If no history, show message
  const safeHistory = Array.isArray(history) ? history : [];
  if (safeHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5" />
            Evolução da Nota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem histórico de evolução ainda</p>
            <p className="text-xs mt-1">O gráfico será atualizado conforme as estatísticas mudam</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = safeHistory.map((entry) => ({
    date: format(new Date(entry.recorded_at), "dd/MM", { locale: ptBR }),
    fullDate: format(new Date(entry.recorded_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    rating: Number(entry.rating),
  }));

  // Calculate trend
  const firstRating = safeHistory[0]?.rating ?? 0;
  const lastRating = safeHistory.length > 0 ? (safeHistory[safeHistory.length - 1]?.rating ?? 0) : 0;
  const trend = lastRating - firstRating;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-500" : trend < 0 ? "text-destructive" : "text-muted-foreground";

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{payload[0].payload.fullDate}</p>
          <p className="text-lg font-bold text-primary">
            {formatFixed(payload[0].value, 1)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5" />
          Evolução da Nota
        </CardTitle>
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span>
            {trend > 0 ? "+" : ""}
            {formatFixed(trend, 1)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={2.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                activeDot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>
            Primeira nota: <strong className="text-foreground">{formatFixed(firstRating, 1)}</strong>
          </span>
          <span>
            Última nota: <strong className="text-foreground">{formatFixed(lastRating, 1)}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
