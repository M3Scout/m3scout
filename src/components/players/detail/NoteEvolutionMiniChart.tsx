import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { RATING_SCALE_CUTOVER } from "@/lib/ratingScale";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NoteEvolutionMiniChartProps {
  playerId: string;
  currentRating: number | null;
}

interface ChartPoint {
  v: number;
  date: string; // ISO, for the tooltip
}

// Same 0-100 tier palette used across the M3 Market Score cards, so a color
// here means the same thing it means everywhere else on the platform.
function getRatingColor(rating: number): string {
  if (rating >= 85) return "#2DCE8A";
  if (rating >= 70) return "#4ade80";
  if (rating >= 50) return "#E8C84A";
  if (rating >= 30) return "#f97316";
  return "#e5173f";
}

function getRatingLabel(rating: number): string {
  if (rating >= 85) return "Elite";
  if (rating >= 70) return "Alto";
  if (rating >= 50) return "Médio";
  return "Baixo";
}

const CustomDot = (props: any) => {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined || value === undefined) return null;
  const color = getRatingColor(value);
  return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#09090b" strokeWidth={1.5} />;
};

const CustomActiveDot = (props: any) => {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined || value === undefined) return null;
  const color = getRatingColor(value);
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.18} />
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#09090b" strokeWidth={1.5} />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  const point = payload[0].payload as ChartPoint;
  const color = getRatingColor(value);
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: `1px solid ${color}40`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      <div style={{ color, fontWeight: "bold", fontSize: 14, lineHeight: 1.2 }}>
        {value.toFixed(1)} <span style={{ fontSize: 9, opacity: 0.8 }}>{getRatingLabel(value)}</span>
      </div>
      <div style={{ color: "#62616a", fontSize: 9, marginTop: 2 }}>
        {format(new Date(point.date), "dd MMM yyyy", { locale: ptBR })}
      </div>
    </div>
  );
};

export function NoteEvolutionMiniChart({ playerId, currentRating }: NoteEvolutionMiniChartProps) {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    supabase
      .from("player_rating_history")
      .select("rating, recorded_at")
      .eq("player_id", playerId)
      // Only the current 0-99 scale — pre-cutover rows are a different unit
      // entirely and would otherwise show up as a fake huge jump.
      .gte("recorded_at", RATING_SCALE_CUTOVER)
      .order("recorded_at", { ascending: true })
      .limit(20)
      .then(({ data: rows }) => {
        const entries: ChartPoint[] = (rows as { rating: number; recorded_at: string }[] | null ?? [])
          .map((r) => ({ v: r.rating, date: r.recorded_at }));
        if (currentRating !== null && currentRating !== undefined) {
          const last = entries[entries.length - 1];
          // Avoid a duplicate final point if the latest history row already
          // matches the live auto_rating value.
          if (!last || last.v !== currentRating) {
            entries.push({ v: currentRating, date: new Date().toISOString() });
          }
        }
        setData(entries);
      });
  }, [playerId, currentRating]);

  if (data.length < 2) {
    return (
      <div className="h-[68px] flex items-center justify-center text-[10px] text-[#6B6560]">
        SEM HISTÓRICO
      </div>
    );
  }

  // Gradient fill uses the CURRENT (latest) value's tier color — matches the
  // big number shown below the chart, so the whole card reads as one color.
  const latestColor = getRatingColor(data[data.length - 1].v);
  const gradientId = "note-evolution-gradient";

  return (
    <ResponsiveContainer width="100%" height={68}>
      <AreaChart data={data} margin={{ top: 6, right: 4, left: -40, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={latestColor} stopOpacity={0.45} />
            <stop offset="60%"  stopColor={latestColor} stopOpacity={0.12} />
            <stop offset="100%" stopColor={latestColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[0, 100]} hide />
        <CartesianGrid strokeDasharray="2 4" stroke="#ffffff0d" vertical={false} />
        <Area
          type="monotone"
          dataKey="v"
          stroke={latestColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={<CustomDot />}
          activeDot={<CustomActiveDot />}
          isAnimationActive
          animationDuration={500}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ffffff20", strokeDasharray: "3 3" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
