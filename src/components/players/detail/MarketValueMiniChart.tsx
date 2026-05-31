import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface Entry {
  value: number;
  recorded_at: string;
}

interface MarketValueMiniChartProps {
  playerId: string;
  currentValue: number | null;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
};

const fmtVal = (v: number) => {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
};

export function MarketValueMiniChart({ playerId, currentValue }: MarketValueMiniChartProps) {
  const [data, setData] = useState<{ v: number }[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    supabase
      .from("player_market_value_history")
      .select("value, recorded_at")
      .eq("player_id", playerId)
      .order("recorded_at", { ascending: true })
      .limit(20)
      .then(({ data: rows }) => {
        if (rows && rows.length > 0) {
          const rawEntries = rows as Entry[];
          setEntries(rawEntries);
          const chartData = rawEntries.map((r) => ({ v: r.value }));
          if (currentValue !== null && currentValue !== undefined) {
            chartData.push({ v: currentValue });
          }
          setData(chartData);
        } else if (currentValue !== null && currentValue !== undefined) {
          setData([{ v: currentValue }]);
        }
      });
  }, [playerId, currentValue]);

  const oldest = entries[0] ?? null;
  const newest = entries[entries.length - 1] ?? null;

  if (data.length < 2) {
    return (
      <div className="h-[55px] flex items-center justify-center text-[10px] text-[#6B6560]">
        SEM HISTÓRICO
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={55}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#22C55E"
            strokeWidth={1.5}
            fill="url(#mvGrad)"
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{ background: "#0A0A0A", border: "1px solid #1C1C1C", borderRadius: 0, fontSize: 10 }}
            itemStyle={{ color: "#F2EDE4", fontFamily: "Basis Grotesque Pro" }}
            formatter={(v: number) => [`€${(v / 1_000_000).toFixed(2)}M`, ""]}
            labelFormatter={() => ""}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* X-axis endpoint labels */}
      {oldest && newest && (
        <div className="flex items-start justify-between mt-2">
          <div>
            <p className="font-jetbrains text-[10px]" style={{ color: "#6B6560" }}>
              {fmtDate(oldest.recorded_at)}
            </p>
            <p className="font-jetbrains text-[13px] font-bold" style={{ color: "#6B6560" }}>
              {fmtVal(oldest.value)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-jetbrains text-[10px]" style={{ color: "#6B6560" }}>
              {fmtDate(newest.recorded_at)}
            </p>
            <p className="font-jetbrains text-[13px] font-bold" style={{ color: "#F2EDE4" }}>
              {fmtVal(currentValue ?? newest.value)}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
