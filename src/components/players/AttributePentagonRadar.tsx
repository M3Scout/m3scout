import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttributeScores {
  ata: number; // Ataque (0-100)
  tec: number; // Técnica (0-100)
  tat: number; // Tático (0-100)
  def: number; // Defesa (0-100)
  cri: number; // Criatividade (0-100)
}

interface AttributePentagonRadarProps {
  attributes: AttributeScores | null;
  loading?: boolean;
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
    description: "Habilidade técnica: passes precisos, dribles bem-sucedidos, controle de bola e qualidade nos cruzamentos.",
    color: "#71717a", // Gray
  },
  {
    key: "tat",
    label: "TÁT",
    fullLabel: "Tático",
    description: "Inteligência tática: posicionamento, leitura de jogo, recuperação de bola e contribuição defensiva.",
    color: "#71717a", // Gray
  },
  {
    key: "def",
    label: "DEF",
    fullLabel: "Defesa",
    description: "Capacidade defensiva: desarmes, interceptações, duelos aéreos e terrestres vencidos.",
    color: "#71717a", // Gray
  },
  {
    key: "cri",
    label: "CRI",
    fullLabel: "Criatividade",
    description: "Capacidade criativa: passes decisivos, chances criadas, assistências e dribles em situações de perigo.",
    color: "#71717a", // Gray
  },
];

export function AttributePentagonRadar({ attributes, loading = false }: AttributePentagonRadarProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  // Transform attributes to radar data format
  const radarData = ATTRIBUTE_CONFIG.map((attr) => ({
    attribute: attr.label,
    value: attributes?.[attr.key as keyof AttributeScores] ?? 0,
    fullMark: 100,
  }));

  const hasData = attributes && Object.values(attributes).some(v => v > 0);

  return (
    <Card className="bg-white shadow-md border-0">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-900">
          Visão geral dos atributos
        </CardTitle>
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
                Cada atributo representa uma área do desempenho do jogador, calculado com base nas estatísticas agregadas.
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
            <p className="text-muted-foreground text-sm mb-2">Sem dados suficientes</p>
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
            {/* Radar Chart */}
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                margin={{ top: 30, right: 50, bottom: 30, left: 50 }}
              >
                {/* Pentagon grid with subtle gray */}
                <PolarGrid
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  gridType="polygon"
                />
                {/* Axis labels hidden - we render custom labels */}
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={false}
                  axisLine={false}
                />
                {/* Data polygon - green fill with green outline */}
                <Radar
                  name="Atributos"
                  dataKey="value"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Custom Labels with Value Badges - positioned around pentagon */}
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[0]}
              value={attributes?.ata ?? 0}
              position="top"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[1]}
              value={attributes?.tec ?? 0}
              position="top-right"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[2]}
              value={attributes?.tat ?? 0}
              position="bottom-right"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[3]}
              value={attributes?.def ?? 0}
              position="bottom-left"
            />
            <AttributeLabel
              attr={ATTRIBUTE_CONFIG[4]}
              value={attributes?.cri ?? 0}
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
