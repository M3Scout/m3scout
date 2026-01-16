import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PieChart, Users } from "lucide-react";
import { motion } from "framer-motion";

interface PositionData {
  name: string;
  value: number;
}

interface PositionChartCardProps {
  data: PositionData[];
}

const POSITION_COLORS: Record<string, string> = {
  "Goleiro": "#10b981",
  "Zagueiro": "#3b82f6",
  "Lateral Direito": "#6366f1",
  "Lateral Esquerdo": "#8b5cf6",
  "Volante": "#f59e0b",
  "Meia": "#ec4899",
  "Meia Atacante": "#f43f5e",
  "Ponta Direita": "#14b8a6",
  "Ponta Esquerda": "#06b6d4",
  "Centroavante": "#ef4444",
  "Atacante": "#dc2626",
};

const getPositionColor = (position: string) => {
  return POSITION_COLORS[position] || "#71717a";
};

const getShortPosition = (name: string) => {
  const shorts: Record<string, string> = {
    "Goleiro": "GOL",
    "Zagueiro": "ZAG",
    "Lateral Direito": "LD",
    "Lateral Esquerdo": "LE",
    "Volante": "VOL",
    "Meia": "MEI",
    "Meia Atacante": "MEA",
    "Ponta Direita": "PD",
    "Ponta Esquerda": "PE",
    "Centroavante": "CA",
    "Atacante": "ATA",
  };
  return shorts[name] || name;
};

export const PositionChartCard = ({ data }: PositionChartCardProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50">
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

      {/* Content */}
      <div className="p-4">
        {data.length > 0 ? (
          <>
            {/* Bar Chart */}
            <div className="h-[180px] mb-4">
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
                        fill="#a1a1aa" 
                        fontSize={10}
                        fontWeight={500}
                      >
                        {getShortPosition(payload.value)}
                      </text>
                    )}
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
                      <span style={{ color: getPositionColor(label), fontSize: "12px", fontWeight: 600 }}>
                        {label}
                      </span>
                    )}
                    cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getPositionColor(entry.name)}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
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
          <div className="py-12 text-center">
            <PieChart className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Sem dados de posição</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
