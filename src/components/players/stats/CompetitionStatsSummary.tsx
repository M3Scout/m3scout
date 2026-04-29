import { Badge } from "@/components/ui/badge";
import { Trophy, Clock } from "lucide-react";
import { isGoalkeeper } from "@/lib/positionUtils";
import type { PlayerStats } from "@/lib/playerStats";
import { normalizePlayerStats } from "@/lib/normalizePlayerStats";
import {
  ScoutCategoryStats,
  OUTFIELD_SCOUT_CATEGORIES,
  GOALKEEPER_SCOUT_CATEGORIES,
  type StatValues,
} from "./ScoutCategoryStats";

interface CompetitionStatsSummaryProps {
  stats: PlayerStats;
  playerPosition?: string;
  competitionName?: string;
  /** mantido por compat — não muda o layout (sempre usa scout cards) */
  compact?: boolean;
}

/**
 * Read-only display de estatísticas completas de um atleta numa
 * temporada/competição. Usa o MESMO componente do Live Scout
 * (ScoutCategoryStats) para garantir consistência visual em todo o sistema.
 */
export function CompetitionStatsSummary({
  stats: rawStats,
  playerPosition = "",
  competitionName,
}: CompetitionStatsSummaryProps) {
  const isGK = isGoalkeeper(playerPosition);
  const stats = normalizePlayerStats(rawStats);

  const safe = (val: number | undefined | null): number =>
    typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;

  // Constrói o StatValues mapeando para as chaves esperadas pelos categories.
  // Quando temos derivados (passes_total_derived, etc.) usamos eles para
  // garantir que % bate com o resto do sistema.
  const values: StatValues = {
    // attack
    goals: safe(stats.goals),
    shots_on_target: safe(stats.shots_on_target),
    shots: safe(stats.shots_total_derived),
    shots_blocked: safe(stats.shots_blocked),
    offsides: safe(stats.offsides),

    // passes
    assists: safe(stats.assists),
    key_passes: safe(stats.key_passes),
    chances_created: safe(stats.chances_created),
    accurate_passes: safe(stats.accurate_passes),
    total_passes: safe(stats.passes_total_derived),

    // dribbles
    successful_dribbles: safe(stats.successful_dribbles),
    total_dribbles: safe(stats.dribbles_total_derived),
    fouls_drawn: safe(stats.fouls_drawn),
    possession_lost: safe(stats.possession_lost),

    // defense
    tackles: safe(stats.tackles),
    interceptions: safe(stats.interceptions),
    clearances: safe(stats.clearances),
    recoveries: safe(stats.recoveries),
    aerial_duels_won: safe(stats.aerial_duels_won),
    aerial_duels_total: safe(stats.aerial_duels_total_derived),
    ground_duels_won: safe(stats.ground_duels_won),
    ground_duels_total: safe(stats.ground_duels_total_derived),
    fouls_committed: safe(stats.fouls_committed),
    yellow_cards: safe(stats.yellow_cards),
    red_cards: safe(stats.red_cards),

    // gk
    saves: safe(stats.saves),
    goals_conceded: safe(stats.goals_conceded),
    clean_sheets: safe(stats.clean_sheets),
    penalties_saved: safe(stats.penalties_saved),
    errors_leading_to_goal: safe(stats.errors_leading_to_goal),

    // gk advanced
    saves_inside_box: safe(stats.saves_inside_box),
    punches: safe(stats.punches),
    high_claims: safe(stats.high_claims),
    successful_runs_out: safe(stats.successful_runs_out),
    total_runs_out: safe(stats.total_runs_out),

    // gk passes
    long_passes_accurate: safe(stats.long_passes_accurate),
    long_passes_total: safe(stats.long_passes_total),
  };

  const categories = isGK ? GOALKEEPER_SCOUT_CATEGORIES : OUTFIELD_SCOUT_CATEGORIES;

  return (
    <div className="space-y-3 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        {competitionName && <Badge variant="secondary">{competitionName}</Badge>}
        {stats.season_year ? <Badge variant="outline">{stats.season_year}</Badge> : null}
        <Badge variant="outline" className="gap-1">
          <Trophy className="w-3 h-3" />
          {safe(stats.matches)} jogos
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          {safe(stats.minutes)} min
        </Badge>
      </div>

      <ScoutCategoryStats categories={categories} values={values} mode="readonly" />
    </div>
  );
}
