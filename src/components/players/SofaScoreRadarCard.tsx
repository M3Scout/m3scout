import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPlayerAllAttributeScores,
  calculateAndSaveAttributeScores,
  getConfidenceLevelFromValue,
  type AttributeScoresData,
} from "@/lib/attributeScores";

interface SofaScoreRadarCardProps {
  playerId: string;
  showFilters?: boolean;
  className?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface AggregatedScores {
  ata: number;
  tec: number;
  def: number;
  tat: number;
  cri: number;
  confidence: number;
  totalMinutes: number;
}

const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", description: "Gols, assistências, finalizações", angle: 90 },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", description: "Precisão de passes, dribles, controle", angle: 18 },
  { key: "tat", label: "TÁT", fullLabel: "Tática", description: "Disciplina, posicionamento, consistência", angle: 306 },
  { key: "def", label: "DEF", fullLabel: "Defesa", description: "Desarmes, interceptações, recuperações", angle: 234 },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", description: "Passes decisivos, chances criadas", angle: 162 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SofaScoreRadarCard({
  playerId,
  showFilters = true,
  className,
}: SofaScoreRadarCardProps) {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [scores, setScores] = useState<AttributeScoresData[]>([]);
  const [statsRows, setStatsRows] = useState<{ season_year: number; competition_id: string; competition_name: string; minutes: number }[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<string>("all");

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch attribute scores
      const scoresData = await fetchPlayerAllAttributeScores(playerId);
      setScores(scoresData);

      // Fetch stats rows for filter options
      const { data: statsData } = await supabase
        .from("player_stats")
        .select(`
          season_year,
          competition_id,
          minutes,
          competitions:competition_id(name)
        `)
        .eq("player_id", playerId)
        .not("competition_id", "is", null)
        .gt("minutes", 0);

      if (statsData) {
        const mapped = statsData.map((row) => ({
          season_year: row.season_year,
          competition_id: row.competition_id as string,
          competition_name: (row.competitions as any)?.name || "Competição",
          minutes: row.minutes,
        }));
        setStatsRows(mapped);

        // Calculate missing scores
        await ensureMissingScores(mapped, scoresData);
      }
    } catch (error) {
      console.error("Error fetching radar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const ensureMissingScores = async (
    stats: typeof statsRows,
    existingScores: AttributeScoresData[]
  ) => {
    const existingSet = new Set(
      existingScores.map((s) => `${s.competition_id}-${s.season_year}`)
    );

    const missing = stats.filter(
      (s) => !existingSet.has(`${s.competition_id}-${s.season_year}`)
    );

    if (missing.length > 0) {
      console.log(`[RADAR] Calculating ${missing.length} missing score rows`);
      const promises = missing.map((m) =>
        calculateAndSaveAttributeScores(playerId, m.competition_id, m.season_year)
      );
      await Promise.all(promises);
      
      // Refetch scores
      const updatedScores = await fetchPlayerAllAttributeScores(playerId);
      setScores(updatedScores);
    }
  };

  // Filter options
  const yearOptions = useMemo<FilterOption[]>(() => {
    const years = [...new Set(statsRows.map((r) => r.season_year))].sort((a, b) => b - a);
    return [
      { value: "all", label: "Geral" },
      ...years.map((y) => ({ value: String(y), label: String(y) })),
    ];
  }, [statsRows]);

  const competitionOptions = useMemo<FilterOption[]>(() => {
    const filteredStats = selectedYear === "all"
      ? statsRows
      : statsRows.filter((r) => String(r.season_year) === selectedYear);

    const comps = new Map<string, string>();
    filteredStats.forEach((r) => {
      if (!comps.has(r.competition_id)) {
        comps.set(r.competition_id, r.competition_name);
      }
    });

    return [
      { value: "all", label: "Todas" },
      ...Array.from(comps.entries()).map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [statsRows, selectedYear]);

  // Calculate aggregated scores based on filters
  const aggregatedScores = useMemo<AggregatedScores | null>(() => {
    if (scores.length === 0) return null;

    // Filter scores based on selection
    let filtered = scores;

    if (selectedYear !== "all") {
      filtered = filtered.filter((s) => String(s.season_year) === selectedYear);
    }

    if (selectedCompetition !== "all") {
      filtered = filtered.filter((s) => s.competition_id === selectedCompetition);
    }

    if (filtered.length === 0) return null;

    // Weighted average by minutes (from details or confidence)
    let totalMinutes = 0;
    let weightedAta = 0;
    let weightedTec = 0;
    let weightedDef = 0;
    let weightedTat = 0;
    let weightedCri = 0;

    for (const row of filtered) {
      const details = row.details as { minutes?: number } | null;
      const minutes = details?.minutes ?? (row.attr_confidence ?? 0.5) * 900;
      
      totalMinutes += minutes;
      weightedAta += (row.ata_score_100 ?? 50) * minutes;
      weightedTec += (row.tec_score_100 ?? 50) * minutes;
      weightedDef += (row.def_score_100 ?? 50) * minutes;
      weightedTat += (row.tat_score_100 ?? 50) * minutes;
      weightedCri += (row.cri_score_100 ?? 50) * minutes;
    }

    if (totalMinutes <= 0) return null;

    return {
      ata: weightedAta / totalMinutes,
      tec: weightedTec / totalMinutes,
      def: weightedDef / totalMinutes,
      tat: weightedTat / totalMinutes,
      cri: weightedCri / totalMinutes,
      confidence: clamp(totalMinutes / 900, 0, 1),
      totalMinutes,
    };
  }, [scores, selectedYear, selectedCompetition]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      // Clear existing scores and recalculate
      for (const row of statsRows) {
        await calculateAndSaveAttributeScores(playerId, row.competition_id, row.season_year);
      }
      
      // Refetch
      const updatedScores = await fetchPlayerAllAttributeScores(playerId);
      setScores(updatedScores);
    } catch (error) {
      console.error("Error recalculating:", error);
    } finally {
      setRecalculating(false);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!aggregatedScores) return [];
    
    return ATTRIBUTE_CONFIG.map((attr) => ({
      attribute: attr.label,
      value: Math.round(aggregatedScores[attr.key as keyof AggregatedScores] as number),
      fullMark: 100,
    }));
  }, [aggregatedScores]);

  const confidenceLevel = aggregatedScores
    ? getConfidenceLevelFromValue(aggregatedScores.confidence)
    : "none";

  const showLowMinutesWarning = aggregatedScores && aggregatedScores.confidence < 0.35;

  if (loading) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // No data at all
  if (statsRows.length === 0) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Visão geral dos atributos</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            Nenhuma estatística registrada com minutos jogados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white dark:bg-zinc-900/50 border shadow-sm", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Visão geral dos atributos
          </CardTitle>
          <div className="flex items-center gap-1">
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
                        <Badge variant="outline" className="text-xs">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              <RefreshCw className={cn("h-4 w-4 text-muted-foreground", recalculating && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2">
            <Select value={selectedYear} onValueChange={(v) => {
              setSelectedYear(v);
              setSelectedCompetition("all");
            }}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Competição" />
              </SelectTrigger>
              <SelectContent>
                {competitionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Low minutes warning */}
        {showLowMinutesWarning && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-md px-2 py-1">
            <AlertCircle className="h-3 w-3" />
            <span>Poucos minutos ({Math.round(aggregatedScores?.totalMinutes || 0)})</span>
          </div>
        )}

        {/* Radar Chart */}
        {aggregatedScores ? (
          <div className="relative h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid
                  stroke="hsl(var(--muted-foreground) / 0.2)"
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[11px] font-medium fill-muted-foreground"
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <Radar
                  name="Atributos"
                  dataKey="value"
                  stroke="hsl(0 84% 60%)"
                  fill="hsl(0 84% 60%)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Attribute value badges */}
            {ATTRIBUTE_CONFIG.map((attr) => {
              const angleRad = (attr.angle - 90) * (Math.PI / 180);
              const radius = 44;
              const x = 50 + radius * Math.cos(angleRad);
              const y = 50 + radius * Math.sin(angleRad);
              const value = Math.round(
                aggregatedScores[attr.key as keyof AggregatedScores] as number
              );

              return (
                <div
                  key={attr.key}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <Badge
                    variant={attr.key === "ata" ? "default" : "secondary"}
                    className={cn(
                      "text-xs font-bold shadow-sm",
                      attr.key === "ata" && "bg-orange-500 hover:bg-orange-500 text-white"
                    )}
                  >
                    {value}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">
              Sem dados para o filtro selecionado.
            </p>
          </div>
        )}

        {/* Confidence indicator */}
        {aggregatedScores && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Confiança:</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                confidenceLevel === "high" && "border-emerald-500/50 text-emerald-600",
                confidenceLevel === "medium" && "border-blue-500/50 text-blue-600",
                confidenceLevel === "low" && "border-amber-500/50 text-amber-600",
                confidenceLevel === "none" && "border-muted text-muted-foreground"
              )}
            >
              {confidenceLevel === "high" && "Alta"}
              {confidenceLevel === "medium" && "Média"}
              {confidenceLevel === "low" && "Baixa"}
              {confidenceLevel === "none" && "Sem dados"}
            </Badge>
            <span className="text-[10px]">
              ({Math.round(aggregatedScores.totalMinutes)} min)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
