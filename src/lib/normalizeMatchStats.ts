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
 * 1. total = success + failed (sempre)
 * 2. If only success exists, total = success
 * 3. If total < success, total = success
 * 4. Percentage = (success / total) * 100
 * 5. Never modify original data, return derived copy
 * 
 * FORMATO VISUAL OBRIGATÓRIO:
 * - Exibir sempre como: success / total (X%)
 * - Nunca exibir percentual > 100%
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
  // Derived fields that ALWAYS respect: total = success + failed
  shots_total: number;
  shots_off_target: number;
  passes_total_derived: number;
  passes_failed: number;
  dribbles_total_derived: number;
  dribbles_failed: number;
  duels_total_derived: number;
  duels_lost: number;
  aerial_duels_total_derived: number;
  aerial_duels_lost: number;
  crosses_total: number;
  // Minutes (official, capped at 90)
  minutes_played: number;
}

/**
 * Safe number helper - ensures value is never undefined/NaN/negative
 */
function safe(val: number | undefined | null): number {
  return typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;
}

/**
 * Calculate percentage safely
 * REGRA: percentage = (success / total) * 100
 * NUNCA retorna > 100
 */
export function calculatePercentage(success: number, total: number): number {
  if (total <= 0) return 0;
  const pct = Math.round((success / total) * 100);
  return Math.min(pct, 100); // Cap at 100%
}

/**
 * Normalize match stats to ensure consistency
 * 
 * REGRA MATEMÁTICA ÚNICA:
 * - total = success + failed
 * - Se total < success, total = success
 * - Percentual = (success / total) * 100
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
  
  // === SHOTS ===
  // REGRA: shots_total = shots_on_target + shots_blocked + shots_off_target
  const shotsOnTarget = safe(stats.shots_on_target);
  const shotsBlocked = safe(stats.shots_blocked);
  const storedShots = safe(stats.shots); // This may be "off target" or "total" depending on source
  
  // Derive shots_off_target: if stored shots > on_target, difference is off target
  // Otherwise, off target = 0 and we recalculate total
  const shotsOffTarget = Math.max(0, storedShots - shotsOnTarget);
  
  // Total must be >= sum of all components
  const shots_total = Math.max(
    storedShots,
    shotsOnTarget + shotsBlocked + shotsOffTarget,
    shotsOnTarget + shotsBlocked
  );
  
  // Recalculate off target for consistency
  const shots_off_target = Math.max(0, shots_total - shotsOnTarget - shotsBlocked);
  
  // === PASSES ===
  // REGRA: passes_total = passes_completed + passes_failed
  const passesCompleted = safe(stats.passes_completed);
  const passesStoredTotal = safe(stats.passes_total);
  
  // If stored total < completed, use completed as minimum
  // passes_failed is derived
  const passes_total_derived = Math.max(passesStoredTotal, passesCompleted);
  const passes_failed = Math.max(0, passes_total_derived - passesCompleted);
  
  // === DRIBBLES ===
  // REGRA: dribbles_total = dribbles_success + dribbles_failed
  const dribblesSuccess = safe(stats.dribbles_success);
  const dribblesStoredTotal = safe(stats.dribbles_total);
  
  // CRITICAL FIX: If stored total is the "failed" count, add to success
  // If stored total < success, it's definitely wrong
  // If stored total > success but close, it might be total or failed
  let dribbles_total_derived: number;
  let dribbles_failed: number;
  
  if (dribblesStoredTotal >= dribblesSuccess) {
    // Stored total seems like actual total
    dribbles_total_derived = dribblesStoredTotal;
    dribbles_failed = dribblesStoredTotal - dribblesSuccess;
  } else {
    // Stored total < success: stored value might be "failed" count
    // OR it's just missing data - assume total = success (no failures recorded)
    dribbles_total_derived = dribblesSuccess;
    dribbles_failed = 0;
  }
  
  // === DUELS ===
  // REGRA: duels_total = duels_won + duels_lost
  const duelsWon = safe(stats.duels_won);
  const duelsStoredTotal = safe(stats.duels_total);
  const duels_total_derived = Math.max(duelsStoredTotal, duelsWon);
  const duels_lost = Math.max(0, duels_total_derived - duelsWon);
  
  // === AERIAL DUELS ===
  // REGRA: aerial_total = aerial_won + aerial_lost
  const aerialWon = safe(stats.aerial_duels_won);
  const aerialStoredTotal = safe(stats.aerial_duels_total);
  const aerial_duels_total_derived = Math.max(aerialStoredTotal, aerialWon);
  const aerial_duels_lost = Math.max(0, aerial_duels_total_derived - aerialWon);
  
  // === CROSSES ===
  // REGRA: crosses_total = crosses_success + crosses_failed
  const crossesSuccess = safe(stats.crosses_success);
  const crossesFailed = safe(stats.crosses_failed);
  const crosses_total = crossesSuccess + crossesFailed;
  
  return {
    // Pass through all raw values
    ...stats,
    // Override with derived values
    shots_total,
    shots_off_target,
    passes_total_derived,
    passes_failed,
    dribbles_total_derived,
    dribbles_failed,
    duels_total_derived,
    duels_lost,
    aerial_duels_total_derived,
    aerial_duels_lost,
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
        dribbles: `${normalized.dribbles_success ?? 0}/${normalized.dribbles_total_derived} (${calculatePercentage(normalized.dribbles_success ?? 0, normalized.dribbles_total_derived)}%)`,
        shots: `${normalized.shots_on_target ?? 0}/${normalized.shots_total} (${calculatePercentage(normalized.shots_on_target ?? 0, normalized.shots_total)}%)`,
        passes: `${normalized.passes_completed ?? 0}/${normalized.passes_total_derived} (${calculatePercentage(normalized.passes_completed ?? 0, normalized.passes_total_derived)}%)`,
      },
    });
  }
}
