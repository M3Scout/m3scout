import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  getAggregatedAttributeScores,
  ensureAttributeScoresExist,
  type AttributeScoresResult,
} from "@/lib/attributeScores";
import { RecalculateAttributesButton } from "./RecalculateAttributesButton";

interface PersistedAttributeRadarProps {
  playerId: string;
  seasonFilter?: number;
  competitionFilter?: string;
  showRecalculateButton?: boolean;
}

const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", description: "Gols, assistências, finalizações", color: "hsl(var(--chart-1))" },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", description: "Precisão de passes, dribles, controle", color: "hsl(var(--chart-2))" },
  { key: "tat", label: "TÁT", fullLabel: "Tática/Disciplina", description: "Cartões, faltas, posicionamento", color: "hsl(var(--chart-3))" },
  { key: "def", label: "DEF", fullLabel: "Defesa", description: "Desarmes, interceptações, recuperações", color: "hsl(var(--chart-4))" },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", description: "Passes decisivos, chances criadas, dribles", color: "hsl(var(--chart-5))" },
];

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: "Sem dados", color: "text-muted-foreground" },
  low: { label: "Baixa", color: "text-amber-600" },
  medium: { label: "Média", color: "text-blue-600" },
  high: { label: "Alta", color: "text-emerald-600" },
};

export function PersistedAttributeRadar({
  playerId,
  seasonFilter,
  competitionFilter,
  showRecalculateButton = true,
}: PersistedAttributeRadarProps) {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<AttributeScoresResult | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const fetchScores = async () => {
    setLoading(true);
    try {
      // Ensure scores exist (calculate if missing)
      await ensureAttributeScoresExist(playerId);
      
      // Fetch aggregated scores
      const result = await getAggregatedAttributeScores(playerId, seasonFilter);
      setScores(result);
      
      if (result) {
        console.log("[RADAR] Loaded persisted scores:", result);
      }
    } catch (error) {
      console.error("Error fetching attribute scores:", error);
      setScores(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [playerId, seasonFilter, competitionFilter]);

  const chartData = useMemo(() => {
    if (!scores) return [];
    
    return ATTRIBUTE_CONFIG.map((attr) => ({
      attribute: attr.label,
      value: Math.round(scores[attr.key as keyof AttributeScoresResult] as number),
      fullMark: 100,
    }));
  }, [scores]);

  const confidenceInfo = scores
    ? CONFIDENCE_LABELS[scores.confidenceLevel]
    : CONFIDENCE_LABELS.none;

  if (loading) {
    return (
      <Card className="bg-white shadow-md border-0">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!scores || scores.confidenceLevel === "none") {
    return (
      <Card className="bg-white shadow-md border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Visão geral dos atributos</CardTitle>
            {showRecalculateButton && (
              <RecalculateAttributesButton playerId={playerId} onSuccess={fetchScores} />
            )}
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Sem dados suficientes para gerar o radar.
          </p>
          <p className="text-xs text-muted-foreground">
            Adicione estatísticas de temporada com minutos jogados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-md border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Visão geral dos atributos</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", confidenceInfo.color)}
            >
              Confiança: {confidenceInfo.label}
            </Badge>
            <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Como são calculados os atributos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Os atributos são calculados com base nas estatísticas por 90 minutos,
                    normalizados em uma escala de 0-100.
                  </p>
                  {ATTRIBUTE_CONFIG.map((attr) => (
                    <div key={attr.key} className="border-b pb-2">
                      <div className="flex items-center gap-2 font-medium">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: attr.color, color: attr.color }}
                        >
                          {attr.label}
                        </Badge>
                        {attr.fullLabel}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attr.description}
                      </p>
                    </div>
                  ))}
                  <div className="bg-muted/50 rounded-lg p-3 text-xs">
                    <strong>Confiança:</strong> Baseada nos minutos jogados. Quanto mais
                    minutos, mais confiável é a avaliação.
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {showRecalculateButton && (
              <RecalculateAttributesButton
                playerId={playerId}
                onSuccess={fetchScores}
                size="icon"
                variant="ghost"
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="attribute"
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-medium fill-foreground"
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Radar
                name="Atributos"
                dataKey="value"
                stroke="hsl(142.1 76.2% 36.3%)"
                fill="hsl(142.1 76.2% 36.3%)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 shadow-md">
                        <p className="font-medium">{data.attribute}</p>
                        <p className="text-lg font-bold text-primary">{data.value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
          
          {/* Attribute value badges positioned around the chart */}
          <div className="absolute inset-0 pointer-events-none">
            {ATTRIBUTE_CONFIG.map((attr, index) => {
              const angle = (index * 72 - 90) * (Math.PI / 180);
              const radius = 42; // % from center
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);
              const value = Math.round(scores[attr.key as keyof AttributeScoresResult] as number);

              return (
                <div
                  key={attr.key}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <Badge
                    variant={attr.key === "ata" ? "default" : "secondary"}
                    className={cn(
                      "text-xs font-bold",
                      attr.key === "ata" && "bg-orange-500 hover:bg-orange-500"
                    )}
                  >
                    {value}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
