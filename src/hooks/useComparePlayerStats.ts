import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlayerMatchStatsBySeasonCompetition, type SeasonCompetitionStats } from "@/hooks/usePlayerMatchStats";
import { getAllPlayerStats, type PlayerStats } from "@/lib/playerStats";

export type CompareStatsSource = "live" | "manual";

export interface CompareStatRow {
  season_year: number;
  competition_id: string | null;
  competition_name: string | null;
  source: CompareStatsSource;

  // Canonical totals (the same semantics used by Profile)
  matches: number;
  minutes: number;
  goals: number;
  assists: number;

  // Shooting
  shots: number; // Total attempts (off + on + blocked)
  shots_on_target: number;

  // Creation / passing
  key_passes: number;
  chances_created: number;
  accurate_passes: number;
  total_passes: number;

  // Dribbles
  successful_dribbles: number;
  total_dribbles: number;

  // Defense
  tackles: number;
  interceptions: number;
  recoveries: number;
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;

  // Discipline
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_drawn: number;

  // Goalkeeper
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;

  // Extras used by radar/compat
  clearances: number;
  ball_actions: number;
}

export interface CompareAggregatedStats extends Omit<CompareStatRow, "season_year" | "competition_id" | "competition_name" | "source"> {}

function safeInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toCompareRowFromLive(sc: SeasonCompetitionStats): CompareStatRow {
  const s = sc.stats;
  const shotsTotal = safeInt(s.shots) + safeInt(s.shots_on_target) + safeInt(s.shots_blocked);

  return {
    season_year: sc.season_year,
    competition_id: sc.competition_id,
    competition_name: sc.competition_name,
    source: "live",

    matches: safeInt(s.matches),
    minutes: safeInt(s.minutes),
    goals: safeInt(s.goals),
    assists: safeInt(s.assists),

    shots: shotsTotal,
    shots_on_target: safeInt(s.shots_on_target),

    key_passes: safeInt(s.key_passes),
    chances_created: safeInt(s.chances_created),
    accurate_passes: safeInt(s.passes_completed),
    total_passes: safeInt(s.passes_total),

    successful_dribbles: safeInt(s.dribbles_success),
    total_dribbles: safeInt(s.dribbles_total),

    tackles: safeInt(s.tackles),
    interceptions: safeInt(s.interceptions),
    recoveries: safeInt(s.recoveries),
    duels_won: safeInt(s.duels_won),
    total_duels: safeInt(s.duels_total),
    aerial_duels_won: safeInt(s.aerial_duels_won),
    aerial_duels_total: safeInt(s.aerial_duels_total),
    ground_duels_won: safeInt(s.ground_duels_won),
    ground_duels_total: safeInt(s.ground_duels_total),

    yellow_cards: safeInt(s.yellow_cards),
    red_cards: safeInt(s.red_cards),
    fouls_committed: safeInt(s.fouls_committed),
    fouls_drawn: safeInt(s.fouls_suffered),

    saves: safeInt(s.saves),
    goals_conceded: safeInt(s.goals_conceded),
    clean_sheets: safeInt(s.clean_sheets),
    penalties_saved: safeInt(s.penalties_saved),
    errors_leading_to_goal: 0,

    clearances: safeInt(s.clearances),
    ball_actions: safeInt(s.ball_actions),
  };
}

function toCompareRowFromManual(ms: PlayerStats): CompareStatRow {
  // Manual stats are stored in player_stats and already use the same output semantics as Profile UI.
  // For consistency, we also treat "shots" as off-target count and sum into a total attempts number.
  const shotsTotal = safeInt(ms.shots) + safeInt(ms.shots_on_target) + safeInt(ms.shots_blocked);

  return {
    season_year: ms.season_year,
    competition_id: ms.competition_id,
    competition_name: (ms as any)?.competitions?.name ?? null,
    source: "manual",

    matches: safeInt(ms.matches),
    minutes: safeInt(ms.minutes),
    goals: safeInt(ms.goals),
    assists: safeInt(ms.assists),

    shots: shotsTotal,
    shots_on_target: safeInt(ms.shots_on_target),

    key_passes: safeInt(ms.key_passes),
    chances_created: safeInt(ms.chances_created),
    accurate_passes: safeInt(ms.accurate_passes),
    total_passes: safeInt(ms.total_passes),

    successful_dribbles: safeInt(ms.successful_dribbles),
    total_dribbles: safeInt(ms.total_dribbles),

    tackles: safeInt(ms.tackles),
    interceptions: safeInt(ms.interceptions),
    recoveries: safeInt(ms.recoveries),
    duels_won: safeInt(ms.duels_won),
    total_duels: safeInt(ms.total_duels),
    aerial_duels_won: safeInt(ms.aerial_duels_won),
    aerial_duels_total: safeInt(ms.aerial_duels_total),
    ground_duels_won: safeInt(ms.ground_duels_won),
    ground_duels_total: safeInt(ms.ground_duels_total),

    yellow_cards: safeInt(ms.yellow_cards),
    red_cards: safeInt(ms.red_cards),
    fouls_committed: safeInt(ms.fouls_committed),
    fouls_drawn: safeInt(ms.fouls_drawn),

    saves: safeInt(ms.saves),
    goals_conceded: safeInt(ms.goals_conceded),
    clean_sheets: safeInt(ms.clean_sheets),
    penalties_saved: safeInt(ms.penalties_saved),
    errors_leading_to_goal: safeInt(ms.errors_leading_to_goal),

    clearances: safeInt(ms.clearances),
    ball_actions: safeInt((ms as any).ball_actions),
  };
}

function aggregate(rows: CompareStatRow[]): CompareAggregatedStats | null {
  if (rows.length === 0) return null;

  return rows.reduce<CompareAggregatedStats>(
    (acc, r) => ({
      matches: acc.matches + r.matches,
      minutes: acc.minutes + r.minutes,
      goals: acc.goals + r.goals,
      assists: acc.assists + r.assists,

      shots: acc.shots + r.shots,
      shots_on_target: acc.shots_on_target + r.shots_on_target,

      key_passes: acc.key_passes + r.key_passes,
      chances_created: acc.chances_created + r.chances_created,
      accurate_passes: acc.accurate_passes + r.accurate_passes,
      total_passes: acc.total_passes + r.total_passes,

      successful_dribbles: acc.successful_dribbles + r.successful_dribbles,
      total_dribbles: acc.total_dribbles + r.total_dribbles,

      tackles: acc.tackles + r.tackles,
      interceptions: acc.interceptions + r.interceptions,
      recoveries: acc.recoveries + r.recoveries,
      duels_won: acc.duels_won + r.duels_won,
      total_duels: acc.total_duels + r.total_duels,
      aerial_duels_won: acc.aerial_duels_won + r.aerial_duels_won,
      aerial_duels_total: acc.aerial_duels_total + r.aerial_duels_total,
      ground_duels_won: acc.ground_duels_won + r.ground_duels_won,
      ground_duels_total: acc.ground_duels_total + r.ground_duels_total,

      yellow_cards: acc.yellow_cards + r.yellow_cards,
      red_cards: acc.red_cards + r.red_cards,
      fouls_committed: acc.fouls_committed + r.fouls_committed,
      fouls_drawn: acc.fouls_drawn + r.fouls_drawn,

      saves: acc.saves + r.saves,
      goals_conceded: acc.goals_conceded + r.goals_conceded,
      clean_sheets: acc.clean_sheets + r.clean_sheets,
      penalties_saved: acc.penalties_saved + r.penalties_saved,
      errors_leading_to_goal: acc.errors_leading_to_goal + r.errors_leading_to_goal,

      clearances: acc.clearances + r.clearances,
      ball_actions: acc.ball_actions + r.ball_actions,
    }),
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      shots_on_target: 0,
      key_passes: 0,
      chances_created: 0,
      accurate_passes: 0,
      total_passes: 0,
      successful_dribbles: 0,
      total_dribbles: 0,
      tackles: 0,
      interceptions: 0,
      recoveries: 0,
      duels_won: 0,
      total_duels: 0,
      aerial_duels_won: 0,
      aerial_duels_total: 0,
      ground_duels_won: 0,
      ground_duels_total: 0,
      yellow_cards: 0,
      red_cards: 0,
      fouls_committed: 0,
      fouls_drawn: 0,
      saves: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
      errors_leading_to_goal: 0,
      clearances: 0,
      ball_actions: 0,
    }
  );
}

function makeKey(season: number, competitionId: string | null): string {
  return `${season}_${competitionId ?? "none"}`;
}

export function useComparePlayerStats(params: {
  playerId: string | null;
  seasonFilter: string; // "all" or numeric string
  competitionFilter: string; // "all" or uuid
}) {
  const { playerId, seasonFilter, competitionFilter } = params;

  const { stats: liveBySeasonComp, isLoading: liveLoading } = usePlayerMatchStatsBySeasonCompetition({
    playerId: playerId ?? "",
    enabled: !!playerId,
  });

  const manualQuery = useQuery({
    queryKey: ["compare-player-stats", playerId],
    enabled: !!playerId,
    queryFn: async () => {
      if (!playerId) return [] as PlayerStats[];
      const { data, error } = await getAllPlayerStats(playerId);
      if (error) throw error;
      return (data || []) as PlayerStats[];
    },
    staleTime: 30_000,
  });

  const mergedRows = useMemo((): CompareStatRow[] => {
    if (!playerId) return [];

    const liveRows = (liveBySeasonComp || []).map(toCompareRowFromLive);
    const manualRows = (manualQuery.data || []).map(toCompareRowFromManual);

    const liveByKey = new Map<string, CompareStatRow>();
    for (const r of liveRows) {
      liveByKey.set(makeKey(r.season_year, r.competition_id), r);
    }

    const manualByKey = new Map<string, CompareStatRow>();
    for (const r of manualRows) {
      manualByKey.set(makeKey(r.season_year, r.competition_id), r);
    }

    const keys = new Set<string>([...liveByKey.keys(), ...manualByKey.keys()]);
    const merged: CompareStatRow[] = [];
    keys.forEach((k) => {
      const live = liveByKey.get(k);
      if (live) {
        merged.push(live);
        return;
      }
      const manual = manualByKey.get(k);
      if (manual) merged.push(manual);
    });

    // Sort by season desc then competition name
    return merged.sort((a, b) => {
      if (b.season_year !== a.season_year) return b.season_year - a.season_year;
      return (a.competition_name || "").localeCompare(b.competition_name || "");
    });
  }, [playerId, liveBySeasonComp, manualQuery.data]);

  const filteredRows = useMemo(() => {
    let out = mergedRows;
    if (seasonFilter !== "all") {
      const y = Number(seasonFilter);
      out = out.filter((r) => r.season_year === y);
    }
    if (competitionFilter !== "all") {
      out = out.filter((r) => r.competition_id === competitionFilter);
    }
    return out;
  }, [mergedRows, seasonFilter, competitionFilter]);

  const aggregatedStats = useMemo(() => aggregate(filteredRows), [filteredRows]);

  return {
    rows: mergedRows,
    filteredRows,
    aggregatedStats,
    isLoading: liveLoading || manualQuery.isLoading,
    error: manualQuery.error,
  };
}
