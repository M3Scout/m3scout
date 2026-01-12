import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  BarChart3,
  AlertCircle 
} from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AttributePentagonRadar, type PlayerStatRow } from "@/components/players/AttributePentagonRadar";
import { computeRadarAttributes, type ConfidenceLevel } from "@/lib/attributeRadar";

interface PlayerAttributeRadarSectionProps {
  playerId: string;
  playerPosition: string;
  seasonFilter?: number;
  competitionFilter?: string;
}

// Polarity metadata: which metrics have "lower is better" semantics
const LOWER_IS_BETTER_METRICS = new Set([
  "yellow_cards",
  "red_cards",
  "fouls_committed",
  "goals_conceded",
  "errors_leading_to_goal",
  "possession_lost",
  "times_dribbled_past",
]);

// Position benchmarks for strengths/weaknesses analysis
const POSITION_BENCHMARKS: Record<string, Record<string, { floor: number; target: number }>> = {
  default: {
    goals: { floor: 0, target: 15 },
    assists: { floor: 0, target: 10 },
    shots: { floor: 5, target: 50 },
    shots_on_target: { floor: 3, target: 30 },
    key_passes: { floor: 5, target: 40 },
    chances_created: { floor: 2, target: 20 },
    tackles: { floor: 10, target: 60 },
    interceptions: { floor: 5, target: 40 },
    recoveries: { floor: 20, target: 100 },
    duels_won: { floor: 20, target: 100 },
    yellow_cards: { floor: 0, target: 10 },
    red_cards: { floor: 0, target: 2 },
  },
};

interface StrengthWeaknessItem {
  key: string;
  label: string;
  value: number;
  delta: number; // Positive = strength, Negative = weakness
}

function getStrengthsAndWeaknesses(
  stats: PlayerStatRow,
  position: string
): { strengths: StrengthWeaknessItem[]; weaknesses: StrengthWeaknessItem[] } {
  const benchmarks = POSITION_BENCHMARKS.default;
  const items: StrengthWeaknessItem[] = [];

  const statConfigs: { key: keyof PlayerStatRow; label: string }[] = [
    { key: "goals", label: "Gols" },
    { key: "assists", label: "Assistências" },
    { key: "shots", label: "Finalizações" },
    { key: "shots_on_target", label: "Chutes no Gol" },
    { key: "key_passes", label: "Passes Decisivos" },
    { key: "chances_created", label: "Chances Criadas" },
    { key: "tackles", label: "Desarmes" },
    { key: "interceptions", label: "Interceptações" },
    { key: "recoveries", label: "Recuperações" },
    { key: "duels_won", label: "Duelos Ganhos" },
    { key: "yellow_cards", label: "Cartões Amarelos" },
    { key: "red_cards", label: "Cartões Vermelhos" },
  ];

  for (const { key, label } of statConfigs) {
    const value = (stats[key] as number) || 0;
    const benchmark = benchmarks[key];
    if (!benchmark) continue;

    const { floor, target } = benchmark;
    const range = target - floor;
    if (range <= 0) continue;

    // Normalize to 0-100
    const normalized = Math.min(100, Math.max(0, ((value - floor) / range) * 100));
    
    // For lower-is-better metrics, invert the interpretation
    const isLowerBetter = LOWER_IS_BETTER_METRICS.has(key);
    const effectiveScore = isLowerBetter ? (100 - normalized) : normalized;
    
    // Delta from 50 (neutral)
    const delta = effectiveScore - 50;

    items.push({ key, label, value, delta });
  }

  // Sort by absolute delta
  items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Strengths: positive delta > 15
  const strengths = items
    .filter(i => i.delta > 15)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  // Weaknesses: negative delta < -15
  const weaknesses = items
    .filter(i => i.delta < -15)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  return { strengths, weaknesses };
}

export function PlayerAttributeRadarSection({
  playerId,
  playerPosition,
  seasonFilter,
  competitionFilter,
}: PlayerAttributeRadarSectionProps) {
  const [stats, setStats] = useState<PlayerStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [playerId, seasonFilter, competitionFilter]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId);

      if (seasonFilter) {
        query = query.eq("season_year", seasonFilter);
      }
      if (competitionFilter) {
        query = query.eq("competition_id", competitionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStats((data || []) as PlayerStatRow[]);
    } catch (error) {
      console.error("Error fetching player stats:", error);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  // Compute radar result
  const radarResult = useMemo(() => {
    if (stats.length === 0) return null;
    return computeRadarAttributes(stats, playerPosition, { logOnce: true });
  }, [stats, playerPosition]);

  // Aggregate stats for strengths/weaknesses
  const aggregatedStats = useMemo<PlayerStatRow>(() => {
    const agg: PlayerStatRow = {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
      tackles: 0,
      interceptions: 0,
      recoveries: 0,
      saves: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
      errors_leading_to_goal: 0,
      aerial_duels_won: 0,
      accurate_passes: 0,
      total_passes: 0,
      duels_won: 0,
      total_duels: 0,
      chances_created: 0,
      key_passes: 0,
      shots: 0,
      shots_on_target: 0,
    };

    for (const row of stats) {
      agg.matches += row.matches || 0;
      agg.minutes += row.minutes || 0;
      agg.goals += row.goals || 0;
      agg.assists += row.assists || 0;
      agg.yellow_cards += row.yellow_cards || 0;
      agg.red_cards += row.red_cards || 0;
      agg.tackles += row.tackles || 0;
      agg.interceptions += row.interceptions || 0;
      agg.recoveries += row.recoveries || 0;
      agg.saves += row.saves || 0;
      agg.goals_conceded += row.goals_conceded || 0;
      agg.clean_sheets += row.clean_sheets || 0;
      agg.penalties_saved += row.penalties_saved || 0;
      agg.errors_leading_to_goal += row.errors_leading_to_goal || 0;
      agg.aerial_duels_won += row.aerial_duels_won || 0;
      agg.accurate_passes += row.accurate_passes || 0;
      agg.total_passes += row.total_passes || 0;
      agg.duels_won += row.duels_won || 0;
      agg.total_duels += row.total_duels || 0;
      agg.chances_created += row.chances_created || 0;
      agg.key_passes += row.key_passes || 0;
      agg.shots += row.shots || 0;
      agg.shots_on_target += row.shots_on_target || 0;
    }

    return agg;
  }, [stats]);

  // Get strengths and weaknesses
  const { strengths, weaknesses } = useMemo(
    () => getStrengthsAndWeaknesses(aggregatedStats, playerPosition),
    [aggregatedStats, playerPosition]
  );

  if (loading) {
    return (
      <Card className="bg-white shadow-md border-0">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* SofaScore-style Pentagon Radar */}
      <AttributePentagonRadar
        statsRows={stats}
        playerPosition={playerPosition}
        loading={loading}
        showConfidence={true}
      />

      {/* Strengths and Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Strengths (Pontos Fortes) - POSITIVE DELTA */}
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                Pontos Fortes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {strengths.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum destaque positivo</p>
              ) : (
                strengths.map(s => (
                  <div key={s.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1">{s.label}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-emerald-700 font-medium">{s.value}</span>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 text-[10px] px-1">
                        +{Math.round(s.delta)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Weaknesses (Áreas de Melhoria) - NEGATIVE DELTA */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <TrendingDown className="w-4 h-4" />
                Áreas de Melhoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weaknesses.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma área crítica</p>
              ) : (
                weaknesses.map(s => (
                  <div key={s.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1">{s.label}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-destructive font-medium">{s.value}</span>
                      <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px] px-1">
                        {Math.round(s.delta)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collapsible Detailed Stats Section */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Estatísticas Detalhadas
                </CardTitle>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    detailsOpen && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {stats.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma estatística registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <StatSummaryItem label="Jogos" value={aggregatedStats.matches} />
                    <StatSummaryItem label="Minutos" value={aggregatedStats.minutes} />
                    <StatSummaryItem label="Gols" value={aggregatedStats.goals} highlight />
                    <StatSummaryItem label="Assist" value={aggregatedStats.assists} highlight />
                  </div>

                  {/* Attack Stats */}
                  <div>
                    <h4 className="text-xs font-medium text-orange-600 mb-2">ATAQUE</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <StatBar label="Gols" value={aggregatedStats.goals} max={20} />
                      <StatBar label="Assistências" value={aggregatedStats.assists} max={15} />
                      <StatBar label="Chutes" value={aggregatedStats.shots} max={80} />
                      <StatBar label="Chutes no Gol" value={aggregatedStats.shots_on_target} max={50} />
                    </div>
                  </div>

                  {/* Creativity Stats */}
                  <div>
                    <h4 className="text-xs font-medium text-purple-600 mb-2">CRIATIVIDADE</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <StatBar label="Passes Decisivos" value={aggregatedStats.key_passes} max={60} />
                      <StatBar label="Chances Criadas" value={aggregatedStats.chances_created} max={30} />
                    </div>
                  </div>

                  {/* Defense Stats */}
                  <div>
                    <h4 className="text-xs font-medium text-blue-600 mb-2">DEFESA</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <StatBar label="Desarmes" value={aggregatedStats.tackles} max={80} />
                      <StatBar label="Interceptações" value={aggregatedStats.interceptions} max={50} />
                      <StatBar label="Recuperações" value={aggregatedStats.recoveries} max={150} />
                      <StatBar label="Duelos Ganhos" value={aggregatedStats.duels_won} max={150} />
                    </div>
                  </div>

                  {/* Discipline Stats */}
                  <div>
                    <h4 className="text-xs font-medium text-emerald-600 mb-2">DISCIPLINA</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <StatBar label="Amarelos" value={aggregatedStats.yellow_cards} max={15} variant="warning" />
                      <StatBar label="Vermelhos" value={aggregatedStats.red_cards} max={3} variant="danger" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// Stat summary item component
function StatSummaryItem({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: number; 
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg py-2 px-1",
      highlight ? "bg-primary/10" : "bg-muted/50"
    )}>
      <div className={cn(
        "text-lg font-bold",
        highlight ? "text-primary" : ""
      )}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

// Stat bar component
function StatBar({ 
  label, 
  value, 
  max,
  variant = "default",
}: { 
  label: string; 
  value: number; 
  max: number;
  variant?: "default" | "warning" | "danger";
}) {
  const percentage = Math.min(100, (value / max) * 100);
  
  const barColors = {
    default: "bg-primary",
    warning: "bg-amber-500",
    danger: "bg-destructive",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
