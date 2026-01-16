import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PieChart, Users } from "lucide-react";
import { motion } from "framer-motion";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";

interface PositionData {
  name: string;
  value: number;
}

interface PositionChartCardProps {
  data: PositionData[];
}

// Convert HSL string to hex for recharts
const getPositionColorHex = (position: string): string => {
  const colorConfig = getPositionColor(position);
  // Map color classes to hex values
  const hexMap: Record<string, string> = {
    "text-violet-400": "#a78bfa",
    "text-blue-400": "#60a5fa",
    "text-cyan-400": "#22d3ee",
    "text-emerald-400": "#34d399",
    "text-amber-400": "#fbbf24",
    "text-orange-400": "#fb923c",
    "text-red-400": "#f87171",
    "text-zinc-400": "#a1a1aa",
  };
  return hexMap[colorConfig.textClass] || "#71717a";
};

export const PositionChartCard = ({ data }: PositionChartCardProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="w-full h-full flex flex-col rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-600/10 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Perfil do Elenco</h2>
            <p className="text-[10px] text-zinc-500">Distribuição por posição</p>
          </div>
        </div>
      </div>

      {/* Content - flex-1 to fill available height */}
      <div className="p-4 flex-1 flex flex-col min-h-0">
        {data.length > 0 ? (
          <>
            {/* Bar Chart - flex-1 to fill space */}
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={45}
                    tickLine={false}
                    axisLine={false}
                    tick={({ x, y, payload }) => {
                      const colors = getPositionColor(payload.value);
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          dy={4} 
                          textAnchor="end" 
                          fill={getPositionColorHex(payload.value)}
                          fontSize={10}
                          fontWeight={600}
                        >
                          {getShortPosition(payload.value)}
                        </text>
                      );
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#09090b", 
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      padding: "8px 12px"
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      <span key="value" style={{ color: "#ffffff", fontWeight: 600 }}>
                        {value} {value === 1 ? "jogador" : "jogadores"}
                      </span>,
                      ""
                    ]}
                    labelFormatter={(label: string) => (
                      <span style={{ color: getPositionColorHex(label), fontSize: "12px", fontWeight: 600 }}>
                        {label}
                      </span>
                    )}
                    cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getPositionColorHex(entry.name)}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend - mt-auto to push to bottom */}
            <div className="flex items-center justify-between pt-3 mt-auto border-t border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <Users className="w-3.5 h-3.5" />
                <span>{total} atletas cadastrados</span>
              </div>
              <div className="text-[10px] text-zinc-600">
                Top 5 posições
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center flex-1 flex flex-col items-center justify-center">
            <PieChart className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Sem dados de posição</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
