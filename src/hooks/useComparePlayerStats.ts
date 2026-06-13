import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  usePlayerMatchStatsBySeasonCompetition,
} from "@/hooks/usePlayerMatchStats";
import { useManualPlayerStats } from "@/hooks/useManualPlayerStats";
import { mergeSeasonRows, type PublicSeasonRow, type SeasonSource } from "@/lib/mergeSeasonStats";

export type CompareStatsSource = SeasonSource;

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

function publicRowToCompareRow(row: PublicSeasonRow): CompareStatRow {
  const s = row.stats;
  return {
    season_year:         row.season_year,
    competition_id:      row.competition_id,
    competition_name:    row.competition_name,
    source:              row.source,
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
  };
}

/**
 * Usa as mesmas três fontes + mergeSeasonRows do StatsTab para garantir
 * números idênticos à página /dashboard/atletas/:id.
 */
export function useComparePlayerStats(params: {
  playerId: string | null;
  seasonFilter: string;
  competitionFilter: string;
}) {
  const { playerId, seasonFilter, competitionFilter } = params;
  const enabled = !!playerId;
  const pid = playerId ?? "";

  // 1. Live match stats
  const { stats: liveStats, seasons, bySeason, isLoading: liveLoading } =
    usePlayerMatchStatsBySeasonCompetition({ playerId: pid, enabled });

  // 2. Manual stats
  const { manualStats, isLoading: manualLoading } =
    useManualPlayerStats({ playerId: pid, enabled });

  // 3. Legacy player_stats table
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

  // Constrói PublicSeasonRow[] com as mesmas conversões do StatsTab,
  // depois aplica mergeSeasonRows para tratar live_correction e live+manual.
  const mergedRows = useMemo((): CompareStatRow[] => {
    if (!enabled) return [];

    const raw: PublicSeasonRow[] = [];

    // Live
    seasons.forEach(yr => {
      (bySeason[yr] ?? []).forEach(sc => {
        raw.push({ ...sc, source: "live" as const });
      });
    });

    // Manual
    manualStats.forEach(ms => {
      const comp = ms.competition;
      raw.push({
        id: `manual_${ms.id}`,
        season_year: ms.season_year,
        competition_id: ms.competition_id,
        competition_name: comp?.display_name || comp?.name || null,
        source: "manual" as const,
        stats: {
          matches:          ms.games,
          minutes:          ms.minutes,
          goals:            ms.goals,
          assists:          ms.assists,
          shots:            ms.shots,
          shots_on_target:  ms.shots_on_target,
          shots_off_target: Math.max(0, ms.shots - ms.shots_on_target),
          shots_blocked: 0, shots_on_post: 0, offsides: 0,
          passes_completed:  ms.passes_completed,
          passes_failed:     ms.passes_failed,
          progressive_passes: 0,
          passes_total:      ms.passes_completed + ms.passes_failed,
          key_passes:        ms.key_passes,
          chances_created:   ms.chances_created,
          crosses_success: 0, crosses_failed: 0,
          ball_actions: 0,
          dribbles_success:  ms.dribbles_success,
          dribbles_failed:   ms.dribbles_failed,
          dribbles_total:    ms.dribbles_success + ms.dribbles_failed,
          penalties_won: 0, steals: 0,
          tackles:           ms.tackles,
          interceptions:     ms.interceptions,
          recoveries:        ms.recoveries,
          clearances:        ms.clearances,
          blocked_shots: 0, was_dribbled: 0,
          duels_won:         ms.duels_won,
          duels_total:       ms.duels_won + ms.duels_lost,
          aerial_duels_won:  ms.aerial_duels_won,
          aerial_duels_total:ms.aerial_duels_won + ms.aerial_duels_lost,
          ground_duels_won:  ms.duels_won - ms.aerial_duels_won,
          ground_duels_total:(ms.duels_won + ms.duels_lost) - (ms.aerial_duels_won + ms.aerial_duels_lost),
          yellow_cards:      ms.yellow_cards,
          red_cards:         ms.red_cards,
          fouls_committed:   ms.fouls_committed,
          fouls_suffered:    ms.fouls_suffered,
          possession_lost: 0,
          long_passes_accurate: 0, long_passes_failed: 0, long_passes_total: 0,
          saves:             ms.saves,
          goals_conceded:    ms.goals_conceded,
          clean_sheets:      ms.clean_sheets,
          penalties_saved:   ms.penalties_saved,
        },
      });
    });

    // Legacy player_stats
    rawPlayerStats.forEach((ps: any) => {
      const comp = ps.competition;
      raw.push({
        id: `ps_${ps.id}`,
        season_year: safeInt(ps.season_year),
        competition_id: ps.competition_id ?? null,
        competition_name: comp?.display_name || comp?.name || null,
        source: (ps.is_live_correction ? "live_correction" : "player_stats") as SeasonSource,
        stats: {
          matches:          safeInt(ps.matches),
          minutes:          safeInt(ps.minutes),
          goals:            safeInt(ps.goals),
          assists:          safeInt(ps.assists),
          shots:            safeInt(ps.shots),
          shots_on_target:  safeInt(ps.shots_on_target),
          shots_off_target: Math.max(0, safeInt(ps.shots) - safeInt(ps.shots_on_target) - safeInt(ps.shots_blocked)),
          shots_blocked:    safeInt(ps.shots_blocked),
          shots_on_post:    safeInt(ps.shots_on_post),
          offsides:         safeInt(ps.offsides),
          passes_completed: safeInt(ps.accurate_passes),
          passes_failed:    safeInt(ps.total_passes),
          progressive_passes: safeInt(ps.progressive_passes),
          passes_total:     safeInt(ps.accurate_passes) + safeInt(ps.total_passes) + safeInt(ps.progressive_passes),
          key_passes:       safeInt(ps.key_passes),
          chances_created:  safeInt(ps.chances_created),
          crosses_success:  safeInt(ps.crosses_success),
          crosses_failed:   safeInt(ps.crosses_failed),
          ball_actions: 0,
          dribbles_success: safeInt(ps.successful_dribbles),
          dribbles_failed:  safeInt(ps.total_dribbles),
          dribbles_total:   safeInt(ps.successful_dribbles) + safeInt(ps.total_dribbles),
          penalties_won:    safeInt(ps.penalties_won),
          steals:           safeInt(ps.steals),
          tackles:          safeInt(ps.tackles),
          interceptions:    safeInt(ps.interceptions),
          recoveries:       safeInt(ps.recoveries),
          clearances:       safeInt(ps.clearances),
          blocked_shots:    safeInt(ps.shots_blocked),
          was_dribbled:     safeInt(ps.times_dribbled_past),
          duels_won:        safeInt(ps.duels_won),
          duels_total:      safeInt(ps.total_duels),
          aerial_duels_won: safeInt(ps.aerial_duels_won),
          aerial_duels_total: safeInt(ps.aerial_duels_won) + safeInt(ps.aerial_duels_total),
          ground_duels_won: safeInt(ps.ground_duels_won),
          ground_duels_total: safeInt(ps.ground_duels_won) + safeInt(ps.ground_duels_total),
          yellow_cards:     safeInt(ps.yellow_cards),
          red_cards:        safeInt(ps.red_cards),
          fouls_committed:  safeInt(ps.fouls_committed),
          fouls_suffered:   safeInt(ps.fouls_drawn),
          possession_lost:  safeInt(ps.possession_lost),
          long_passes_accurate: safeInt(ps.long_passes_accurate),
          long_passes_failed:   safeInt(ps.long_passes_total),
          long_passes_total:    safeInt(ps.long_passes_accurate) + safeInt(ps.long_passes_total),
          saves:            safeInt(ps.saves),
          goals_conceded:   safeInt(ps.goals_conceded),
          clean_sheets:     safeInt(ps.clean_sheets),
          penalties_saved:  safeInt(ps.penalties_saved),
        },
      });
    });

    // Aplica a mesma lógica de merge do StatsTab
    return mergeSeasonRows(raw).map(publicRowToCompareRow);
  }, [enabled, seasons, bySeason, manualStats, rawPlayerStats]);

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
