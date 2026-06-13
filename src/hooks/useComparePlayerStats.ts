import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  usePlayerMatchStatsBySeasonCompetition,
} from "@/hooks/usePlayerMatchStats";
import { useManualPlayerStats } from "@/hooks/useManualPlayerStats";

export type CompareStatsSource = "live" | "manual" | "player_stats";

export interface CompareStatRow {
  season_year: number;
  competition_id: string | null;
  competition_name: string | null;
  source: CompareStatsSource;

  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  accurate_passes: number;
  total_passes: number;
  successful_dribbles: number;
  total_dribbles: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_drawn: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  clearances: number;
  ball_actions: number;
}

export interface CompareAggregatedStats
  extends Omit<CompareStatRow, "season_year" | "competition_id" | "competition_name" | "source"> {}

function safeInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function aggregate(rows: CompareStatRow[]): CompareAggregatedStats | null {
  if (rows.length === 0) return null;
  return rows.reduce<CompareAggregatedStats>(
    (acc, r) => ({
      matches:            acc.matches            + r.matches,
      minutes:            acc.minutes            + r.minutes,
      goals:              acc.goals              + r.goals,
      assists:            acc.assists            + r.assists,
      shots:              acc.shots              + r.shots,
      shots_on_target:    acc.shots_on_target    + r.shots_on_target,
      key_passes:         acc.key_passes         + r.key_passes,
      chances_created:    acc.chances_created    + r.chances_created,
      accurate_passes:    acc.accurate_passes    + r.accurate_passes,
      total_passes:       acc.total_passes       + r.total_passes,
      successful_dribbles:acc.successful_dribbles+ r.successful_dribbles,
      total_dribbles:     acc.total_dribbles     + r.total_dribbles,
      tackles:            acc.tackles            + r.tackles,
      interceptions:      acc.interceptions      + r.interceptions,
      recoveries:         acc.recoveries         + r.recoveries,
      duels_won:          acc.duels_won          + r.duels_won,
      total_duels:        acc.total_duels        + r.total_duels,
      aerial_duels_won:   acc.aerial_duels_won   + r.aerial_duels_won,
      aerial_duels_total: acc.aerial_duels_total + r.aerial_duels_total,
      ground_duels_won:   acc.ground_duels_won   + r.ground_duels_won,
      ground_duels_total: acc.ground_duels_total + r.ground_duels_total,
      yellow_cards:       acc.yellow_cards       + r.yellow_cards,
      red_cards:          acc.red_cards          + r.red_cards,
      fouls_committed:    acc.fouls_committed    + r.fouls_committed,
      fouls_drawn:        acc.fouls_drawn        + r.fouls_drawn,
      saves:              acc.saves              + r.saves,
      goals_conceded:     acc.goals_conceded     + r.goals_conceded,
      clean_sheets:       acc.clean_sheets       + r.clean_sheets,
      penalties_saved:    acc.penalties_saved    + r.penalties_saved,
      errors_leading_to_goal: acc.errors_leading_to_goal + r.errors_leading_to_goal,
      clearances:         acc.clearances         + r.clearances,
      ball_actions:       acc.ball_actions       + r.ball_actions,
    }),
    {
      matches: 0, minutes: 0, goals: 0, assists: 0, shots: 0, shots_on_target: 0,
      key_passes: 0, chances_created: 0, accurate_passes: 0, total_passes: 0,
      successful_dribbles: 0, total_dribbles: 0, tackles: 0, interceptions: 0,
      recoveries: 0, duels_won: 0, total_duels: 0, aerial_duels_won: 0,
      aerial_duels_total: 0, ground_duels_won: 0, ground_duels_total: 0,
      yellow_cards: 0, red_cards: 0, fouls_committed: 0, fouls_drawn: 0,
      saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
      errors_leading_to_goal: 0, clearances: 0, ball_actions: 0,
    }
  );
}

/**
 * Hook that uses the same three real data sources as StatsTab (athlete detail page):
 *  1. usePlayerMatchStatsBySeasonCompetition — live match events
 *  2. useManualPlayerStats — manual_player_stats table
 *  3. player_stats table query — legacy/correction rows
 *
 * Guarantees the same numbers shown in /dashboard/atletas/:id.
 */
export function useComparePlayerStats(params: {
  playerId: string | null;
  seasonFilter: string;
  competitionFilter: string;
}) {
  const { playerId, seasonFilter, competitionFilter } = params;
  const enabled = !!playerId;
  const pid = playerId ?? "";

  // ── 1. Live match stats ────────────────────────────────────────────────────
  const { stats: liveStats, isLoading: liveLoading } =
    usePlayerMatchStatsBySeasonCompetition({ playerId: pid, enabled });

  // ── 2. Manual stats ────────────────────────────────────────────────────────
  const { manualStats, isLoading: manualLoading } =
    useManualPlayerStats({ playerId: pid, enabled });

  // ── 3. Legacy player_stats table ──────────────────────────────────────────
  const { data: rawPlayerStats = [], isLoading: psLoading } = useQuery({
    queryKey: ["compare-player-stats-legacy", pid],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*, competition:competitions(id, name, display_name)")
        .eq("player_id", pid);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  // ── Build unified rows ─────────────────────────────────────────────────────
  const mergedRows = useMemo((): CompareStatRow[] => {
    if (!enabled) return [];

    const rows: CompareStatRow[] = [];

    // Live
    liveStats.forEach(sc => {
      const s = sc.stats;
      rows.push({
        season_year:         sc.season_year,
        competition_id:      sc.competition_id,
        competition_name:    sc.competition_name,
        source:              "live",
        matches:             safeInt(s.matches),
        minutes:             safeInt(s.minutes),
        goals:               safeInt(s.goals),
        assists:             safeInt(s.assists),
        shots:               safeInt(s.shots),
        shots_on_target:     safeInt(s.shots_on_target),
        key_passes:          safeInt(s.key_passes),
        chances_created:     safeInt(s.chances_created),
        accurate_passes:     safeInt(s.passes_completed),
        total_passes:        safeInt(s.passes_total),
        successful_dribbles: safeInt(s.dribbles_success),
        total_dribbles:      safeInt(s.dribbles_total),
        tackles:             safeInt(s.tackles),
        interceptions:       safeInt(s.interceptions),
        recoveries:          safeInt(s.recoveries),
        duels_won:           safeInt(s.duels_won),
        total_duels:         safeInt(s.duels_total),
        aerial_duels_won:    safeInt(s.aerial_duels_won),
        aerial_duels_total:  safeInt(s.aerial_duels_total),
        ground_duels_won:    safeInt(s.ground_duels_won),
        ground_duels_total:  safeInt(s.ground_duels_total),
        yellow_cards:        safeInt(s.yellow_cards),
        red_cards:           safeInt(s.red_cards),
        fouls_committed:     safeInt(s.fouls_committed),
        fouls_drawn:         safeInt(s.fouls_suffered),
        saves:               safeInt(s.saves),
        goals_conceded:      safeInt(s.goals_conceded),
        clean_sheets:        safeInt(s.clean_sheets),
        penalties_saved:     safeInt(s.penalties_saved),
        errors_leading_to_goal: 0,
        clearances:          safeInt(s.clearances),
        ball_actions:        safeInt(s.ball_actions),
      });
    });

    // Manual
    manualStats.forEach(ms => {
      rows.push({
        season_year:         ms.season_year,
        competition_id:      ms.competition_id,
        competition_name:    ms.competition?.display_name || ms.competition?.name || null,
        source:              "manual",
        matches:             safeInt(ms.games),
        minutes:             safeInt(ms.minutes),
        goals:               safeInt(ms.goals),
        assists:             safeInt(ms.assists),
        shots:               safeInt(ms.shots),
        shots_on_target:     safeInt(ms.shots_on_target),
        key_passes:          safeInt(ms.key_passes),
        chances_created:     safeInt(ms.chances_created),
        accurate_passes:     safeInt(ms.passes_completed),
        total_passes:        safeInt(ms.passes_completed) + safeInt(ms.passes_failed),
        successful_dribbles: safeInt(ms.dribbles_success),
        total_dribbles:      safeInt(ms.dribbles_success) + safeInt(ms.dribbles_failed),
        tackles:             safeInt(ms.tackles),
        interceptions:       safeInt(ms.interceptions),
        recoveries:          safeInt(ms.recoveries),
        duels_won:           safeInt(ms.duels_won),
        total_duels:         safeInt(ms.duels_won) + safeInt(ms.duels_lost),
        aerial_duels_won:    safeInt(ms.aerial_duels_won),
        aerial_duels_total:  safeInt(ms.aerial_duels_won) + safeInt(ms.aerial_duels_lost),
        ground_duels_won:    safeInt(ms.duels_won) - safeInt(ms.aerial_duels_won),
        ground_duels_total:  (safeInt(ms.duels_won) + safeInt(ms.duels_lost)) -
                             (safeInt(ms.aerial_duels_won) + safeInt(ms.aerial_duels_lost)),
        yellow_cards:        safeInt(ms.yellow_cards),
        red_cards:           safeInt(ms.red_cards),
        fouls_committed:     safeInt(ms.fouls_committed),
        fouls_drawn:         safeInt(ms.fouls_suffered),
        saves:               safeInt(ms.saves),
        goals_conceded:      safeInt(ms.goals_conceded),
        clean_sheets:        safeInt(ms.clean_sheets),
        penalties_saved:     safeInt(ms.penalties_saved),
        errors_leading_to_goal: 0,
        clearances:          safeInt(ms.clearances),
        ball_actions:        0,
      });
    });

    // Legacy player_stats
    rawPlayerStats.forEach((ps: any) => {
      const comp = ps.competition;
      rows.push({
        season_year:         safeInt(ps.season_year),
        competition_id:      ps.competition_id ?? null,
        competition_name:    comp?.display_name || comp?.name || null,
        source:              "player_stats",
        matches:             safeInt(ps.matches),
        minutes:             safeInt(ps.minutes),
        goals:               safeInt(ps.goals),
        assists:             safeInt(ps.assists),
        shots:               safeInt(ps.shots),
        shots_on_target:     safeInt(ps.shots_on_target),
        key_passes:          safeInt(ps.key_passes),
        chances_created:     safeInt(ps.chances_created),
        accurate_passes:     safeInt(ps.accurate_passes),
        total_passes:        safeInt(ps.accurate_passes) + safeInt(ps.total_passes) + safeInt(ps.progressive_passes),
        successful_dribbles: safeInt(ps.successful_dribbles),
        total_dribbles:      safeInt(ps.successful_dribbles) + safeInt(ps.total_dribbles),
        tackles:             safeInt(ps.tackles),
        interceptions:       safeInt(ps.interceptions),
        recoveries:          safeInt(ps.recoveries),
        duels_won:           safeInt(ps.duels_won),
        total_duels:         safeInt(ps.total_duels),
        aerial_duels_won:    safeInt(ps.aerial_duels_won),
        aerial_duels_total:  safeInt(ps.aerial_duels_won) + safeInt(ps.aerial_duels_total),
        ground_duels_won:    safeInt(ps.ground_duels_won),
        ground_duels_total:  safeInt(ps.ground_duels_won) + safeInt(ps.ground_duels_total),
        yellow_cards:        safeInt(ps.yellow_cards),
        red_cards:           safeInt(ps.red_cards),
        fouls_committed:     safeInt(ps.fouls_committed),
        fouls_drawn:         safeInt(ps.fouls_drawn),
        saves:               safeInt(ps.saves),
        goals_conceded:      safeInt(ps.goals_conceded),
        clean_sheets:        safeInt(ps.clean_sheets),
        penalties_saved:     safeInt(ps.penalties_saved),
        errors_leading_to_goal: safeInt(ps.errors_leading_to_goal),
        clearances:          safeInt(ps.clearances),
        ball_actions:        0,
      });
    });

    return rows.sort((a, b) => {
      if (b.season_year !== a.season_year) return b.season_year - a.season_year;
      return (a.competition_name || "").localeCompare(b.competition_name || "");
    });
  }, [enabled, liveStats, manualStats, rawPlayerStats]);

  const filteredRows = useMemo(() => {
    let out = mergedRows;
    if (seasonFilter !== "all") {
      const y = Number(seasonFilter);
      out = out.filter(r => r.season_year === y);
    }
    if (competitionFilter !== "all") {
      out = out.filter(r => r.competition_id === competitionFilter);
    }
    return out;
  }, [mergedRows, seasonFilter, competitionFilter]);

  const aggregatedStats = useMemo(() => aggregate(filteredRows), [filteredRows]);

  return {
    rows: mergedRows,
    filteredRows,
    aggregatedStats,
    isLoading: liveLoading || manualLoading || psLoading,
    error: null,
  };
}
