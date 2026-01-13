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

// Vertex positions for pentagon - SofaScore style (tight to vertices)
// Positioned with absolute anchors: ATA top, TÉC right, TÁT bottom-right, DEF bottom-left, CRI left
const ATTRIBUTE_CONFIG = [
  { key: "ata", label: "ATA", fullLabel: "Ataque", description: "Gols, assistências, finalizações", pos: { top: "2%", left: "50%" } },
  { key: "tec", label: "TÉC", fullLabel: "Técnica", description: "Precisão de passes, dribles, controle", pos: { top: "32%", right: "2%" } },
  { key: "tat", label: "TÁT", fullLabel: "Tática", description: "Disciplina, posicionamento, consistência", pos: { bottom: "6%", right: "12%" } },
  { key: "def", label: "DEF", fullLabel: "Defesa", description: "Desarmes, interceptações, recuperações", pos: { bottom: "6%", left: "12%" } },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", description: "Passes decisivos, chances criadas", pos: { top: "32%", left: "2%" } },
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
    <Card className={cn("bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden", className)}>
      {/* Compact header - title left, info right */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <span className="text-xs font-semibold text-zinc-100">
          Visão geral dos atributos
        </span>
        <div className="flex items-center gap-0.5">
          <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-zinc-800">
                <Info className="h-3 w-3 text-zinc-500" />
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
            className="h-5 w-5 hover:bg-zinc-800"
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            <RefreshCw className={cn("h-3 w-3 text-zinc-500", recalculating && "animate-spin")} />
          </Button>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Compact Filters - inline */}
        {showFilters && (
          <div className="flex gap-1.5 px-2 py-1.5 bg-zinc-800/40">
            <Select value={selectedYear} onValueChange={(v) => {
              setSelectedYear(v);
              setSelectedCompetition("all");
            }}>
              <SelectTrigger className="h-6 text-[10px] flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 px-2">
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
              <SelectTrigger className="h-6 text-[10px] flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 px-2">
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

        {/* Low minutes warning - inline compact */}
        {showLowMinutesWarning && (
          <div className="flex items-center justify-center gap-1 text-[9px] text-amber-500 py-0.5 bg-amber-500/10">
            <AlertCircle className="h-2.5 w-2.5" />
            <span>Poucos min. ({Math.round(aggregatedScores?.totalMinutes || 0)})</span>
          </div>
        )}

        {/* SofaScore-style Radar with tight labels+badges */}
        {aggregatedScores ? (
          <div className="relative mx-auto" style={{ width: "100%", aspectRatio: "1 / 0.9" }}>
            {/* Pentagon radar - centered, fills container */}
            <div className="absolute inset-0 flex items-center justify-center pt-2 pb-4 px-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid
                    stroke="rgba(82, 82, 91, 0.5)"
                    strokeWidth={1}
                    gridType="polygon"
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
                    fillOpacity={0.25}
                    strokeWidth={2.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Labels + Badges - absolute positioned at vertices */}
            {ATTRIBUTE_CONFIG.map((attr) => {
              const value = Math.round(
                aggregatedScores[attr.key as keyof AggregatedScores] as number
              );
              
              // Badge color based on score
              const getBadgeStyle = (v: number) => {
                if (v >= 70) return "bg-emerald-500 text-white shadow-emerald-500/30";
                if (v >= 50) return "bg-orange-500 text-white shadow-orange-500/30";
                if (v >= 30) return "bg-amber-500 text-zinc-900 shadow-amber-500/30";
                return "bg-red-500 text-white shadow-red-500/30";
              };

              return (
                <div
                  key={attr.key}
                  className="absolute flex flex-col items-center gap-0 pointer-events-none"
                  style={{ 
                    ...attr.pos,
                    transform: attr.pos.left === "50%" ? "translateX(-50%)" : 
                               attr.pos.right ? "translateX(0)" : "translateX(0)"
                  }}
                >
                  {/* Label - small, muted */}
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider leading-none">
                    {attr.label}
                  </span>
                  {/* Value badge - compact square */}
                  <div
                    className={cn(
                      "min-w-[24px] h-[18px] flex items-center justify-center mt-0.5",
                      "text-[10px] font-bold rounded shadow-md",
                      getBadgeStyle(value)
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
          <div className="relative mx-auto" style={{ width: "100%", aspectRatio: "1 / 0.9" }}>
            <div className="absolute inset-0 flex items-center justify-center pt-2 pb-4 px-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart 
                  data={ATTRIBUTE_CONFIG.map((attr) => ({
                    attribute: attr.label,
                    value: 50,
                    fullMark: 100,
                  }))} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius="72%"
                >
                  <PolarGrid stroke="rgba(82, 82, 91, 0.3)" strokeWidth={1} gridType="polygon" />
                  <PolarAngleAxis dataKey="attribute" tick={false} />
                  <Radar
                    name="Atributos"
                    dataKey="value"
                    stroke="rgba(82, 82, 91, 0.5)"
                    fill="rgba(82, 82, 91, 0.15)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Labels at vertices - muted */}
            {ATTRIBUTE_CONFIG.map((attr) => (
              <div
                key={attr.key}
                className="absolute flex flex-col items-center gap-0 pointer-events-none"
                style={{ 
                  ...attr.pos,
                  transform: attr.pos.left === "50%" ? "translateX(-50%)" : "translateX(0)"
                }}
              >
                <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider leading-none">{attr.label}</span>
                <div className="min-w-[24px] h-[18px] flex items-center justify-center mt-0.5 text-[10px] font-bold rounded bg-zinc-700 text-zinc-500 shadow">
                  —
                </div>
              </div>
            ))}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] text-zinc-500 bg-zinc-800/95 px-2 py-1 rounded-sm border border-zinc-700">
                Ajuste o filtro
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-zinc-600" />
            <p className="text-zinc-500 text-[10px]">Sem dados disponíveis.</p>
          </div>
        )}

        {/* Compact confidence footer */}
        {aggregatedScores && (
          <div className="flex items-center justify-center gap-1 py-1.5 text-[9px] text-zinc-500 border-t border-zinc-800/50">
            <span className="text-zinc-600">Confiança:</span>
            <span
              className={cn(
                "font-semibold",
                confidenceLevel === "high" && "text-emerald-400",
                confidenceLevel === "medium" && "text-blue-400",
                confidenceLevel === "low" && "text-amber-400",
                confidenceLevel === "none" && "text-zinc-500"
              )}
            >
              {confidenceLevel === "high" && "Alta"}
              {confidenceLevel === "medium" && "Média"}
              {confidenceLevel === "low" && "Baixa"}
              {confidenceLevel === "none" && "—"}
            </span>
            <span className="text-zinc-600">
              • {Math.round(aggregatedScores.totalMinutes)} min
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
