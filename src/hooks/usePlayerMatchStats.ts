/**
 * Stats Engine - Single Source of Truth
 * 
 * This hook derives ALL player statistics from match_player_stats and match_players tables,
 * which are the authoritative sources populated by the live match system.
 * 
 * IMPORTANT: This replaces direct reads from player_stats table for match-derived data.
 * The player_stats table should only be used for manually entered historical data.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateMinutesPlayed, STANDARD_MATCH_DURATION } from "@/lib/minutesPlayed";
import { calculateDerivedBallActions } from "@/lib/derivedBallActions";
import { fetchPlayerMatchStatsRaw } from "@/lib/playerMatchStatsProvider";
import { getRegulationGameMinute } from "@/lib/formatters";

interface PresenceRow {
  match_id: string;
  period: number;
  entered_at_seconds: number;
  exited_at_seconds: number | null;
}

export interface MatchDerivedStats {
  // Match participation
  matches: number;
  minutes: number;
  
  // Goals & Assists
  goals: number;
  assists: number;
  
  // Shooting (Attack)
  shots: number;
  shots_on_target: number;
  shots_off_target: number; // derived: shots - shots_on_target
  shots_blocked: number; // Offensive - our shot was blocked
  shots_on_post: number;
  offsides: number;
  
  // Passing (totals are derived)
  passes_completed: number;
  passes_failed: number; // from pass_total events
  progressive_passes: number;
  passes_total: number; // derived: completed + failed + progressive
  key_passes: number;
  chances_created: number;
  crosses_success: number;
  crosses_failed: number;
  long_passes_accurate: number;
  long_passes_failed: number;
  long_passes_total: number; // derived: accurate + failed
  
  // Dribbles/Possession (totals are derived)
  ball_actions: number;
  dribbles_success: number;
  dribbles_failed: number; // from dribble_attempt events
  dribbles_total: number; // derived: success + failed
  
  // Attack — penalties won
  penalties_won: number;

  // Defense
  steals: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  blocked_shots: number; // Defensive - blocking opponent's shot
  was_dribbled: number;
  
  // Duels (totals are derived)
  duels_won: number;
  duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;
  
  // Discipline
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_suffered: number;
  possession_lost: number;
  
  // Goalkeeper
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
}

export interface MatchWithStats {
  match_id: string;
  match_date: string;
  opponent_name: string;
  team_name_display: string | null; // Home team name
  competition_id: string | null;
  competition_name: string | null;
  season_year: number;
  minutes_played: number;
  stats: MatchDerivedStats;
}

interface UsePlayerMatchStatsOptions {
  playerId: string;
  seasonYear?: number;
  competitionId?: string;
  enabled?: boolean;
}

interface MatchPlayerWithMatch {
  id: string;
  match_id: string;
  player_id: string;
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played: number | null;
  match: {
    id: string;
    match_date: string;
    opponent_name: string;
    team_name_display: string | null;
    competition_id: string | null;
    season_year: number;
    duration_minutes: number;
    added_time_first_half: number | null;
    added_time_second_half: number | null;
    status: string;
    competition?: {
      id: string;
      name: string;
      display_name: string | null;
    } | null;
  } | null;
}

interface MatchPlayerStats {
  id: string;
  match_id: string;
  player_id: string;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  shots_blocked: number;
  offsides: number;
  key_passes: number;
  chances_created: number;
  passes_completed: number;
  passes_total: number;
  crosses_success: number;
  crosses_failed: number;
  ball_actions: number;
  dribbles_success: number;
  dribbles_total: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  blocked_shots: number;
  was_dribbled: number;
  duels_won: number;
  duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_suffered: number;
  possession_lost: number;
  saves: number;
  goals_conceded: number;
  steals: number;
  penalties_won: number;
  // Official persisted rating (Single Source of Truth)
  rating: number | null;
  rating_minutes_played: number | null;
  rating_minutes_factor: number | null;
  rating_computed_at: string | null;
  rating_engine_version: string;
}

/**
 * Calculate regulatory minutes played (capped at 90).
 * Uses the standardized calculateMinutesPlayed function for consistency.
 * Falls back to stored minutes_played if entry/exit data unavailable.
 */
function getRegMinutesPlayed(
  mp: MatchPlayerWithMatch,
  addedTime1H: number = 0,
  addedTime2H: number = 0
): number {
  // Use calculateMinutesPlayed for consistent regulatory calculation
  const info = calculateMinutesPlayed(
    {
      started: mp.started,
      entered_minute: mp.entered_minute,
      exited_minute: mp.exited_minute,
      minutes_played: null, // Force recalculation from entry/exit
    },
    {
      baseDuration: STANDARD_MATCH_DURATION,
      addedTime1H,
      addedTime2H,
    }
  );
  
  // If we have valid entry/exit data, use calculated regulatory minutes
  // Otherwise fall back to stored value (capped at 90)
  if (mp.started || mp.entered_minute !== null) {
    return info.minutesPlayed; // This is already regulatory (capped at 90)
  }
  
  // Fallback: use stored minutes capped at 90
  return Math.min(mp.minutes_played ?? 0, STANDARD_MATCH_DURATION);
}

/**
 * Minutes for the athlete profile MUST come from player_field_presence when available.
 * We floor seconds->minutes to avoid inflating minutes with partial segments.
 */
function computePresenceMinutesByMatch(rows: PresenceRow[]): Record<string, number> {
  const END_OF_HALF_SECONDS = 45 * 60; // 2700
  const minutesByMatch: Record<string, number> = {};

  for (const r of rows) {
    const period = r.period ?? 1;
    const entryMin = getRegulationGameMinute(r.entered_at_seconds ?? 0, period);
    // Cap at end-of-half if still on field (null) or over regulation
    const exitSeconds = Math.min(r.exited_at_seconds ?? END_OF_HALF_SECONDS, END_OF_HALF_SECONDS);
    const exitMin = getRegulationGameMinute(exitSeconds, period);
    const delta = Math.max(0, exitMin - entryMin);
    minutesByMatch[r.match_id] = (minutesByMatch[r.match_id] ?? 0) + delta;
  }

  // Cap at 90 minutes total per match
  for (const matchId of Object.keys(minutesByMatch)) {
    minutesByMatch[matchId] = Math.min(minutesByMatch[matchId], STANDARD_MATCH_DURATION);
  }

  return minutesByMatch;
}

/**
 * Hook to fetch and aggregate player statistics from match_player_stats
 * This is the SINGLE SOURCE OF TRUTH for match-derived statistics
 */
export function usePlayerMatchStats({
  playerId,
  seasonYear,
  competitionId,
  enabled = true,
}: UsePlayerMatchStatsOptions) {
  // Fetch all matches for this player with their stats
  const { data: matchesData, isLoading: matchesLoading, error: matchesError, refetch } = useQuery({
    queryKey: ["player-match-stats", playerId, seasonYear, competitionId],
    queryFn: async () => {
      const { matchPlayers, matchStats } = await fetchPlayerMatchStatsRaw({
        playerId,
        seasonYear,
        competitionId,
      });

      const typedMatchPlayers = (matchPlayers as unknown as MatchPlayerWithMatch[]) ?? [];
      const matchIds = Array.from(new Set(typedMatchPlayers.filter((mp) => mp.match).map((mp) => mp.match_id)));

      // Fetch player_field_presence minutes (authoritative minutes for profile)
      let presenceMinutesByMatch: Record<string, number> = {};
      if (matchIds.length > 0) {
        const { data: presenceRows, error: presenceError } = await supabase
          .from("player_field_presence")
          .select("match_id, period, entered_at_seconds, exited_at_seconds")
          .eq("player_id", playerId)
          .in("match_id", matchIds);

        if (presenceError) {
          // Non-fatal: fallback to regulatory minutes from started/entered/exited
          console.warn("[usePlayerMatchStats] presence fetch failed", presenceError);
        } else {
          presenceMinutesByMatch = computePresenceMinutesByMatch((presenceRows || []) as unknown as PresenceRow[]);
        }
      }

      // Create a map of match_id -> aggregated stats (defensive against duplicate rows)
      const statsMap: Record<string, MatchPlayerStats> = {};
      (matchStats || []).forEach((row) => {
        const matchId = row.match_id as string;
        const current = statsMap[matchId];

        if (!current) {
          statsMap[matchId] = row as unknown as MatchPlayerStats;
          return;
        }

        // Sum numeric fields; keep identifiers from the first row.
        const next: any = { ...current };
        Object.keys(row).forEach((k) => {
          const a = (current as any)[k];
          const b = (row as any)[k];
          if (typeof a === "number" && typeof b === "number") {
            next[k] = a + b;
          }
        });
        statsMap[matchId] = next as MatchPlayerStats;
      });

      return {
        matchPlayers: typedMatchPlayers,
        matchStats: statsMap,
        presenceMinutesByMatch,
      };
    },
    enabled: enabled && !!playerId,
    staleTime: 5 * 60 * 1000,
  });

  // Transform raw data into MatchWithStats format
  const matchesWithStats: MatchWithStats[] = (() => {
    const matchPlayers = (matchesData?.matchPlayers || []).filter(
      (mp): mp is MatchPlayerWithMatch & { match: NonNullable<MatchPlayerWithMatch["match"]> } => mp.match !== null
    );

    // Group by match_id to ensure UNIQUE matches (defensive against join/duplication)
    const grouped = new Map<string, (MatchPlayerWithMatch & { match: NonNullable<MatchPlayerWithMatch["match"]> })[]>();
    for (const mp of matchPlayers) {
      const list = grouped.get(mp.match_id) ?? [];
      list.push(mp);
      grouped.set(mp.match_id, list);
    }

    const uniqueMatches: MatchWithStats[] = [];
    for (const [matchId, entries] of grouped.entries()) {
      const mp = entries[0];
      const stats = matchesData?.matchStats[matchId];
      const competition = mp.match.competition;

      const presenceMinutes = matchesData?.presenceMinutesByMatch?.[matchId];

      // Sum minutes across duplicated rows, cap at 90
      const minutesPlayed = typeof presenceMinutes === "number"
        ? presenceMinutes
        : Math.min(
            entries.reduce((sum, e) => {
              const m = getRegMinutesPlayed(
                e,
                e.match.added_time_first_half ?? 0,
                e.match.added_time_second_half ?? 0
              );
              return sum + m;
            }, 0),
            STANDARD_MATCH_DURATION
          );

      // Professional rule: J (games) counts only matches where the athlete actually played (MIN > 0).
      // A 0-minute entry means the athlete was related but did not take the field.
      if (minutesPlayed <= 0) continue;

      // CRITICAL: In our DB schema, `shots` field stores shots OFF TARGET (not total)
      // shots_total = shots (off target) + shots_on_target + shots_blocked + shots_on_post
      const shotsOffTarget = stats?.shots ?? 0;
      const shotsOnTarget = stats?.shots_on_target ?? 0;
      const shotsBlocked = stats?.shots_blocked ?? 0;
      const shotsOnPost = (stats as any)?.shots_on_post ?? 0;
      const shotsTotal = shotsOffTarget + shotsOnTarget + shotsBlocked + shotsOnPost;

      const derivedStats: MatchDerivedStats = {
        matches: 1,
        minutes: minutesPlayed,
        goals: stats?.goals ?? 0,
        assists: stats?.assists ?? 0,
        // shots = TOTAL finalizações (off + on_target + blocked)
        shots: shotsTotal,
        shots_on_target: shotsOnTarget,
        shots_off_target: shotsOffTarget,
        shots_blocked: shotsBlocked,
        shots_on_post: shotsOnPost,
        offsides: stats?.offsides ?? 0,
        passes_completed: stats?.passes_completed ?? 0,
        passes_failed: stats?.passes_total ?? 0,
        progressive_passes: (stats as any)?.progressive_passes ?? 0,
        passes_total: (stats?.passes_completed ?? 0) + (stats?.passes_total ?? 0) + ((stats as any)?.progressive_passes ?? 0),
        key_passes: stats?.key_passes ?? 0,
        chances_created: stats?.chances_created ?? 0,
        crosses_success: stats?.crosses_success ?? 0,
        crosses_failed: stats?.crosses_failed ?? 0,
        // ball_actions is a DERIVED statistic - calculated from sum of eligible events
        // See src/lib/derivedBallActions.ts for the list of events that count
        // NOTE: We pass shotsTotal (the true total) so that calculateDerivedBallActions
        // can correctly compute shots_off_target = shotsTotal - shots_on_target
        ball_actions: calculateDerivedBallActions(
          {
            goals: stats?.goals ?? 0,
            shots_on_target: shotsOnTarget,
            shots: shotsTotal, // Pass the TOTAL, not just off-target
            shots_blocked: shotsBlocked,
            assists: stats?.assists ?? 0,
            key_passes: stats?.key_passes ?? 0,
            chances_created: stats?.chances_created ?? 0,
            passes_completed: stats?.passes_completed ?? 0,
            passes_total: stats?.passes_total ?? 0,
            crosses_success: stats?.crosses_success ?? 0,
            crosses_failed: stats?.crosses_failed ?? 0,
            dribbles_success: stats?.dribbles_success ?? 0,
            dribbles_total: stats?.dribbles_total ?? 0,
            possession_lost: stats?.possession_lost ?? 0,
            recoveries: stats?.recoveries ?? 0,
          },
          stats?.ball_actions ?? 0
        ), // Pass manual value for backwards compat
        dribbles_success: stats?.dribbles_success ?? 0,
        // CRITICAL: In our DB schema, dribbles_total stores FAILED dribbles count, NOT actual total
        // dribbles_failed = dribbles_total (the stored "total" IS the failed count)
        // Actual total = dribbles_success + dribbles_total (success + failed)
        dribbles_failed: stats?.dribbles_total ?? 0,
        dribbles_total: (stats?.dribbles_success ?? 0) + (stats?.dribbles_total ?? 0),
        tackles: stats?.tackles ?? 0,
        interceptions: stats?.interceptions ?? 0,
        recoveries: stats?.recoveries ?? 0,
        clearances: stats?.clearances ?? 0,
        blocked_shots: stats?.blocked_shots ?? 0,
        was_dribbled: stats?.was_dribbled ?? 0,
        // CRITICAL: In DB schema, duels_total stores LOST duels count, NOT actual total
        // Same pattern as passes_total and dribbles_total
        // duels_lost = duels_total (the stored "total" IS the lost count)
        // Actual total = duels_won + duels_total (won + lost)
        duels_won: stats?.duels_won ?? 0,
        duels_total: (stats?.duels_won ?? 0) + (stats?.duels_total ?? 0),
        aerial_duels_won: stats?.aerial_duels_won ?? 0,
        aerial_duels_total: (stats?.aerial_duels_won ?? 0) + (stats?.aerial_duels_total ?? 0),
        ground_duels_won: (stats?.duels_won ?? 0) - (stats?.aerial_duels_won ?? 0),
        ground_duels_total: ((stats?.duels_won ?? 0) + (stats?.duels_total ?? 0)) - ((stats?.aerial_duels_won ?? 0) + (stats?.aerial_duels_total ?? 0)),
        yellow_cards: stats?.yellow_cards ?? 0,
        red_cards: stats?.red_cards ?? 0,
        fouls_committed: stats?.fouls_committed ?? 0,
        fouls_suffered: stats?.fouls_suffered ?? 0,
        possession_lost: stats?.possession_lost ?? 0,
        saves: stats?.saves ?? 0,
        goals_conceded: stats?.goals_conceded ?? 0,
        clean_sheets: 0,
        penalties_saved: 0,
        penalties_won: stats?.penalties_won ?? 0,
        steals: stats?.steals ?? 0,
        long_passes_accurate: 0,
        long_passes_failed: 0,
        long_passes_total: 0,
      };

      uniqueMatches.push({
        match_id: matchId,
        match_date: mp.match.match_date,
        opponent_name: mp.match.opponent_name,
        team_name_display: mp.match.team_name_display,
        competition_id: mp.match.competition_id,
        competition_name: competition?.display_name || competition?.name || null,
        season_year: mp.match.season_year,
        minutes_played: minutesPlayed,
        stats: derivedStats,
      });
    }

    return uniqueMatches.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
  })();

  // DEV-only breakdown for debugging profile aggregation
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debugStats")) {
      console.log("[ProfileStatsBreakdown] matches", {
        playerId,
        seasonYear,
        competitionId,
        matches: matchesWithStats.map((m) => ({
          match_id: m.match_id,
          minutes_played: m.minutes_played,
          competition_id: m.competition_id,
          season_year: m.season_year,
        })),
        totals: {
          matches: matchesWithStats.length,
          minutes: matchesWithStats.reduce((s, m) => s + m.minutes_played, 0),
        },
        presenceMinutesByMatch: matchesData?.presenceMinutesByMatch,
        rawMatchPlayers: (matchesData?.matchPlayers || []).map((mp) => ({
          match_id: mp.match_id,
          started: mp.started,
          entered_minute: mp.entered_minute,
          exited_minute: mp.exited_minute,
          minutes_played: mp.minutes_played,
        })),
      });
    }
  }

  // Aggregate stats across all matches
  const aggregatedStats: MatchDerivedStats = matchesWithStats.reduce(
    (acc, match) => ({
      matches: acc.matches + 1,
      minutes: acc.minutes + match.stats.minutes,
      goals: acc.goals + match.stats.goals,
      assists: acc.assists + match.stats.assists,
      shots: acc.shots + match.stats.shots,
      shots_on_target: acc.shots_on_target + match.stats.shots_on_target,
      shots_off_target: acc.shots_off_target + match.stats.shots_off_target,
      shots_blocked: acc.shots_blocked + match.stats.shots_blocked,
      offsides: acc.offsides + match.stats.offsides,
      passes_completed: acc.passes_completed + match.stats.passes_completed,
      passes_failed: acc.passes_failed + match.stats.passes_failed,
      passes_total: acc.passes_total + match.stats.passes_total,
      key_passes: acc.key_passes + match.stats.key_passes,
      chances_created: acc.chances_created + match.stats.chances_created,
      crosses_success: acc.crosses_success + match.stats.crosses_success,
      crosses_failed: acc.crosses_failed + match.stats.crosses_failed,
      ball_actions: acc.ball_actions + match.stats.ball_actions,
      dribbles_success: acc.dribbles_success + match.stats.dribbles_success,
      dribbles_failed: acc.dribbles_failed + match.stats.dribbles_failed,
      dribbles_total: acc.dribbles_total + match.stats.dribbles_total,
      tackles: acc.tackles + match.stats.tackles,
      interceptions: acc.interceptions + match.stats.interceptions,
      recoveries: acc.recoveries + match.stats.recoveries,
      clearances: acc.clearances + match.stats.clearances,
      blocked_shots: acc.blocked_shots + match.stats.blocked_shots,
      was_dribbled: acc.was_dribbled + match.stats.was_dribbled,
      duels_won: acc.duels_won + match.stats.duels_won,
      duels_total: acc.duels_total + match.stats.duels_total,
      aerial_duels_won: acc.aerial_duels_won + match.stats.aerial_duels_won,
      aerial_duels_total: acc.aerial_duels_total + match.stats.aerial_duels_total,
      ground_duels_won: acc.ground_duels_won + match.stats.ground_duels_won,
      ground_duels_total: acc.ground_duels_total + match.stats.ground_duels_total,
      yellow_cards: acc.yellow_cards + match.stats.yellow_cards,
      red_cards: acc.red_cards + match.stats.red_cards,
      fouls_committed: acc.fouls_committed + match.stats.fouls_committed,
      fouls_suffered: acc.fouls_suffered + match.stats.fouls_suffered,
      possession_lost: acc.possession_lost + match.stats.possession_lost,
      saves: acc.saves + match.stats.saves,
      goals_conceded: acc.goals_conceded + match.stats.goals_conceded,
      clean_sheets: acc.clean_sheets + match.stats.clean_sheets,
      penalties_saved: acc.penalties_saved + match.stats.penalties_saved,
      penalties_won: acc.penalties_won + match.stats.penalties_won,
      steals: acc.steals + match.stats.steals,
      long_passes_accurate: acc.long_passes_accurate + match.stats.long_passes_accurate,
      long_passes_failed: acc.long_passes_failed + match.stats.long_passes_failed,
      long_passes_total: acc.long_passes_total + match.stats.long_passes_total,
      shots_on_post: acc.shots_on_post + (match.stats.shots_on_post ?? 0),
      progressive_passes: acc.progressive_passes + (match.stats.progressive_passes ?? 0),
    }),
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      shots_on_target: 0,
      shots_off_target: 0,
      shots_blocked: 0,
      offsides: 0,
      passes_completed: 0,
      passes_failed: 0,
      passes_total: 0,
      key_passes: 0,
      chances_created: 0,
      crosses_success: 0,
      crosses_failed: 0,
      ball_actions: 0,
      dribbles_success: 0,
      dribbles_failed: 0,
      dribbles_total: 0,
      tackles: 0,
      interceptions: 0,
      recoveries: 0,
      clearances: 0,
      blocked_shots: 0,
      was_dribbled: 0,
      duels_won: 0,
      duels_total: 0,
      aerial_duels_won: 0,
      aerial_duels_total: 0,
      ground_duels_won: 0,
      ground_duels_total: 0,
      yellow_cards: 0,
      red_cards: 0,
      fouls_committed: 0,
      fouls_suffered: 0,
      possession_lost: 0,
      saves: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
      penalties_won: 0,
      steals: 0,
      long_passes_accurate: 0,
      long_passes_failed: 0,
      long_passes_total: 0,
      shots_on_post: 0,
      progressive_passes: 0,
    }
  );

  // Group by season for season-by-season breakdown
  const statsBySeason: Record<number, MatchDerivedStats> = {};
  matchesWithStats.forEach((match) => {
    const year = match.season_year;
    if (!statsBySeason[year]) {
      statsBySeason[year] = { ...aggregatedStats };
      // Reset all values
      Object.keys(statsBySeason[year]).forEach((key) => {
        (statsBySeason[year] as any)[key] = 0;
      });
    }
    const s = statsBySeason[year];
    Object.keys(match.stats).forEach((key) => {
      (s as any)[key] += (match.stats as any)[key];
    });
  });

  // Group by competition
  const statsByCompetition: Record<string, { name: string; stats: MatchDerivedStats }> = {};
  matchesWithStats.forEach((match) => {
    if (!match.competition_id) return;
    const compId = match.competition_id;
    if (!statsByCompetition[compId]) {
      statsByCompetition[compId] = {
        name: match.competition_name || "Competição",
        stats: { ...aggregatedStats },
      };
      // Reset all values
      Object.keys(statsByCompetition[compId].stats).forEach((key) => {
        (statsByCompetition[compId].stats as any)[key] = 0;
      });
    }
    const s = statsByCompetition[compId].stats;
    Object.keys(match.stats).forEach((key) => {
      (s as any)[key] += (match.stats as any)[key];
    });
  });

  return {
    // Raw data
    matches: matchesWithStats,
    
    // Aggregated totals
    totals: aggregatedStats,
    
    // Grouped breakdowns
    bySeason: statsBySeason,
    byCompetition: statsByCompetition,
    
    // Raw stats map for accessing persisted rating
    rawStatsMap: matchesData?.matchStats ?? {},
    
    // Loading state
    isLoading: matchesLoading,
    error: matchesError,
    
    // Refetch function
    refetch,
  };
}

/**
 * Helper to convert MatchDerivedStats to the format expected by OutfieldPlayerStats component
 */
export function toOutfieldStatsFormat(stats: MatchDerivedStats) {
  return {
    matches: stats.matches,
    minutes: stats.minutes,
    goals: stats.goals,
    assists: stats.assists,
    yellow_cards: stats.yellow_cards,
    red_cards: stats.red_cards,
    accurate_passes: stats.passes_completed,
    total_passes: stats.passes_total,
    key_passes: stats.key_passes,
    chances_created: stats.chances_created,
    long_passes_accurate: stats.crosses_success, // Using crosses as a proxy
    long_passes_total: stats.crosses_success + stats.crosses_failed,
    shots: stats.shots,
    shots_on_target: stats.shots_on_target,
    shots_blocked: stats.shots_blocked, // Now tracked: offensive blocked shots
    offsides: stats.offsides, // Now tracked
    tackles: stats.tackles,
    interceptions: stats.interceptions,
    clearances: stats.clearances,
    recoveries: stats.recoveries,
    blocked_shots: stats.blocked_shots, // Defensive: blocked opponent shots
    was_dribbled: stats.was_dribbled, // Now tracked
    ground_duels_won: stats.ground_duels_won,
    ground_duels_total: stats.ground_duels_total,
    aerial_duels_won: stats.aerial_duels_won,
    aerial_duels_total: stats.aerial_duels_total,
    successful_dribbles: stats.dribbles_success,
    total_dribbles: stats.dribbles_total,
    ball_actions: stats.ball_actions, // Now tracked
    possession_lost: stats.possession_lost,
    fouls_drawn: stats.fouls_suffered,
    fouls_committed: stats.fouls_committed,
    times_dribbled_past: stats.was_dribbled,
    crosses_success: stats.crosses_success,
    crosses_failed: stats.crosses_failed,
  };
}

/**
 * Helper to convert MatchDerivedStats to SeasonSummaryCard format
 */
export function toSeasonSummaryFormat(stats: MatchDerivedStats) {
  return {
    matches: stats.matches,
    minutes: stats.minutes,
    goals: stats.goals,
    assists: stats.assists,
    chances_created: stats.chances_created,
    key_passes: stats.key_passes,
    tackles: stats.tackles,
    interceptions: stats.interceptions,
    accurate_passes: stats.passes_completed,
    total_passes: stats.passes_total,
    clearances: stats.clearances,
    duels_won: stats.duels_won,
    total_duels: stats.duels_total,
    recoveries: stats.recoveries,
    saves: stats.saves,
    goals_conceded: stats.goals_conceded,
    clean_sheets: stats.clean_sheets,
    aerial_duels_won: stats.aerial_duels_won,
  };
}

/**
 * Interface for stats grouped by season and competition (for PlayerStatsSection)
 */
export interface SeasonCompetitionStats {
  id: string; // Synthetic ID: season_competition
  season_year: number;
  competition_id: string | null;
  competition_name: string | null;
  stats: MatchDerivedStats;
}

/** Minimal per-match data for the expand/collapse rows in Detalhes por Temporada */
export interface MatchRowPreview {
  match_id: string;
  match_date: string;
  opponent_name: string;
  minutes_played: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
}

/**
 * Hook to get player match stats organized by season and competition
 * This is the format expected by PlayerStatsSection "Detalhes por Temporada"
 */
export function usePlayerMatchStatsBySeasonCompetition({
  playerId,
  enabled = true,
}: {
  playerId: string;
  enabled?: boolean;
}) {
  const { data: matchesData, isLoading, error, refetch } = useQuery({
    queryKey: ["player-match-stats-by-season-comp", playerId],
    queryFn: async () => {
      // Get all match_players entries for this player (only finished/applied matches)
      const { data: matchPlayers, error: mpError } = await supabase
        .from("match_players")
        .select(`
          id,
          match_id,
          player_id,
          started,
          entered_minute,
          exited_minute,
          minutes_played,
            match:matches!inner (
              id,
              match_date,
              opponent_name,
              competition_id,
              season_year,
              duration_minutes,
              added_time_first_half,
              added_time_second_half,
              status,
              competition:competitions (
                id,
                name,
                display_name
              )
          )
        `)
        .eq("player_id", playerId)
        .neq("is_removed", true)
        .in("match.status", ["finished", "applied"]);

      if (mpError) throw mpError;

      const typedPlayers = matchPlayers as unknown as MatchPlayerWithMatch[];
      const matchIds = (typedPlayers || [])
        .filter(mp => mp.match)
        .map(mp => mp.match_id);

      if (matchIds.length === 0) {
        return { matchPlayers: [], matchStats: {}, presenceMinutesByMatch: {} };
      }

      // Fetch player_field_presence minutes (authoritative minutes for profile)
      let presenceMinutesByMatch: Record<string, number> = {};
      {
        const { data: presenceRows, error: presenceError } = await supabase
          .from("player_field_presence")
          .select("match_id, period, entered_at_seconds, exited_at_seconds")
          .eq("player_id", playerId)
          .in("match_id", matchIds);

        if (presenceError) {
          console.warn("[usePlayerMatchStatsBySeasonCompetition] presence fetch failed", presenceError);
        } else {
          presenceMinutesByMatch = computePresenceMinutesByMatch((presenceRows || []) as unknown as PresenceRow[]);
        }
      }

      // Get all match_player_stats for these matches
      const { data: statsData, error: statsError } = await supabase
        .from("match_player_stats")
        .select("*")
        .eq("player_id", playerId)
        .in("match_id", matchIds);

      if (statsError) throw statsError;

      // Create a map of match_id -> stats
      const statsMap: Record<string, MatchPlayerStats> = {};
      (statsData || []).forEach((stat) => {
        statsMap[stat.match_id] = stat as MatchPlayerStats;
      });

      return { 
        matchPlayers: typedPlayers, 
        matchStats: statsMap,
        presenceMinutesByMatch,
      };
    },
    enabled: enabled && !!playerId,
    staleTime: 30000,
  });

  // Group data by season_year + competition_id
  const statsBySeasonCompetition: Record<string, SeasonCompetitionStats> = {};
  const matchesByKey: Record<string, MatchRowPreview[]> = {};
  const seasonYears = new Set<number>();

  const uniqueMatchPlayers = (() => {
    const out: (MatchPlayerWithMatch & { match: NonNullable<MatchPlayerWithMatch["match"]> })[] = [];
    const seen = new Set<string>();
    for (const mp of (matchesData?.matchPlayers || []) as MatchPlayerWithMatch[]) {
      if (!mp.match) continue;
      if (seen.has(mp.match_id)) continue;
      seen.add(mp.match_id);
      out.push(mp as any);
    }
    return out;
  })();

  uniqueMatchPlayers.forEach((mp) => {
      const stats = matchesData?.matchStats[mp.match_id];
      const season = mp.match.season_year;
      const compId = mp.match.competition_id || "no-competition";
      const key = `${season}_${compId}`;
      
      seasonYears.add(season);

      if (!statsBySeasonCompetition[key]) {
        const competition = mp.match.competition;
        statsBySeasonCompetition[key] = {
          id: key,
          season_year: season,
          competition_id: mp.match.competition_id,
          competition_name: competition?.display_name || competition?.name || null,
          stats: {
            matches: 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            shots: 0,
            shots_on_target: 0,
            shots_off_target: 0,
            shots_blocked: 0,
            offsides: 0,
            passes_completed: 0,
            passes_failed: 0,
            passes_total: 0,
            key_passes: 0,
            chances_created: 0,
            crosses_success: 0,
            crosses_failed: 0,
            long_passes_accurate: 0,
            long_passes_failed: 0,
            long_passes_total: 0,
            ball_actions: 0,
            dribbles_success: 0,
            dribbles_failed: 0,
            dribbles_total: 0,
            penalties_won: 0,
            steals: 0,
            tackles: 0,
            interceptions: 0,
            recoveries: 0,
            clearances: 0,
            blocked_shots: 0,
            was_dribbled: 0,
            duels_won: 0,
            duels_total: 0,
            aerial_duels_won: 0,
            aerial_duels_total: 0,
            ground_duels_won: 0,
            ground_duels_total: 0,
            yellow_cards: 0,
            red_cards: 0,
            fouls_committed: 0,
            fouls_suffered: 0,
            possession_lost: 0,
            saves: 0,
            goals_conceded: 0,
            clean_sheets: 0,
            penalties_saved: 0,
          },
        };
      }

      const entry = statsBySeasonCompetition[key];
      const s = entry.stats;

      const presenceMinutes = (matchesData as any)?.presenceMinutesByMatch?.[mp.match_id];

      // Minutes priority: player_field_presence > regulatory minutes from entry/exit
      const minutesPlayed = typeof presenceMinutes === "number"
        ? presenceMinutes
        : getRegMinutesPlayed(
            mp,
            mp.match.added_time_first_half ?? 0,
            mp.match.added_time_second_half ?? 0
          );

      // Track individual match preview for expand/collapse
      if (!matchesByKey[key]) matchesByKey[key] = [];
      {
        const mShotsOff = stats?.shots ?? 0;
        const mShotsOn = stats?.shots_on_target ?? 0;
        const mShotsBlocked = stats?.shots_blocked ?? 0;
        matchesByKey[key].push({
          match_id: mp.match_id,
          match_date: mp.match.match_date,
          opponent_name: mp.match.opponent_name,
          minutes_played: minutesPlayed,
          goals: stats?.goals ?? 0,
          assists: stats?.assists ?? 0,
          shots: mShotsOff + mShotsOn + mShotsBlocked,
          shots_on_target: mShotsOn,
          yellow_cards: stats?.yellow_cards ?? 0,
          red_cards: stats?.red_cards ?? 0,
          tackles: stats?.tackles ?? 0,
          interceptions: stats?.interceptions ?? 0,
        });
      }

      // J (games) = only matches where athlete actually played (MIN > 0).
      // The match row still appears in matchesByKey so it shows in the expandable list.
      s.matches += minutesPlayed > 0 ? 1 : 0;
      s.minutes += minutesPlayed;
      s.goals += stats?.goals ?? 0;
      s.assists += stats?.assists ?? 0;
      // CRITICAL: In DB schema, shots stores OFF-TARGET shots, NOT total
      // shots_total = shots (off) + shots_on_target + shots_blocked
      const matchShotsOff = stats?.shots ?? 0;
      const matchShotsOn = stats?.shots_on_target ?? 0;
      const matchShotsBlocked = stats?.shots_blocked ?? 0;
      s.shots += matchShotsOff + matchShotsOn + matchShotsBlocked; // Actual total
      s.shots_on_target += matchShotsOn;
      s.shots_off_target += matchShotsOff;
      s.shots_blocked += matchShotsBlocked;
      s.offsides += stats?.offsides ?? 0;
      s.passes_completed += stats?.passes_completed ?? 0;
      // CRITICAL: In DB schema, passes_total stores FAILED passes, not actual total
      // passes_failed = passes_total (the stored "total" IS the failed count)
      // Actual total = passes_completed + passes_total
      s.passes_failed += stats?.passes_total ?? 0;
      s.passes_total += (stats?.passes_completed ?? 0) + (stats?.passes_total ?? 0);
      s.key_passes += stats?.key_passes ?? 0;
      s.chances_created += stats?.chances_created ?? 0;
      s.crosses_success += stats?.crosses_success ?? 0;
      s.crosses_failed += stats?.crosses_failed ?? 0;
      // ball_actions is DERIVED, not stored - calculate from components for each match
      s.ball_actions += calculateDerivedBallActions({
        goals: stats?.goals ?? 0,
        shots_on_target: stats?.shots_on_target ?? 0,
        shots: stats?.shots ?? 0,
        shots_blocked: stats?.shots_blocked ?? 0,
        assists: stats?.assists ?? 0,
        key_passes: stats?.key_passes ?? 0,
        chances_created: stats?.chances_created ?? 0,
        passes_completed: stats?.passes_completed ?? 0,
        passes_total: stats?.passes_total ?? 0,
        crosses_success: stats?.crosses_success ?? 0,
        crosses_failed: stats?.crosses_failed ?? 0,
        dribbles_success: stats?.dribbles_success ?? 0,
        dribbles_total: stats?.dribbles_total ?? 0,
        possession_lost: stats?.possession_lost ?? 0,
        recoveries: stats?.recoveries ?? 0,
      }, stats?.ball_actions ?? 0);
      s.dribbles_success += stats?.dribbles_success ?? 0;
      // CRITICAL: In DB schema, dribbles_total stores FAILED dribbles, not actual total
      // dribbles_failed = dribbles_total (the stored "total" IS the failed count)
      // Actual total = dribbles_success + dribbles_total
      s.dribbles_failed += stats?.dribbles_total ?? 0;
      s.dribbles_total += (stats?.dribbles_success ?? 0) + (stats?.dribbles_total ?? 0);
      s.penalties_won += stats?.penalties_won ?? 0;
      s.steals += stats?.steals ?? 0;
      s.tackles += stats?.tackles ?? 0;
      s.interceptions += stats?.interceptions ?? 0;
      s.recoveries += stats?.recoveries ?? 0;
      s.clearances += stats?.clearances ?? 0;
      s.blocked_shots += stats?.blocked_shots ?? 0;
      s.was_dribbled += stats?.was_dribbled ?? 0;
      // CRITICAL: In DB schema, duels_total stores LOST duels count, NOT actual total
      // Same pattern as passes_total and dribbles_total
      // Actual total = won + lost (= duels_won + duels_total)
      s.duels_won += stats?.duels_won ?? 0;
      s.duels_total += (stats?.duels_won ?? 0) + (stats?.duels_total ?? 0);
      s.aerial_duels_won += stats?.aerial_duels_won ?? 0;
      s.aerial_duels_total += (stats?.aerial_duels_won ?? 0) + (stats?.aerial_duels_total ?? 0);
      s.ground_duels_won += (stats?.duels_won ?? 0) - (stats?.aerial_duels_won ?? 0);
      s.ground_duels_total += ((stats?.duels_won ?? 0) + (stats?.duels_total ?? 0)) - ((stats?.aerial_duels_won ?? 0) + (stats?.aerial_duels_total ?? 0));
      s.yellow_cards += stats?.yellow_cards ?? 0;
      s.red_cards += stats?.red_cards ?? 0;
      s.fouls_committed += stats?.fouls_committed ?? 0;
      s.fouls_suffered += stats?.fouls_suffered ?? 0;
      s.possession_lost += stats?.possession_lost ?? 0;
      s.saves += stats?.saves ?? 0;
      s.goals_conceded += stats?.goals_conceded ?? 0;
    });

  // Convert to array sorted by season (desc) then competition name
  const statsArray = Object.values(statsBySeasonCompetition)
    .sort((a, b) => {
      if (b.season_year !== a.season_year) return b.season_year - a.season_year;
      return (a.competition_name || "").localeCompare(b.competition_name || "");
    });

  // Group by season for UI
  const groupedBySeason: Record<number, SeasonCompetitionStats[]> = {};
  statsArray.forEach((stat) => {
    if (!groupedBySeason[stat.season_year]) {
      groupedBySeason[stat.season_year] = [];
    }
    groupedBySeason[stat.season_year].push(stat);
  });

  return {
    stats: statsArray,
    bySeason: groupedBySeason,
    seasons: Array.from(seasonYears).sort((a, b) => b - a),
    matchesByKey,
    isLoading,
    error,
    refetch,
  };
}
