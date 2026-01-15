import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Activity } from "lucide-react";

interface MatchEvent {
  id: string;
  event_type: string;
  player_id: string;
  minute: number | null;
  half: number | null;
}

interface EventDistributionChartProps {
  matchEvents: MatchEvent[];
  matchDuration: number;
}

// Event types to highlight
const HIGHLIGHT_EVENTS: Record<string, { color: string; label: string }> = {
  goal: { color: "#22c55e", label: "Gols" },
  assist: { color: "#3b82f6", label: "Assistências" },
  yellow: { color: "#eab308", label: "Amarelos" },
  red: { color: "#ef4444", label: "Vermelhos" },
};

export function EventDistributionChart({
  matchEvents,
  matchDuration,
}: EventDistributionChartProps) {
  // Build data points for each minute
  const chartData = useMemo(() => {
    // Create array with all minutes
    const data: Array<{
      minute: number;
      total: number;
      goals: number;
      assists: number;
      yellows: number;
      reds: number;
      offensive: number;
      defensive: number;
    }> = [];

    for (let i = 0; i <= matchDuration; i++) {
      data.push({
        minute: i,
        total: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        offensive: 0,
        defensive: 0,
      });
    }

    // Offensive event types
    const offensiveTypes = [
      "goal", "assist", "shot", "shot_on_target", "key_pass", 
      "chance_created", "dribble_success", "dribble_attempt"
    ];
    
    // Defensive event types
    const defensiveTypes = [
      "tackle", "interception", "recovery", "clearance", 
      "duel_won", "aerial_duel_won", "save", "box_save"
    ];

    // Count events per minute
    matchEvents.forEach((event) => {
      if (event.minute === null || event.minute < 0 || event.minute > matchDuration) return;
      
      const idx = Math.floor(event.minute);
      if (idx >= 0 && idx < data.length) {
        data[idx].total++;
        
        if (event.event_type === "goal") data[idx].goals++;
        if (event.event_type === "assist") data[idx].assists++;
        if (event.event_type === "yellow") data[idx].yellows++;
        if (event.event_type === "red") data[idx].reds++;
        
        if (offensiveTypes.includes(event.event_type)) data[idx].offensive++;
        if (defensiveTypes.includes(event.event_type)) data[idx].defensive++;
      }
    });

    // Apply smoothing (5-minute moving average for total)
    const smoothedData = data.map((point, idx) => {
      const windowSize = 5;
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(data.length - 1, idx + Math.floor(windowSize / 2));
      
      let sum = 0;
      let count = 0;
      for (let i = start; i <= end; i++) {
        sum += data[i].total;
        count++;
      }
      
      return {
        ...point,
        smoothed: count > 0 ? Number((sum / count).toFixed(2)) : 0,
      };
    });

    return smoothedData;
  }, [matchEvents, matchDuration]);

  // Key moments (goals, cards)
  const keyMoments = useMemo(() => {
    return matchEvents
      .filter((e) => 
        e.minute !== null && 
        ["goal", "yellow", "red"].includes(e.event_type)
      )
      .map((e) => ({
        minute: e.minute!,
        type: e.event_type,
        color: HIGHLIGHT_EVENTS[e.event_type]?.color || "#888",
      }));
  }, [matchEvents]);

  // Stats summary
  const stats = useMemo(() => {
    const firstHalfEvents = matchEvents.filter((e) => e.half === 1).length;
    const secondHalfEvents = matchEvents.filter((e) => e.half === 2).length;
    
    // Find peak minute
    let peakMinute = 0;
    let peakCount = 0;
    chartData.forEach((point) => {
      if (point.total > peakCount) {
        peakCount = point.total;
        peakMinute = point.minute;
      }
    });

    return {
      firstHalf: firstHalfEvents,
      secondHalf: secondHalfEvents,
      peakMinute,
      peakCount,
      totalEvents: matchEvents.length,
    };
  }, [matchEvents, chartData]);

  if (matchEvents.length === 0) {
    return null;
  }

  const halfTimeMinute = Math.floor(matchDuration / 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Distribuição de Eventos
        </CardTitle>
        <CardDescription>
          Intensidade do jogo ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            1º Tempo: {stats.firstHalf} eventos
          </Badge>
          <Badge variant="secondary">
            2º Tempo: {stats.secondHalf} eventos
          </Badge>
          <Badge variant="outline">
            Pico: {stats.peakMinute}' ({stats.peakCount} eventos)
          </Badge>
        </div>

        {/* Chart */}
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.5} 
              />
              <XAxis
                dataKey="minute"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                ticks={[0, 15, 30, 45, 60, 75, 90]}
                domain={[0, matchDuration]}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(value) => `${value}'`}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    total: "Total",
                    smoothed: "Média (5 min)",
                    offensive: "Ofensivos",
                    defensive: "Defensivos",
                    goals: "Gols",
                  };
                  return [value, labels[name] || name];
                }}
              />
              
              {/* Half-time reference line */}
              <ReferenceLine
                x={halfTimeMinute}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: "Intervalo",
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />

              {/* Goal markers */}
              {keyMoments
                .filter((m) => m.type === "goal")
                .map((moment, idx) => (
                  <ReferenceLine
                    key={`goal-${idx}`}
                    x={moment.minute}
                    stroke={moment.color}
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                ))}

              {/* Area under curve */}
              <Area
                type="monotone"
                dataKey="smoothed"
                fill="url(#eventGradient)"
                stroke="none"
              />

              {/* Main line (smoothed) */}
              <Line
                type="monotone"
                dataKey="smoothed"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />

              {/* Individual events dots */}
              <Line
                type="monotone"
                dataKey="total"
                stroke="transparent"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.total === 0) return null;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="hsl(var(--muted-foreground))"
                      fillOpacity={0.5}
                    />
                  );
                }}
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span>Intensidade (média móvel)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground opacity-50" />
            <span>Eventos por minuto</span>
          </div>
          {keyMoments.filter((m) => m.type === "goal").length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3 bg-green-500 rounded" />
              <span>Gols</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
