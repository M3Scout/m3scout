import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PieChart, Users } from "lucide-react";
import { motion } from "framer-motion";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { fadeInUp } from "@/lib/animations";

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
      {...fadeInUp}
      transition={{ delay: 0.25 }}
      className="w-full h-full flex flex-col rounded-[var(--radius-card)] border border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-glass)] bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-emerald-500/20 to-green-600/10 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Perfil do Elenco</h2>
            <p className="text-[10px] text-muted-foreground">Distribuição por posição</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
        {data.length > 0 ? (
          <>
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
                    tick={({ x, y, payload }) => (
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
                    )}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius-button)",
                      padding: "8px 12px"
                    }}
                    formatter={(value: number) => [
                      <span key="value" style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>
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

            <div className="flex items-center justify-between pt-3 mt-auto border-t border-[var(--border-glass)] shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{total} atletas</span>
              </div>
              <div className="text-[10px] text-zinc-600">Top 5</div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center flex-1 flex flex-col items-center justify-center">
            <PieChart className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Sem dados de posição</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
