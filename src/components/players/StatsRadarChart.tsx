import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import { PositionGroupV2 } from "@/lib/playerRatingV2";
import { AttributePentagonRadar } from "./AttributePentagonRadar";
import { computeAttributeRadar } from "@/lib/attributeRadar";

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
  "discipline",
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

export function StatsRadarChart({ statBreakdown, positionGroup, positionGroupLabel }: StatsRadarChartProps) {
  const benchmarks = POSITION_BENCHMARKS[positionGroup] || {};
  
  // Prepare stats
  const availableStats = safeArray(statBreakdown).filter(s => s.available);
  
  // Compute pentagon attribute scores
  const attributeScores = computeAttributeRadar(statBreakdown, positionGroup);

  // Find strengths and weaknesses WITH POLARITY AWARENESS
  const statsWithDiff = availableStats.map(s => {
    const benchmark = benchmarks[s.stat] || 50;
    const rawDiff = s.score - benchmark;
    const polarity = LOWER_IS_BETTER_STATS.has(s.stat) ? "lower_is_better" : "higher_is_better";
    const effectiveDelta = polarity === "lower_is_better" ? -rawDiff : rawDiff;

    return {
      ...s,
      rawDiff,
      polarity,
      effectiveDelta,
    };
  });
  
  // Strengths: effectiveDelta >= 10
  const strengths = statsWithDiff.filter(s => s.effectiveDelta >= 10).sort((a, b) => b.effectiveDelta - a.effectiveDelta).slice(0, 3);
  // Weaknesses: effectiveDelta <= -10
  const weaknesses = statsWithDiff.filter(s => s.effectiveDelta <= -10).sort((a, b) => a.effectiveDelta - b.effectiveDelta).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* SofaScore-style Pentagon Radar */}
      <AttributePentagonRadar 
        attributes={attributeScores}
        loading={false}
      />

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
    </div>
  );
}
