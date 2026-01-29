/**
 * Player Stats Normalizer
 * 
 * SINGLE SOURCE OF TRUTH for aggregated player statistics normalization.
 * 
 * Problem: The database sometimes stores inconsistent data where:
 * - shots_on_target: 2, shots: 1 (should be at least 2)
 * - shots_blocked: 1 but not counted in total
 * - dribbles success > total
 * 
 * This utility ensures ALL components display consistent, derived totals.
 * 
 * RULES:
 * 1. total = success + failed (sempre)
 * 2. If stored total < success, total = success
 * 3. percentage = (success / total) * 100, capped at 100%
 * 4. Never modify original data, return derived copy
 * 
 * FORMATO VISUAL OBRIGATÓRIO:
 * - Exibir sempre como: success / total (X%)
 * - Nunca exibir percentual > 100%
 * 
 * @author M3 Scouting Technical Team
 */

import type { PlayerStats } from "./playerStats";

/**
 * Normalized player stats with guaranteed consistent totals
 */
export interface NormalizedPlayerStats extends PlayerStats {
  // Derived fields that ALWAYS respect: total = success + failed
  shots_total_derived: number;
  shots_off_target: number;
  passes_total_derived: number;
  passes_failed: number;
  dribbles_total_derived: number;
  dribbles_failed: number;
  duels_total_derived: number;
  duels_lost: number;
  aerial_duels_total_derived: number;
  aerial_duels_lost: number;
  ground_duels_total_derived: number;
  ground_duels_lost: number;
  crosses_total: number;
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
 * Normalize player stats to ensure consistency
 * 
 * REGRA MATEMÁTICA ÚNICA:
 * - total = success + failed
 * - Se total < success, total = success
 * - Percentual = (success / total) * 100, capped at 100%
 * 
 * @param raw - Raw stats from player_stats table
 * @returns Normalized stats with guaranteed consistency
 */
export function normalizePlayerStats(
  raw: PlayerStats | null | undefined
): NormalizedPlayerStats {
  const stats = raw ?? {} as PlayerStats;
  
  // === SHOTS ===
  // REGRA: shots_total = shots_on_target + shots_blocked + shots_off_target
  const shotsOnTarget = safe(stats.shots_on_target);
  const shotsBlocked = safe(stats.shots_blocked);
  const storedShots = safe(stats.shots);
  
  // Derive shots_off_target: if stored shots > on_target, difference is off target
  const shotsOffTarget = Math.max(0, storedShots - shotsOnTarget);
  
  // Total must be >= sum of all components
  const shots_total_derived = Math.max(
    storedShots,
    shotsOnTarget + shotsBlocked + shotsOffTarget,
    shotsOnTarget + shotsBlocked
  );
  
  // Recalculate off target for consistency
  const shots_off_target = Math.max(0, shots_total_derived - shotsOnTarget - shotsBlocked);
  
  // === PASSES ===
  // REGRA: passes_total = accurate_passes + passes_failed
  const passesCompleted = safe(stats.accurate_passes);
  const passesStoredTotal = safe(stats.total_passes);
  const passes_total_derived = Math.max(passesStoredTotal, passesCompleted);
  const passes_failed = Math.max(0, passes_total_derived - passesCompleted);
  
  // === DRIBBLES ===
  // The field "total_dribbles" has INCONSISTENT semantics across the codebase:
  // - In raw player_stats table: stores FAILED dribbles count
  // - When coming from usePlayerMatchStats via toOutfieldStatsFormat: already normalized (success + failed)
  // 
  // STRATEGY: If total_dribbles >= successful_dribbles, assume it's already the correct total
  // Otherwise, treat it as the failed count and derive total = success + failed
  const dribblesSuccess = safe(stats.successful_dribbles);
  const dribblesStoredTotal = safe(stats.total_dribbles);
  
  let dribbles_total_derived: number;
  let dribbles_failed: number;
  
  if (dribblesStoredTotal >= dribblesSuccess) {
    // Already normalized OR legacy data with real total
    dribbles_total_derived = dribblesStoredTotal;
    dribbles_failed = Math.max(0, dribblesStoredTotal - dribblesSuccess);
  } else {
    // Stored "total" is actually the failed count (e.g., success=6, total=4 means 4 failed)
    dribbles_failed = dribblesStoredTotal;
    dribbles_total_derived = dribblesSuccess + dribbles_failed;
  }
  
  // === DUELS ===
  // REGRA: duels_total = duels_won + duels_lost
  const duelsWon = safe(stats.duels_won);
  const duelsStoredTotal = safe(stats.total_duels);
  const duels_total_derived = Math.max(duelsStoredTotal, duelsWon);
  const duels_lost = Math.max(0, duels_total_derived - duelsWon);
  
  // === AERIAL DUELS ===
  // REGRA: aerial_total = aerial_won + aerial_lost
  const aerialWon = safe(stats.aerial_duels_won);
  const aerialStoredTotal = safe(stats.aerial_duels_total);
  const aerial_duels_total_derived = Math.max(aerialStoredTotal, aerialWon);
  const aerial_duels_lost = Math.max(0, aerial_duels_total_derived - aerialWon);
  
  // === GROUND DUELS ===
  // REGRA: ground_total = ground_won + ground_lost
  const groundWon = safe(stats.ground_duels_won);
  const groundStoredTotal = safe(stats.ground_duels_total);
  const ground_duels_total_derived = Math.max(groundStoredTotal, groundWon);
  const ground_duels_lost = Math.max(0, ground_duels_total_derived - groundWon);
  
  // === CROSSES ===
  // REGRA: crosses_total = crosses_success + crosses_failed
  const crossesSuccess = safe(stats.crosses_success);
  const crossesFailed = safe(stats.crosses_failed);
  const crosses_total = crossesSuccess + crossesFailed;
  
  return {
    // Pass through all raw values
    ...stats,
    // Override with derived values
    shots_total_derived,
    shots_off_target,
    passes_total_derived,
    passes_failed,
    dribbles_total_derived,
    dribbles_failed,
    duels_total_derived,
    duels_lost,
    aerial_duels_total_derived,
    aerial_duels_lost,
    ground_duels_total_derived,
    ground_duels_lost,
    crosses_total,
    // Also ensure these base fields are updated for backward compatibility
    shots: shots_total_derived,
    total_passes: passes_total_derived,
    total_dribbles: dribbles_total_derived,
    total_duels: duels_total_derived,
    aerial_duels_total: aerial_duels_total_derived,
    ground_duels_total: ground_duels_total_derived,
  };
}

/**
 * Normalize an array of player stats
 */
export function normalizePlayerStatsArray(
  statsArray: PlayerStats[]
): NormalizedPlayerStats[] {
  return statsArray.map(normalizePlayerStats);
}

/**
 * Debug log for normalized stats
 */
export function debugLogNormalizedPlayerStats(
  playerName: string,
  raw: PlayerStats | undefined,
  normalized: NormalizedPlayerStats
): void {
  if (import.meta.env.DEV) {
    console.log(`[NormalizePlayerStats] ${playerName}:`, {
      raw_shots: {
        total_stored: raw?.shots ?? 0,
        on_target: raw?.shots_on_target ?? 0,
        blocked: raw?.shots_blocked ?? 0,
      },
      normalized_shots: {
        total: normalized.shots_total_derived,
        on_target: normalized.shots_on_target ?? 0,
        blocked: normalized.shots_blocked ?? 0,
        off_target: normalized.shots_off_target,
      },
    });
  }
}
