import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Activity, Download } from "lucide-react";
import { useExportPng } from "@/hooks/useExportPng";

interface MatchEvent {
  id: string;
  event_type: string;
  player_id: string;
  minute: number | null;
  half: number | null;
  game_time_seconds: number | null;
  display_minute: string | null;
  event_status?: string;
  count_in_stats?: boolean;
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
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportToPng, isExporting } = useExportPng({ filename: "distribuicao-eventos" });

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
    // Skip events that don't count in stats or are voided
    matchEvents.forEach((event) => {
      if (event.event_status === "voided" || event.count_in_stats === false) return;
      
      // Derive minute from game_time_seconds if minute is null
      let eventMinute: number | null = event.minute;
      if (eventMinute === null && event.game_time_seconds !== null) {
        eventMinute = Math.floor(event.game_time_seconds / 60);
      }
      
      if (eventMinute === null || eventMinute < 0 || eventMinute > matchDuration + 15) return;
      
      // Clamp to chart range
      const idx = Math.min(Math.floor(eventMinute), data.length - 1);
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
    // Filter only valid events for counting
    const validEvents = matchEvents.filter(
      (e) => e.event_status !== "voided" && e.count_in_stats !== false
    );
    const firstHalfEvents = validEvents.filter((e) => e.half === 1).length;
    const secondHalfEvents = validEvents.filter((e) => e.half === 2).length;
    
    // Find peak minute from chartData
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
      totalEvents: validEvents.length,
    };
  }, [matchEvents, chartData]);

  if (matchEvents.length === 0) {
    return null;
  }

  const halfTimeMinute = Math.floor(matchDuration / 2);

  return (
    <div ref={chartRef} data-export-target className="rounded-xl border overflow-hidden" style={{ background: "#161618", borderColor: "rgba(255,255,255,0.10)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4" style={{ color: "#62616a" }} />
          <span className="font-display font-semibold text-[15px]" style={{ color: "#ededee" }}>Distribuição de Eventos</span>
        </div>
        <button
          onClick={() => exportToPng(chartRef.current)}
          disabled={isExporting}
          className="flex items-center gap-1.5 font-editorial-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors hover:bg-zinc-800/40 disabled:opacity-50"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#ededee" }}
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? "..." : "PNG"}
        </button>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        {/* Summary pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: `1º Tempo: ${stats.firstHalf} eventos` },
            { label: `2º Tempo: ${stats.secondHalf} eventos` },
            { label: `Pico: ${stats.peakMinute}' (${stats.peakCount} eventos)` },
          ].map(({ label }) => (
            <span key={label} className="font-editorial-mono text-[10px] px-2.5 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "#ededee" }}>
              {label}
            </span>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[220px] sm:h-[280px] lg:h-[320px] w-full">
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
        <div className="flex flex-wrap justify-center gap-4 font-editorial-mono text-[10px]" style={{ color: "#62616a" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: "#ec4525" }} />
            <span>Intensidade (média móvel)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.30)" }} />
            <span>Eventos por minuto</span>
          </div>
          {keyMoments.filter((m) => m.type === "goal").length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3 rounded" style={{ background: "#22c55e" }} />
              <span>Gols</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
