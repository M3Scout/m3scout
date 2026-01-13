import { useState, useEffect, useMemo, useCallback } from "react";
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
import { computeRadarAttributes, type PlayerStatRow } from "@/lib/attributeRadar";

interface SofaScoreRadarCardProps {
  playerId: string;
  playerPosition?: string;
  showFilters?: boolean;
  className?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface StatsRowWithName {
  season_year: number;
  competition_id: string;
  competition_name: string;
  minutes: number;
  rawStats?: PlayerStatRow;
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

// Vertex positions for the pentagon (percentage based positioning)
// Each vertex: label position + badge offset
const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", description: "Gols, assistências, finalizações", angle: 90, labelPos: { x: 50, y: 4 }, badgeOffset: { x: 0, y: 14 } },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", description: "Precisão de passes, dribles, controle", angle: 18, labelPos: { x: 92, y: 36 }, badgeOffset: { x: -4, y: 12 } },
  { key: "tat", label: "TÁT", fullLabel: "Tática", description: "Disciplina, posicionamento, consistência", angle: 306, labelPos: { x: 78, y: 88 }, badgeOffset: { x: -4, y: -10 } },
  { key: "def", label: "DEF", fullLabel: "Defesa", description: "Desarmes, interceptações, recuperações", angle: 234, labelPos: { x: 22, y: 88 }, badgeOffset: { x: 4, y: -10 } },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", description: "Passes decisivos, chances criadas", angle: 162, labelPos: { x: 8, y: 36 }, badgeOffset: { x: 4, y: 12 } },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SofaScoreRadarCard({
  playerId,
  playerPosition = "Atacante",
  showFilters = true,
  className,
}: SofaScoreRadarCardProps) {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [scores, setScores] = useState<AttributeScoresData[]>([]);
  const [statsRows, setStatsRows] = useState<StatsRowWithName[]>([]);
  const [rawStats, setRawStats] = useState<PlayerStatRow[]>([]);
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
    console.log("[RADAR] Fetching data for player:", playerId);
    
    try {
      // Fetch attribute scores
      const scoresData = await fetchPlayerAllAttributeScores(playerId);
      setScores(scoresData);
      console.log("[RADAR] Fetched scores:", scoresData.length, "rows");

      // Fetch ALL stats rows with full data for local calculation fallback
      const { data: statsData, error } = await supabase
        .from("player_stats")
        .select(`
          *,
          competitions:competition_id(name)
        `)
        .eq("player_id", playerId)
        .not("competition_id", "is", null);

      if (error) {
        console.error("[RADAR] Error fetching stats:", error);
      }

      if (statsData) {
        // Store raw stats for local calculation
        const rawStatsRows = statsData.map((row) => row as unknown as PlayerStatRow);
        setRawStats(rawStatsRows);
        
        // Map for UI
        const mapped = statsData
          .filter((row) => row.minutes > 0)
          .map((row) => ({
            season_year: row.season_year,
            competition_id: row.competition_id as string,
            competition_name: (row.competitions as any)?.name || "Competição",
            minutes: row.minutes,
            rawStats: row as unknown as PlayerStatRow,
          }));
        setStatsRows(mapped);
        console.log("[RADAR] Stats rows with minutes > 0:", mapped.length);

        // Calculate missing scores in background
        if (scoresData.length === 0 && mapped.length > 0) {
          console.log("[RADAR] No persisted scores, calculating...");
          await ensureMissingScores(mapped, scoresData);
        }
      }
    } catch (error) {
      console.error("[RADAR] Error fetching radar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const ensureMissingScores = async (
    stats: StatsRowWithName[],
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
  // Uses persisted scores when available, falls back to local calculation
  const aggregatedScores = useMemo<AggregatedScores | null>(() => {
    // Filter stats rows based on selection
    let filteredStats = statsRows;
    
    if (selectedYear !== "all") {
      filteredStats = filteredStats.filter((s) => String(s.season_year) === selectedYear);
    }
    
    if (selectedCompetition !== "all") {
      filteredStats = filteredStats.filter((s) => s.competition_id === selectedCompetition);
    }
    
    // If we have no stats at all with the filter, return null
    if (filteredStats.length === 0) {
      console.log("[RADAR] No stats match filter, checking raw stats fallback");
      // Try local calculation if we have raw stats
      if (rawStats.length > 0) {
        const result = computeRadarAttributes(rawStats, playerPosition);
        if (result.ata !== null) {
          return {
            ata: result.ata ?? 50,
            tec: result.tec ?? 50,
            def: result.def ?? 50,
            tat: result.tat ?? 50,
            cri: result.cri ?? 50,
            confidence: result.confidence === "high" ? 1 : result.confidence === "medium" ? 0.7 : 0.35,
            totalMinutes: rawStats.reduce((sum, r) => sum + (r.minutes || 0), 0),
          };
        }
      }
      return null;
    }

    // Try to use persisted scores first
    let filteredScores = scores;
    
    if (selectedYear !== "all") {
      filteredScores = filteredScores.filter((s) => String(s.season_year) === selectedYear);
    }
    
    if (selectedCompetition !== "all") {
      filteredScores = filteredScores.filter((s) => s.competition_id === selectedCompetition);
    }

    // If we have persisted scores, use weighted average
    if (filteredScores.length > 0) {
      let totalMinutes = 0;
      let weightedAta = 0;
      let weightedTec = 0;
      let weightedDef = 0;
      let weightedTat = 0;
      let weightedCri = 0;

      for (const row of filteredScores) {
        const details = row.details as { minutes?: number } | null;
        const minutes = details?.minutes ?? (row.attr_confidence ?? 0.5) * 900;
        
        totalMinutes += minutes;
        weightedAta += (row.ata_score_100 ?? 50) * minutes;
        weightedTec += (row.tec_score_100 ?? 50) * minutes;
        weightedDef += (row.def_score_100 ?? 50) * minutes;
        weightedTat += (row.tat_score_100 ?? 50) * minutes;
        weightedCri += (row.cri_score_100 ?? 50) * minutes;
      }

      if (totalMinutes > 0) {
        return {
          ata: weightedAta / totalMinutes,
          tec: weightedTec / totalMinutes,
          def: weightedDef / totalMinutes,
          tat: weightedTat / totalMinutes,
          cri: weightedCri / totalMinutes,
          confidence: clamp(totalMinutes / 900, 0, 1),
          totalMinutes,
        };
      }
    }

    // Fallback: Calculate locally from raw stats matching filter
    console.log("[RADAR] No persisted scores, calculating locally");
    const matchingRawStats = rawStats.filter((r) => {
      const matchYear = selectedYear === "all" || String(r.season_year) === selectedYear;
      const matchComp = selectedCompetition === "all" || r.competition_id === selectedCompetition;
      return matchYear && matchComp && (r.minutes || 0) > 0;
    });

    if (matchingRawStats.length === 0) return null;

    const result = computeRadarAttributes(matchingRawStats, playerPosition);
    const totalMinutes = matchingRawStats.reduce((sum, r) => sum + (r.minutes || 0), 0);

    // Return calculated scores even if confidence is low
    return {
      ata: result.ata ?? 50,
      tec: result.tec ?? 50,
      def: result.def ?? 50,
      tat: result.tat ?? 50,
      cri: result.cri ?? 50,
      confidence: clamp(totalMinutes / 900, 0, 1),
      totalMinutes,
    };
  }, [scores, statsRows, rawStats, selectedYear, selectedCompetition, playerPosition]);

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

  // Only show empty state if there are truly no stats at all
  const hasAnyStats = statsRows.length > 0 || rawStats.length > 0 || scores.length > 0;
  
  if (!hasAnyStats) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Visão geral dos atributos</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">
            Nenhuma estatística registrada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-zinc-900 border-zinc-800 shadow-lg", className)}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-100">
            Atributos
          </CardTitle>
          <div className="flex items-center gap-0.5">
            <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3.5 w-3.5 text-zinc-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-zinc-100">Como são calculados os atributos</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p className="text-zinc-400 text-xs">
                    Atributos calculados por estatísticas a cada 90 minutos, escala 0-100.
                  </p>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-zinc-500", recalculating && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-2 pt-0">
        {/* Compact Filters */}
        {showFilters && (
          <div className="flex gap-1.5 mb-2">
            <Select value={selectedYear} onValueChange={(v) => {
              setSelectedYear(v);
              setSelectedCompetition("all");
            }}>
              <SelectTrigger className="h-7 text-[11px] flex-1 bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {yearOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="h-7 text-[11px] flex-1 bg-zinc-800 border-zinc-700 text-zinc-300">
                <SelectValue placeholder="Comp." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {competitionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Low minutes warning - compact */}
        {showLowMinutesWarning && (
          <div className="flex items-center gap-1 text-[10px] text-amber-500 mb-1">
            <AlertCircle className="h-3 w-3" />
            <span>Poucos min. ({Math.round(aggregatedScores?.totalMinutes || 0)})</span>
          </div>
        )}

        {/* Compact Radar Chart with Labels + Badges */}
        {aggregatedScores ? (
          <div className="relative" style={{ height: "200px" }}>
            {/* Pentagon radar - takes 80% center area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[80%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="78%">
                    <PolarGrid
                      stroke="rgba(113, 113, 122, 0.3)"
                      strokeWidth={1}
                    />
                    <PolarAngleAxis
                      dataKey="attribute"
                      tick={false}
                    />
                    <Radar
                      name="Atributos"
                      dataKey="value"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Labels + Badges at vertices - positioned tightly */}
            {ATTRIBUTE_CONFIG.map((attr) => {
              const value = Math.round(
                aggregatedScores[attr.key as keyof AggregatedScores] as number
              );
              
              // Get badge color based on value
              const getBadgeColor = (v: number) => {
                if (v >= 70) return "bg-emerald-600 text-white";
                if (v >= 50) return "bg-orange-500 text-white";
                if (v >= 30) return "bg-amber-500 text-zinc-900";
                return "bg-red-500 text-white";
              };

              return (
                <div
                  key={attr.key}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                  style={{ 
                    left: `${attr.labelPos.x}%`, 
                    top: `${attr.labelPos.y}%` 
                  }}
                >
                  {/* Label */}
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wide">
                    {attr.label}
                  </span>
                  {/* Value badge - square style */}
                  <div
                    className={cn(
                      "min-w-[28px] h-[20px] flex items-center justify-center",
                      "text-[11px] font-bold rounded-sm shadow-md",
                      getBadgeColor(value)
                    )}
                  >
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasAnyStats ? (
          // Fallback: Show placeholder when filter yields no data
          <div className="relative" style={{ height: "200px" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[80%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart 
                    data={ATTRIBUTE_CONFIG.map((attr) => ({
                      attribute: attr.label,
                      value: 50,
                      fullMark: 100,
                    }))} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius="78%"
                  >
                    <PolarGrid stroke="rgba(113, 113, 122, 0.2)" strokeWidth={1} />
                    <PolarAngleAxis dataKey="attribute" tick={false} />
                    <Radar
                      name="Atributos"
                      dataKey="value"
                      stroke="rgba(113, 113, 122, 0.4)"
                      fill="rgba(113, 113, 122, 0.1)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Labels at vertices */}
            {ATTRIBUTE_CONFIG.map((attr) => (
              <div
                key={attr.key}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                style={{ left: `${attr.labelPos.x}%`, top: `${attr.labelPos.y}%` }}
              >
                <span className="text-[10px] font-bold text-zinc-500 tracking-wide">{attr.label}</span>
                <div className="min-w-[28px] h-[20px] flex items-center justify-center text-[11px] font-bold rounded-sm bg-zinc-700 text-zinc-400">
                  —
                </div>
              </div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] text-zinc-500 bg-zinc-800/90 px-2 py-1 rounded">
                Ajuste o filtro
              </span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-zinc-600" />
            <p className="text-zinc-500 text-xs">Sem dados disponíveis.</p>
          </div>
        )}

        {/* Compact confidence indicator */}
        {aggregatedScores && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 mt-1">
            <span>Confiança:</span>
            <span
              className={cn(
                "font-semibold",
                confidenceLevel === "high" && "text-emerald-500",
                confidenceLevel === "medium" && "text-blue-400",
                confidenceLevel === "low" && "text-amber-500",
                confidenceLevel === "none" && "text-zinc-500"
              )}
            >
              {confidenceLevel === "high" && "Alta"}
              {confidenceLevel === "medium" && "Média"}
              {confidenceLevel === "low" && "Baixa"}
              {confidenceLevel === "none" && "—"}
            </span>
            <span className="text-zinc-600">
              ({Math.round(aggregatedScores.totalMinutes)} min)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
