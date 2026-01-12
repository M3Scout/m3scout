import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeRadarAttributes,
  type PlayerStatRow,
  type AttributeScores,
} from "@/lib/attributeRadar";

// Attribute configuration
const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque" },
  { key: "tec", label: "TÉC", fullLabel: "Técnica" },
  { key: "tat", label: "TÁT", fullLabel: "Tático" },
  { key: "def", label: "DEF", fullLabel: "Defesa" },
  { key: "cri", label: "CRI", fullLabel: "Criatividade" },
];

// Colors for different players (up to 4)
const PLAYER_COLORS = [
  { stroke: "#22c55e", fill: "#22c55e" }, // Green
  { stroke: "#3b82f6", fill: "#3b82f6" }, // Blue
  { stroke: "#f97316", fill: "#f97316" }, // Orange
  { stroke: "#a855f7", fill: "#a855f7" }, // Purple
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
}

// Generate pentagon points for SVG polygon
function getPentagonPoints(radius: number): string {
  const points: string[] = [];
  const startAngle = -90;

  for (let i = 0; i < 5; i++) {
    const angle = startAngle + i * 72;
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.cos(rad);
    const y = radius * Math.sin(rad);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return points.join(" ");
}

export function ComparisonRadarOverlay({
  players,
  loading = false,
}: ComparisonRadarOverlayProps) {
  // Compute radar attributes for each player
  const playerRadars = useMemo(() => {
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

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          Comparação de Atributos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">
              Carregando...
            </div>
          </div>
        ) : players.length < 2 ? (
          <div className="h-[350px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              Selecione pelo menos 2 jogadores para comparar
            </p>
          </div>
        ) : !hasData ? (
          <div className="h-[350px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              Sem dados suficientes para comparação
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend with player names */}
            <div className="flex flex-wrap gap-3 justify-center">
              {playerRadars.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: player.color.fill }}
                  />
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {player.name}
                  </span>
                  {player.attributes?.confidence && player.attributes.confidence !== "high" && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {player.attributes.confidence === "low" ? "Baixa" : "Média"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Overlaid Radar Chart */}
            <div className="relative h-[300px] w-full">
              {/* Pentagon Background */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 0 }}
              >
                <svg
                  width="220"
                  height="220"
                  viewBox="-110 -110 220 220"
                  className="overflow-visible"
                >
                  <polygon
                    points={getPentagonPoints(100)}
                    fill="hsl(var(--muted))"
                    stroke="none"
                    opacity="0.3"
                  />
                </svg>
              </div>

              {/* Radar Chart with overlaid polygons */}
              <div className="absolute inset-0" style={{ zIndex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={radarData}
                    margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    <defs>
                      {playerRadars.map((player, index) => (
                        <filter
                          key={`shadow-${index}`}
                          id={`radarShadow${index}`}
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="3"
                            floodColor={player.color.fill}
                            floodOpacity="0.25"
                          />
                        </filter>
                      ))}
                    </defs>
                    <PolarGrid
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      strokeOpacity={0.6}
                      gridType="polygon"
                    />
                    <PolarAngleAxis
                      dataKey="attribute"
                      tick={({ x, y, payload }) => (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={4}
                            textAnchor="middle"
                            className="fill-foreground text-xs font-medium"
                          >
                            {payload.value}
                          </text>
                        </g>
                      )}
                    />
                    {playerRadars.map((player, index) => (
                      <Radar
                        key={player.id}
                        name={player.name}
                        dataKey={`player${index}`}
                        stroke={player.color.stroke}
                        fill={player.color.fill}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        style={{ filter: `url(#radarShadow${index})` }}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attribute Values Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                      Atributo
                    </th>
                    {playerRadars.map((player) => (
                      <th
                        key={player.id}
                        className="text-center py-2 px-2 font-medium"
                        style={{ color: player.color.stroke }}
                      >
                        <span className="truncate block max-w-[80px] mx-auto">
                          {player.name.split(" ")[0]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ATTRIBUTE_CONFIG.map((attr) => {
                    const values = playerRadars.map(
                      (p) => p.attributes?.[attr.key as keyof AttributeScores] ?? null
                    );
                    const maxValue = Math.max(
                      ...values.filter((v): v is number => v !== null)
                    );

                    return (
                      <tr key={attr.key} className="border-b border-border/50">
                        <td className="py-2 px-2 font-medium">
                          {attr.label}
                          <span className="text-muted-foreground font-normal ml-1">
                            ({attr.fullLabel})
                          </span>
                        </td>
                        {playerRadars.map((player, index) => {
                          const value =
                            player.attributes?.[attr.key as keyof AttributeScores];
                          const isMax =
                            typeof value === "number" && value === maxValue && values.filter((v) => v === maxValue).length === 1;

                          return (
                            <td key={player.id} className="text-center py-2 px-2">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded font-bold text-white",
                                  isMax ? "ring-2 ring-offset-1 ring-primary" : ""
                                )}
                                style={{
                                  backgroundColor: player.color.fill,
                                }}
                              >
                                {typeof value === "number" ? Math.round(value) : "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
