import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import { PositionGroupV2 } from "@/lib/playerRatingV2";

interface StatBreakdownItem {
  stat: string;
  label: string;
  value: number;
  score: number;
  weight: number;
  adjusted_weight: number;
  available: boolean;
}

interface StatsRadarChartProps {
  statBreakdown: StatBreakdownItem[];
  positionGroup: PositionGroupV2;
  positionGroupLabel: string;
}

// Polarity metadata: which metrics have "lower is better" semantics
const LOWER_IS_BETTER_STATS = new Set([
  // Cards & discipline
  "yellow_cards",
  "red_cards",
  "cards",
  "discipline", // if high cards = low discipline score, this may not apply
  // Fouls
  "fouls_committed",
  "fouls",
  // Turnovers / possession loss
  "turnovers",
  "lost_possession",
  "possession_lost",
  // Errors
  "errors_leading_to_shot",
  "errors_leading_to_goal",
  "errors_led_to_goal",
  "errors",
  // Goalkeeper
  "goals_conceded",
  "ga_per_90",
  // Dribbled past
  "times_dribbled_past",
]);

// Position benchmarks (average scores for each stat by position group)
// These represent the "average player" in each position (score ~50-60)
const POSITION_BENCHMARKS: Record<PositionGroupV2, Record<string, number>> = {
  goalkeeper: {
    minutes_games: 55,
    saves: 55,
    goals_conceded: 50,
    errors: 60,
    accurate_passes: 50,
    penalties_saved: 45,
    aerial_duels: 55,
    discipline: 70,
  },
  center_back: {
    tackles: 55,
    interceptions: 55,
    minutes_games: 55,
    duels_won: 55,
    recoveries: 55,
    accurate_passes: 50,
    discipline: 60,
    ga_per_90: 40,
    pass_accuracy: 55,
  },
  defensive_mid: {
    minutes_games: 55,
    tackles: 55,
    recoveries: 55,
    interceptions: 55,
    accurate_passes: 55,
    ga_per_90: 45,
    pass_accuracy: 55,
    discipline: 60,
  },
  midfielder: {
    ga_per_90: 50,
    chances_created: 50,
    key_passes: 50,
    minutes_games: 55,
    accurate_passes: 55,
    shots: 50,
    key_pass_accuracy: 50,
    pass_accuracy: 55,
    discipline: 65,
  },
  forward: {
    goals_per_90: 50,
    ga_per_90: 50,
    shots_on_target: 50,
    shots: 50,
    minutes_games: 55,
    offensive_involvement: 50,
    discipline: 65,
  },
};

function getComparisonLabel(playerScore: number, benchmark: number): { label: string; icon: typeof TrendingUp; color: string } {
  const diff = playerScore - benchmark;
  if (diff >= 15) return { label: "Muito acima", icon: TrendingUp, color: "text-emerald-500" };
  if (diff >= 5) return { label: "Acima", icon: TrendingUp, color: "text-primary" };
  if (diff >= -5) return { label: "Na média", icon: Minus, color: "text-muted-foreground" };
  if (diff >= -15) return { label: "Abaixo", icon: TrendingDown, color: "text-amber-500" };
  return { label: "Muito abaixo", icon: TrendingDown, color: "text-destructive" };
}

export function StatsRadarChart({ statBreakdown, positionGroup, positionGroupLabel }: StatsRadarChartProps) {
  const benchmarks = POSITION_BENCHMARKS[positionGroup] || {};
  
  // Prepare data for radar chart - only available stats
  const availableStats = safeArray(statBreakdown).filter(s => s.available);
  
  // Build radar data WITH polarity and effectiveDelta for tooltip consistency
  const radarData = availableStats.map(stat => {
    const benchmark = benchmarks[stat.stat] || 50;
    const rawDiff = stat.score - benchmark;
    const polarity = LOWER_IS_BETTER_STATS.has(stat.stat) ? "lower_is_better" : "higher_is_better";
    const effectiveDelta = polarity === "lower_is_better" ? -rawDiff : rawDiff;
    const bucket = effectiveDelta >= 10 ? "strength" : effectiveDelta <= -10 ? "attention" : "neutral";
    
    return {
      stat: stat.label,
      statKey: stat.stat,
      fullLabel: stat.label,
      jogador: Math.round(stat.score),
      media: benchmark,
      weight: stat.adjusted_weight,
      polarity,
      effectiveDelta: Math.round(effectiveDelta),
      bucket,
    };
  });

  // Calculate summary statistics
  const totalPlayerScore = availableStats.reduce((sum, s) => sum + s.score * s.adjusted_weight, 0);
  const totalWeight = availableStats.reduce((sum, s) => sum + s.adjusted_weight, 0);
  const avgPlayerScore = totalWeight > 0 ? totalPlayerScore / totalWeight : 0;
  
  const totalBenchmarkScore = availableStats.reduce((sum, s) => sum + (benchmarks[s.stat] || 50) * s.adjusted_weight, 0);
  const avgBenchmarkScore = totalWeight > 0 ? totalBenchmarkScore / totalWeight : 50;
  
  const overallComparison = getComparisonLabel(avgPlayerScore, avgBenchmarkScore);
  const OverallIcon = overallComparison.icon;

  // Find strengths and weaknesses WITH POLARITY AWARENESS
  const statsWithDiff = availableStats.map(s => {
    const benchmark = benchmarks[s.stat] || 50;
    const rawDiff = s.score - benchmark;
    const polarity = LOWER_IS_BETTER_STATS.has(s.stat) ? "lower_is_better" : "higher_is_better";
    // For "lower is better" stats, invert the effective delta
    // If player score is HIGH on a "lower is better" stat, that's BAD (negative effectiveDelta)
    const effectiveDelta = polarity === "lower_is_better" ? -rawDiff : rawDiff;

    // DEV: Log polarity calculation for verification
    if (import.meta.env.DEV) {
      console.log("[POLARITY]", {
        metric: s.stat,
        label: s.label,
        player: Math.round(s.score),
        avg: benchmark,
        polarity,
        rawDiff: Math.round(rawDiff),
        effectiveDelta: Math.round(effectiveDelta),
        bucket: effectiveDelta >= 10 ? "strength" : effectiveDelta <= -10 ? "weakness" : "neutral",
      });
    }

    return {
      ...s,
      rawDiff,
      polarity,
      effectiveDelta,
    };
  });
  
  // Strengths: effectiveDelta >= 10 (player is better than average, considering polarity)
  const strengths = statsWithDiff.filter(s => s.effectiveDelta >= 10).sort((a, b) => b.effectiveDelta - a.effectiveDelta).slice(0, 3);
  // Weaknesses: effectiveDelta <= -10 (player is worse than average, considering polarity)
  const weaknesses = statsWithDiff.filter(s => s.effectiveDelta <= -10).sort((a, b) => a.effectiveDelta - b.effectiveDelta).slice(0, 3);

  if (radarData.length < 3) {
    return (
      <Card className="bg-secondary/20">
        <CardContent className="py-8 text-center">
          <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            Dados insuficientes para gerar o gráfico radar.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            São necessárias pelo menos 3 estatísticas disponíveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-secondary/30 to-secondary/10 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Comparação com Média</p>
              <div className="flex items-center gap-2 mt-1">
                <OverallIcon className={cn("w-5 h-5", overallComparison.color)} />
                <span className={cn("text-lg font-semibold", overallComparison.color)}>
                  {overallComparison.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Score Ponderado</p>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-2xl font-bold text-primary">{Math.round(avgPlayerScore)}</span>
                <span className="text-sm text-muted-foreground">vs</span>
                <span className="text-lg text-muted-foreground">{Math.round(avgBenchmarkScore)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Perfil Comparativo - {positionGroupLabel}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Jogador vs média da posição (nota 0-100)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.5}
                />
                <PolarAngleAxis 
                  dataKey="stat" 
                  tick={{ 
                    fill: "hsl(var(--muted-foreground))", 
                    fontSize: 10,
                  }}
                  tickLine={false}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickCount={5}
                  axisLine={false}
                />
                <Radar
                  name="Média da Posição"
                  dataKey="media"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Radar
                  name="Jogador"
                  dataKey="jogador"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '12px',
                    paddingTop: '10px',
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const { effectiveDelta, bucket, polarity } = data;
                      
                      // Tooltip label and color based on bucket (same source of truth as bar colors)
                      const getBucketInfo = () => {
                        if (bucket === "strength") {
                          return {
                            label: "Ponto Forte",
                            message: "Contribui positivamente para o desempenho",
                            color: "text-emerald-500",
                            icon: "↑",
                          };
                        }
                        if (bucket === "attention") {
                          return {
                            label: "Ponto de Atenção",
                            message: "Área que pode ser melhorada",
                            color: "text-destructive",
                            icon: "↓",
                          };
                        }
                        return {
                          label: "Na Média",
                          message: "Dentro do esperado para a posição",
                          color: "text-muted-foreground",
                          icon: "–",
                        };
                      };
                      
                      const bucketInfo = getBucketInfo();

                      // DEV: Log tooltip data for verification
                      if (import.meta.env.DEV) {
                        console.log("[TOOLTIP]", {
                          metric: data.statKey,
                          label: data.fullLabel,
                          player: data.jogador,
                          avg: data.media,
                          polarity,
                          effectiveDelta,
                          bucket,
                          tooltipLabel: bucketInfo.label,
                        });
                      }

                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-[220px]">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn("text-lg", bucketInfo.color)}>{bucketInfo.icon}</span>
                            <p className="font-medium text-sm">{data.fullLabel}</p>
                          </div>
                          <div className={cn("text-xs font-semibold mb-2 px-2 py-1 rounded", 
                            bucket === "strength" ? "bg-emerald-500/10 text-emerald-500" :
                            bucket === "attention" ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {bucketInfo.label}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{bucketInfo.message}</p>
                          <div className="space-y-1 text-xs border-t border-border/50 pt-2">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Jogador:</span>
                              <span className="font-semibold text-primary">{data.jogador}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Média posição:</span>
                              <span className="font-medium">{data.media}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Delta efetivo:</span>
                              <span className={cn("font-semibold", bucketInfo.color)}>
                                {effectiveDelta >= 0 ? "+" : ""}{effectiveDelta}
                              </span>
                            </div>
                            {polarity === "lower_is_better" && (
                              <div className="text-[10px] text-muted-foreground italic pt-1">
                                (menor é melhor)
                              </div>
                            )}
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Peso:</span>
                              <span className="font-medium">{Math.round(data.weight)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        {/* Strengths */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-500">
              <TrendingUp className="w-4 h-4" />
              Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strengths.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum destaque positivo</p>
            ) : (
              strengths.map(s => (
                <div key={s.stat} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{s.label}</span>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 ml-2">
                    +{Math.round(s.effectiveDelta)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
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
                <div key={s.stat} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{s.label}</span>
                  <Badge variant="outline" className="border-destructive/50 text-destructive ml-2">
                    {Math.round(s.effectiveDelta)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend explanation */}
      <p className="text-xs text-muted-foreground text-center">
        A área tracejada representa a média esperada para um jogador da posição {typeof positionGroupLabel === "string" ? positionGroupLabel.toLowerCase() : "—"}.
        A área colorida representa o desempenho real do jogador.
      </p>
    </div>
  );
}
