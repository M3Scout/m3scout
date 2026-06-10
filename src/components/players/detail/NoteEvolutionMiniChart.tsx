import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface NoteEvolutionMiniChartProps {
  playerId: string;
  currentRating: number | null;
}

function getMatchRatingColor(rating: number): string {
  if (rating >= 9.0) return "#1e3a8a";
  if (rating >= 8.0) return "#06b6d4";
  if (rating >= 7.0) return "#22c55e";
  if (rating >= 6.5) return "#eab308";
  if (rating >= 6.0) return "#f97316";
  return "#ef4444";
}

const CustomDot = (props: any) => {
  const { cx, cy, value } = props;
  if (cx === undefined || cy === undefined || value === undefined) return null;
  const color = getMatchRatingColor(value);
  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill={color} stroke="#09090b" strokeWidth={1} />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  const color = getMatchRatingColor(value);
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #1C1C1C",
        borderRadius: 4,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: "bold",
        color,
      }}
    >
      {Number(value).toFixed(1)}
    </div>
  );
};

export function NoteEvolutionMiniChart({ playerId, currentRating }: NoteEvolutionMiniChartProps) {
  const [data, setData] = useState<{ v: number }[]>([]);

  useEffect(() => {
    supabase
      .from("player_rating_history")
      .select("rating, recorded_at")
      .eq("player_id", playerId)
      .order("recorded_at", { ascending: true })
      .limit(20)
      .then(({ data: rows }) => {
        if (rows && rows.length > 0) {
          const entries = (rows as { rating: number; recorded_at: string }[]).map((r) => ({ v: r.rating }));
          if (currentRating !== null && currentRating !== undefined) {
            entries.push({ v: currentRating });
          }
          setData(entries);
        } else if (currentRating !== null && currentRating !== undefined) {
          setData([{ v: currentRating }]);
        }
      });
  }, [playerId, currentRating]);

  if (data.length < 2) {
    return (
      <div className="h-[68px] flex items-center justify-center text-[10px] text-[#6B6560]">
        SEM HISTÓRICO
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={68}>
      <LineChart data={data} margin={{ top: 6, right: 4, left: -40, bottom: 0 }}>
        <YAxis domain={[3, 10]} hide />
        <ReferenceLine y={7} stroke="#1C1C1C" strokeDasharray="3 3" strokeWidth={1} />
        <Line
          type="monotone"
          dataKey="v"
          stroke="#ffffff18"
          strokeWidth={1.5}
          dot={<CustomDot />}
          activeDot={false}
          isAnimationActive={false}
        />
        <Tooltip content={<CustomTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  );
}
