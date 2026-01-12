import { useState, useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  computeRadarAttributes, 
  type PlayerStatRow, 
  type RadarResult,
  type ConfidenceLevel,
  type AttributeScores 
} from "@/lib/attributeRadar";

interface AttributePentagonRadarProps {
  // Option 1: Pre-computed attributes (legacy)
  attributes?: AttributeScores | null;
  // Option 2: Raw stats for computation
  statsRows?: PlayerStatRow[];
  playerPosition?: string;
  // Common
  loading?: boolean;
  showConfidence?: boolean;
}

// Attribute definitions with labels and descriptions
const ATTRIBUTE_CONFIG = [
  {
    key: "ata",
    label: "ATA",
    fullLabel: "Ataque",
    description: "Capacidade ofensiva: gols, finalizações, participação em ações ofensivas e presença na área.",
    color: "#f97316", // Orange for ATA (like SofaScore)
  },
  {
    key: "tec",
    label: "TÉC",
    fullLabel: "Técnica",
    description: "Habilidade técnica: passes precisos, precisão de chute, disciplina e qualidade nos passes.",
    color: "#71717a", // Gray
  },
  {
    key: "tat",
    label: "TÁT",
    fullLabel: "Tático",
    description: "Inteligência tática: disponibilidade, tempo de jogo, disciplina (menos cartões).",
    color: "#71717a", // Gray
  },
  {
    key: "def",
    label: "DEF",
    fullLabel: "Defesa",
    description: "Capacidade defensiva: desarmes, interceptações, recuperações e duelos vencidos.",
    color: "#71717a", // Gray
  },
  {
    key: "cri",
    label: "CRI",
    fullLabel: "Criatividade",
    description: "Capacidade criativa: passes decisivos, chances criadas, assistências e dribles.",
    color: "#71717a", // Gray
  },
];

// Confidence level labels in Portuguese
const CONFIDENCE_LABELS: Record<ConfidenceLevel, { label: string; color: string }> = {
  none: { label: "Sem dados", color: "text-muted-foreground" },
  low: { label: "Confiança baixa", color: "text-amber-600" },
  medium: { label: "Confiança média", color: "text-blue-600" },
  high: { label: "Confiança alta", color: "text-emerald-600" },
};

// Generate pentagon points for SVG polygon
// Starts at top vertex and goes clockwise (matching Recharts radar orientation)
function getPentagonPoints(radius: number): string {
  const points: string[] = [];
  const startAngle = -90; // Start at top (12 o'clock position)
  
  for (let i = 0; i < 5; i++) {
    const angle = startAngle + (i * 72); // 72 degrees between each vertex
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.cos(rad);
    const y = radius * Math.sin(rad);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  
  return points.join(" ");
}

export function AttributePentagonRadar({ 
  attributes, 
  statsRows,
  playerPosition = "Meia",
  loading = false,
  showConfidence = true,
}: AttributePentagonRadarProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  // Compute radar from raw stats if provided, otherwise use pre-computed attributes
  const radarResult = useMemo<RadarResult | null>(() => {
    if (statsRows && statsRows.length > 0) {
      return computeRadarAttributes(statsRows, playerPosition, { logOnce: true });
    }
    return null;
  }, [statsRows, playerPosition]);

  // Determine final attributes to display
  const displayAttributes = useMemo<AttributeScores | null>(() => {
    if (radarResult && radarResult.confidence !== "none") {
      return {
        ata: radarResult.ata ?? 0,
        tec: radarResult.tec ?? 0,
        tat: radarResult.tat ?? 0,
        def: radarResult.def ?? 0,
        cri: radarResult.cri ?? 0,
      };
    }
    return attributes ?? null;
  }, [radarResult, attributes]);

  const confidence = radarResult?.confidence ?? "high";

  // Transform attributes to radar data format
  const radarData = ATTRIBUTE_CONFIG.map((attr) => ({
    attribute: attr.label,
    value: displayAttributes?.[attr.key as keyof AttributeScores] ?? 0,
    fullMark: 100,
  }));

  const hasData = displayAttributes && Object.values(displayAttributes).some(v => v > 0);

  return (
    <Card className="bg-white shadow-md border-0">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-gray-900">
            Visão geral dos atributos
          </CardTitle>
          {showConfidence && radarResult && confidence !== "high" && (
            <Badge 
              variant="outline" 
              className={cn("text-[10px] px-1.5 py-0", CONFIDENCE_LABELS[confidence].color)}
            >
              {CONFIDENCE_LABELS[confidence].label}
            </Badge>
          )}
        </div>
        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100"
            >
              <Info className="h-4 w-4 text-gray-500" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Atributos do Jogador</DialogTitle>
              <DialogDescription>
                Cada atributo representa uma área do desempenho do jogador, calculado com base nas estatísticas agregadas por 90 minutos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {ATTRIBUTE_CONFIG.map((attr) => (
                <div key={attr.key} className="flex gap-3">
                  <div
                    className={cn(
                      "flex-shrink-0 w-12 h-6 rounded text-xs font-bold flex items-center justify-center text-white",
                      attr.key === "ata" ? "bg-orange-500" : "bg-gray-500"
                    )}
                  >
                    {attr.label}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{attr.fullLabel}</p>
                    <p className="text-xs text-muted-foreground">{attr.description}</p>
                  </div>
                </div>
              ))}
              {radarResult && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Confiança:</strong> Baseada nos minutos jogados. 
                    Jogadores com mais de 900 minutos têm confiança alta. 
                    Valores são ajustados (shrinkage) para amostras menores.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
          </div>
        ) : !hasData ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm mb-2">
              {radarResult?.confidence === "none" 
                ? "Sem dados suficientes (menos de 180 min)"
                : "Sem dados suficientes"
              }
            </p>
            <div className="flex gap-3">
              {ATTRIBUTE_CONFIG.map((attr) => (
                <div key={attr.key} className="text-center">
                  <div
                    className={cn(
                      "w-10 h-5 rounded text-xs font-bold flex items-center justify-center text-white mx-auto mb-1",
                      attr.key === "ata" ? "bg-orange-500" : "bg-gray-400"
                    )}
                  >
                    —
                  </div>
                  <span className="text-[10px] text-gray-500">{attr.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative h-[280px] w-full">
            {/* Layer 1: Solid Pentagon Background - FIXED, static, behind everything */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
              <svg
                width="180"
                height="180"
                viewBox="-100 -100 200 200"
                className="overflow-visible"
              >
                {/* Perfect regular pentagon - light gray fill, no stroke */}
                <polygon
                  points={getPentagonPoints(90)}
                  fill="#F2F4F7"
                  stroke="none"
                />
              </svg>
            </div>

            {/* Layer 2: Radar Chart - on top of pentagon background */}
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={radarData}
                  margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                >
                  {/* SVG Defs for drop shadow filter */}
                  <defs>
                    <filter id="radarShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow 
                        dx="0" 
                        dy="2" 
                        stdDeviation="4" 
                        floodColor="#22c55e" 
                        floodOpacity="0.3"
                      />
                    </filter>
                  </defs>
                  {/* Very subtle grid lines - NOT the background */}
                  <PolarGrid
                    stroke="#d1d5db"
                    strokeWidth={0.5}
                    strokeOpacity={0.4}
                    gridType="polygon"
                  />
                  {/* Hide axis labels - we render custom */}
                  <PolarAngleAxis
                    dataKey="attribute"
                    tick={false}
                    axisLine={false}
                  />
                  {/* Green data polygon - prominent with drop shadow */}
                  <Radar
                    name="Atributos"
                    dataKey="value"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.35}
                    strokeWidth={2.5}
                    style={{ filter: "url(#radarShadow)" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Labels with Value Badges - positioned around pentagon */}
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[0]}
              value={displayAttributes?.ata ?? 0}
              position="top"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[1]}
              value={displayAttributes?.tec ?? 0}
              position="top-right"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[2]}
              value={displayAttributes?.tat ?? 0}
              position="bottom-right"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[3]}
              value={displayAttributes?.def ?? 0}
              position="bottom-left"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[4]}
              value={displayAttributes?.cri ?? 0}
              position="top-left"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AttributeLabelProps {
  attr: (typeof ATTRIBUTE_CONFIG)[number];
  value: number;
  position: "top" | "top-right" | "bottom-right" | "bottom-left" | "top-left";
}

function AttributeLabel({ attr, value, position }: AttributeLabelProps) {
  const positionClasses: Record<string, string> = {
    top: "top-1 left-1/2 -translate-x-1/2",
    "top-right": "top-[20%] right-2",
    "bottom-right": "bottom-[18%] right-4",
    "bottom-left": "bottom-[18%] left-4",
    "top-left": "top-[20%] left-2",
  };

  const isAta = attr.key === "ata";

  return (
    <div
      className={cn(
        "absolute flex items-center gap-1.5",
        positionClasses[position]
      )}
      style={{ zIndex: 2 }}
    >
      {/* Value Badge */}
      <div
        className={cn(
          "px-2 py-0.5 rounded text-xs font-bold text-white min-w-[28px] text-center",
          isAta ? "bg-orange-500" : "bg-gray-500"
        )}
      >
        {Math.round(value)}
      </div>
      {/* Label */}
      <span className="text-xs font-medium text-gray-600">{attr.label}</span>
    </div>
  );
}

// Re-export types for convenience
export type { AttributeScores, RadarResult, ConfidenceLevel, PlayerStatRow };
