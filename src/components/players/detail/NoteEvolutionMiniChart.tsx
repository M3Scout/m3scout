import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface NoteEvolutionMiniChartProps {
  playerId: string;
  currentRating: number | null;
}

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
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#E5173F"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ background: "#0A0A0A", border: "1px solid #1C1C1C", borderRadius: 0, fontSize: 10 }}
          itemStyle={{ color: "#F2EDE4", fontFamily: "Basis Grotesque Pro" }}
          formatter={(v: number) => [v.toFixed(1), "Nota"]}
          labelFormatter={() => ""}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
