import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeRadarAttributes,
  type PlayerStatRow,
  type AttributeScores,
} from "@/lib/attributeRadar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Attribute configuration with positions
const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", description: "Gols, assistências, finalizações", pos: { top: "1%", left: "50%" } },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", description: "Precisão de passes, dribles, controle", pos: { top: "30%", right: "3%" } },
  { key: "tat", label: "TÁT", fullLabel: "Tática", description: "Disciplina, posicionamento, consistência", pos: { bottom: "8%", right: "10%" } },
  { key: "def", label: "DEF", fullLabel: "Defesa", description: "Desarmes, interceptações, recuperações", pos: { bottom: "8%", left: "10%" } },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", description: "Passes decisivos, chances criadas", pos: { top: "30%", left: "3%" } },
];

// Colors for different players (up to 4)
const PLAYER_COLORS = [
  { stroke: "#f97316", fill: "#f97316", name: "Laranja" }, // Orange (primary)
  { stroke: "#3b82f6", fill: "#3b82f6", name: "Azul" },    // Blue
  { stroke: "#22c55e", fill: "#22c55e", name: "Verde" },   // Green
  { stroke: "#a855f7", fill: "#a855f7", name: "Roxo" },    // Purple
];

interface PlayerData {
  id: string;
  name: string;
  position: string;
  statsRows: PlayerStatRow[];
}

interface ComparisonRadarOverlayProps {
  players: PlayerData[];
  loading?: boolean;
  className?: string;
}

// Animation variants for radar polygons
const radarVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.3,
  },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.15,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1] as const, // Custom spring-like easing
    },
  }),
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.3 + index * 0.08,
      duration: 0.3,
      ease: "easeOut" as const,
    },
  }),
};

export function ComparisonRadarOverlay({
  players,
  loading = false,
  className,
}: ComparisonRadarOverlayProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Compute radar attributes for each player
  const playerRadars = useMemo(() => {
    // Trigger animation on data change
    setAnimationKey((k) => k + 1);
    
    return players.map((player, index) => {
      const result = computeRadarAttributes(player.statsRows, player.position, {
        logOnce: false,
      });
      return {
        ...player,
        attributes: result.confidence !== "none" ? result : null,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      };
    });
  }, [players]);

  // Check if we have any valid data
  const hasData = playerRadars.some(
    (p) => p.attributes && Object.values(p.attributes).some((v) => typeof v === "number" && v > 0)
  );

  // Transform to radar chart data format (merged for all players)
  const radarData = useMemo(() => {
    return ATTRIBUTE_CONFIG.map((attr) => {
      const point: Record<string, unknown> = {
        attribute: attr.label,
        fullMark: 100,
      };

      playerRadars.forEach((player, index) => {
        const attrValue = player.attributes?.[attr.key as keyof AttributeScores];
        point[`player${index}`] = typeof attrValue === "number" ? attrValue : 0;
      });

      return point;
    });
  }, [playerRadars]);

  // Get badge color based on score
  const getBadgeStyle = (v: number | null, playerColor: string) => {
    if (v === null) return "bg-zinc-700 text-zinc-400";
    if (v >= 70) return "text-white shadow-lg";
    if (v >= 50) return "text-white";
    if (v >= 30) return "text-zinc-900";
    return "text-white";
  };

  return (
    <Card className={cn("bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden", className)}>
      {/* Compact header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <span className="text-xs font-semibold text-zinc-100">
          Comparação de Atributos
        </span>
        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-zinc-800">
              <Info className="h-3 w-3 text-zinc-500" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Atributos Comparados</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {ATTRIBUTE_CONFIG.map((attr) => (
                <div key={attr.key} className="border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2 font-medium text-zinc-200">
                    <span className="text-xs font-bold text-orange-500">{attr.label}</span>
                    {attr.fullLabel}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{attr.description}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse text-zinc-500 text-sm">
              Carregando...
            </div>
          </div>
        ) : players.length < 2 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-6 h-6 text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-xs">
              Selecione pelo menos 2 jogadores
            </p>
          </div>
        ) : !hasData ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-6 h-6 text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-xs">
              Sem dados suficientes para comparação
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Legend with player names - compact */}
            <div className="flex flex-wrap gap-2 justify-center py-2 px-2 bg-zinc-800/40">
              {playerRadars.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="flex items-center gap-1.5"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: player.color.fill }}
                  />
                  <span className="text-[10px] sm:text-xs font-medium text-zinc-300 truncate max-w-[80px] sm:max-w-[100px]">
                    {player.name.split(" ")[0]}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Overlaid Radar Chart with Badges - SofaScore style */}
            <div 
              className="relative mx-auto w-full overflow-hidden"
              style={{ aspectRatio: "1 / 0.85" }}
            >
              {/* Radar Chart */}
              <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 py-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    key={animationKey}
                    data={radarData}
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                  >
                    <PolarGrid
                      stroke="rgba(82, 82, 91, 0.5)"
                      strokeWidth={1}
                      gridType="polygon"
                    />
                    <PolarAngleAxis
                      dataKey="attribute"
                      tick={false}
                    />
                    {/* Render each player's polygon with animation */}
                    {playerRadars.map((player, index) => (
                      <Radar
                        key={`${player.id}-${animationKey}`}
                        name={player.name}
                        dataKey={`player${index}`}
                        stroke={player.color.stroke}
                        fill={player.color.fill}
                        fillOpacity={0.2 - index * 0.03}
                        strokeWidth={2.5 - index * 0.3}
                        strokeDasharray={index > 0 ? "4 2" : undefined}
                        animationDuration={600}
                        animationEasing="ease-out"
                        animationBegin={index * 150}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Badges at vertices - showing best player for each attribute */}
              <AnimatePresence mode="wait">
                {ATTRIBUTE_CONFIG.map((attr, attrIndex) => {
                  // Find best player for this attribute
                  const playerValues = playerRadars.map((p, idx) => ({
                    player: p,
                    value: p.attributes?.[attr.key as keyof AttributeScores] as number | null,
                    index: idx,
                  }));

                  const validValues = playerValues.filter((pv) => pv.value !== null);
                  const bestPlayer = validValues.length > 0 
                    ? validValues.reduce((a, b) => ((a.value ?? 0) > (b.value ?? 0) ? a : b))
                    : null;

                  return (
                    <motion.div
                      key={`${attr.key}-${animationKey}`}
                      custom={attrIndex}
                      initial="hidden"
                      animate="visible"
                      variants={badgeVariants}
                      className="absolute flex flex-col items-center gap-0 pointer-events-none"
                      style={{
                        ...attr.pos,
                        transform: attr.pos.left === "50%" ? "translateX(-50%)" : "translateX(0)",
                      }}
                    >
                      {/* Attribute label */}
                      <span className="text-[8px] sm:text-[9px] font-semibold text-zinc-500 uppercase tracking-wider leading-none">
                        {attr.label}
                      </span>
                      {/* Show stacked badges for all players */}
                      <div className="flex gap-0.5 mt-0.5">
                        {playerRadars.map((player, pIndex) => {
                          const value = player.attributes?.[attr.key as keyof AttributeScores] as number | null;
                          const isBest = bestPlayer?.index === pIndex && validValues.length > 1;
                          
                          return (
                            <motion.div
                              key={player.id}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.4 + pIndex * 0.1, duration: 0.2 }}
                              className={cn(
                                "min-w-[18px] sm:min-w-[22px] h-[14px] sm:h-[16px] flex items-center justify-center",
                                "text-[8px] sm:text-[9px] font-bold rounded shadow-sm",
                                isBest && "ring-1 ring-white/50"
                              )}
                              style={{ backgroundColor: player.color.fill }}
                            >
                              <span className="text-white">
                                {value !== null ? Math.round(value) : "—"}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Compact stats summary */}
            <div className="px-2 pb-2">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(playerRadars.length, 4)}, 1fr)` }}>
                {playerRadars.map((player, index) => {
                  const attrs = player.attributes;
                  const avgScore = attrs
                    ? Math.round(
                        ([attrs.ata, attrs.tec, attrs.tat, attrs.def, attrs.cri].filter(
                          (v): v is number => v !== null
                        ).reduce((a, b) => a + b, 0) /
                          [attrs.ata, attrs.tec, attrs.tat, attrs.def, attrs.cri].filter(
                            (v) => v !== null
                          ).length) || 0
                      )
                    : null;

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                      className="p-1.5 rounded bg-zinc-800/50 text-center"
                    >
                      <div
                        className="text-[10px] sm:text-xs font-bold"
                        style={{ color: player.color.fill }}
                      >
                        {avgScore ?? "—"}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-zinc-500 truncate">
                        Média
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
