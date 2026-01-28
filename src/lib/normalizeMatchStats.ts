/**
 * Match Stats Normalizer
 * 
 * SINGLE SOURCE OF TRUTH for match statistics normalization.
 * 
 * Problem: The database sometimes stores inconsistent data where:
 * - dribbles_success: 3, dribbles_total: 0 (should be at least 3)
 * - shots_on_target: 2, shots: 0 (should be at least 2)
 * - passes_completed: 2, passes_total: 1 (should be at least 2)
 * 
 * This utility ensures ALL components display consistent, derived totals.
 * 
 * RULES:
 * 1. total >= success (always)
 * 2. If only success exists, total = success
 * 3. If both exist and total < success, total = success
 * 4. Never modify original data, return derived copy
 */

import { calculateMinutesPlayed, type MatchPlayerMinutesInput, type MatchContextInput } from "./minutesPlayed";

// Raw stats from match_player_stats table
export interface RawMatchStats {
  goals?: number;
  assists?: number;
  shots?: number;
  shots_on_target?: number;
  shots_blocked?: number;
  offsides?: number;
  key_passes?: number;
  chances_created?: number;
  passes_completed?: number;
  passes_total?: number;
  dribbles_success?: number;
  dribbles_total?: number;
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  recoveries?: number;
  duels_won?: number;
  duels_total?: number;
  aerial_duels_won?: number;
  aerial_duels_total?: number;
  fouls_committed?: number;
  fouls_suffered?: number;
  yellow_cards?: number;
  red_cards?: number;
  possession_lost?: number;
  saves?: number;
  goals_conceded?: number;
  blocked_shots?: number;
  was_dribbled?: number;
  ball_actions?: number;
  crosses_success?: number;
  crosses_failed?: number;
}

// Normalized stats with guaranteed consistent totals
export interface NormalizedMatchStats extends RawMatchStats {
  // Derived fields that ALWAYS respect: total >= success
  shots_total: number;
  passes_total_derived: number;
  dribbles_total_derived: number;
  duels_total_derived: number;
  aerial_duels_total_derived: number;
  crosses_total: number;
  // Minutes (official, capped at 90)
  minutes_played: number;
}

/**
 * Normalize match stats to ensure consistency
 * 
 * @param raw - Raw stats from match_player_stats
 * @param minutesInput - Player entry/exit data for minutes calculation
 * @param matchContext - Match context (added time, etc.)
 * @returns Normalized stats with guaranteed consistency
 */
export function normalizeMatchStats(
  raw: RawMatchStats | null | undefined,
  minutesInput?: MatchPlayerMinutesInput,
  matchContext?: MatchContextInput
): NormalizedMatchStats {
  const stats = raw ?? {};
  
  // Calculate minutes using official utility
  let minutesPlayed = 0;
  if (minutesInput) {
    const info = calculateMinutesPlayed(minutesInput, matchContext);
    minutesPlayed = info.minutesPlayed;
  }
  
  // === SHOTS: shots_total >= shots + shots_on_target ===
  const shotsOff = stats.shots ?? 0; // shots off target
  const shotsOnTarget = stats.shots_on_target ?? 0;
  const shotsBlocked = stats.shots_blocked ?? 0;
  const goals = stats.goals ?? 0;
  // Total shots = off target + on target + blocked
  // Goals are counted IN shots_on_target, not additive
  const shots_total = Math.max(shotsOff + shotsOnTarget + shotsBlocked, shotsOnTarget + goals);
  
  // === PASSES: passes_total >= passes_completed ===
  const passesCompleted = stats.passes_completed ?? 0;
  const passesStoredTotal = stats.passes_total ?? 0;
  // Total = stored total OR at least completed (whichever is higher)
  const passes_total_derived = Math.max(passesStoredTotal, passesCompleted);
  
  // === DRIBBLES: dribbles_total >= dribbles_success ===
  const dribblesSuccess = stats.dribbles_success ?? 0;
  const dribblesStoredTotal = stats.dribbles_total ?? 0;
  // Total = stored total OR at least success (whichever is higher)
  const dribbles_total_derived = Math.max(dribblesStoredTotal, dribblesSuccess);
  
  // === DUELS: duels_total >= duels_won ===
  const duelsWon = stats.duels_won ?? 0;
  const duelsStoredTotal = stats.duels_total ?? 0;
  const duels_total_derived = Math.max(duelsStoredTotal, duelsWon);
  
  // === AERIAL DUELS: aerial_duels_total >= aerial_duels_won ===
  const aerialWon = stats.aerial_duels_won ?? 0;
  const aerialStoredTotal = stats.aerial_duels_total ?? 0;
  const aerial_duels_total_derived = Math.max(aerialStoredTotal, aerialWon);
  
  // === CROSSES: crosses_total = success + failed ===
  const crossesSuccess = stats.crosses_success ?? 0;
  const crossesFailed = stats.crosses_failed ?? 0;
  const crosses_total = crossesSuccess + crossesFailed;
  
  return {
    // Pass through all raw values
    ...stats,
    // Override with derived values
    shots_total,
    passes_total_derived,
    dribbles_total_derived,
    duels_total_derived,
    aerial_duels_total_derived,
    crosses_total,
    minutes_played: minutesPlayed,
  };
}

/**
 * Create a normalized stats map for multiple players
 * 
 * @param players - Array of match players with their stats
 * @param statsMap - Map of player_id -> raw stats
 * @param matchContext - Match context for minutes calculation
 * @returns Map of player_id -> normalized stats
 */
export function createNormalizedStatsMap(
  players: Array<{
    player_id: string;
    started: boolean;
    entered_minute?: number | null;
    exited_minute?: number | null;
    minutes_played?: number | null;
  }>,
  statsMap: Record<string, RawMatchStats | undefined>,
  matchContext?: MatchContextInput
): Record<string, NormalizedMatchStats> {
  const result: Record<string, NormalizedMatchStats> = {};
  
  for (const player of players) {
    const raw = statsMap[player.player_id];
    const minutesInput: MatchPlayerMinutesInput = {
      started: player.started,
      entered_minute: player.entered_minute ?? null,
      exited_minute: player.exited_minute ?? null,
      minutes_played: player.minutes_played,
    };
    
    result[player.player_id] = normalizeMatchStats(raw, minutesInput, matchContext);
  }
  
  return result;
}

/**
 * Log normalized stats for debugging
 */
export function debugLogNormalizedStats(
  playerId: string,
  playerName: string,
  raw: RawMatchStats | undefined,
  normalized: NormalizedMatchStats
): void {
  if (import.meta.env.DEV) {
    console.log(`[NormalizeStats] ${playerName} (${playerId.slice(0, 8)}):`, {
      minutes: normalized.minutes_played,
      raw: {
        dribbles: `${raw?.dribbles_success ?? 0}/${raw?.dribbles_total ?? 0}`,
        shots: `${raw?.shots_on_target ?? 0}/${raw?.shots ?? 0}`,
        passes: `${raw?.passes_completed ?? 0}/${raw?.passes_total ?? 0}`,
      },
      normalized: {
        dribbles: `${normalized.dribbles_success ?? 0}/${normalized.dribbles_total_derived}`,
        shots: `${normalized.shots_on_target ?? 0}/${normalized.shots_total}`,
        passes: `${normalized.passes_completed ?? 0}/${normalized.passes_total_derived}`,
      },
    });
  }
}
