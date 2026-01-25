/**
 * Standardized "Time on Field" calculation utilities.
 * 
 * SCOUTING STANDARD:
 * - "Minutos Regulamentares" (Reg): Used for scoring, percentages, ratings - CAPPED at 90
 * - "Tempo Total" (Total): Informational only, includes added time (acréscimos)
 * 
 * OFFICIAL RULES:
 * - Starter: startMinute = 0
 * - End of regulation = 90 (always)
 * - Substitute: use exact minute from "Entrou em Campo" event
 * 
 * CALCULATION:
 * - minutesPlayedReg = time played within 0-90, capped at 90
 * - minutesPlayedTotal = actual time played including added time (informational)
 */

export const STANDARD_MATCH_DURATION = 90;

/**
 * Normalize a minute value to regulatory time (0-90, capped at 90)
 * Handles formats like "45+5" → 45, "90+8" → 90, or numeric values
 */
export function normalizeMinuteReg(minute: number | string | null): number {
  if (minute === null || minute === undefined) return 0;
  
  // If it's a string like "45+5" or "90+8", extract the base minute
  if (typeof minute === "string") {
    const match = minute.match(/^(\d+)\+?\d*$/);
    if (match) {
      const baseMinute = parseInt(match[1], 10);
      // Cap at 90 for regulatory
      return Math.min(baseMinute, STANDARD_MATCH_DURATION);
    }
    // Try parsing as simple number
    const parsed = parseInt(minute, 10);
    if (!isNaN(parsed)) {
      return Math.min(parsed, STANDARD_MATCH_DURATION);
    }
    return 0;
  }
  
  // Numeric value - cap at 90
  return Math.min(Math.max(0, minute), STANDARD_MATCH_DURATION);
}

/**
 * Normalize a minute value to total time (includes added time)
 * Handles formats like "45+5" → 50, "90+8" → 98, or numeric values
 */
export function normalizeMinuteTotal(
  minute: number | string | null, 
  matchEffectiveDuration: number
): number {
  if (minute === null || minute === undefined) return 0;
  
  // If it's a string like "45+5" or "90+8", calculate actual minute
  if (typeof minute === "string") {
    const match = minute.match(/^(\d+)\+(\d+)$/);
    if (match) {
      const baseMinute = parseInt(match[1], 10);
      const addedMinute = parseInt(match[2], 10);
      const total = baseMinute + addedMinute;
      return Math.min(total, matchEffectiveDuration);
    }
    // Simple number format
    const parsed = parseInt(minute, 10);
    if (!isNaN(parsed)) {
      return Math.min(parsed, matchEffectiveDuration);
    }
    return 0;
  }
  
  // Numeric value - cap at effective duration
  return Math.min(Math.max(0, minute), matchEffectiveDuration);
}

/**
 * Calculate effective match duration including added time
 */
export function getMatchEffectiveDuration(
  baseDuration: number = STANDARD_MATCH_DURATION,
  addedTime1H: number = 0,
  addedTime2H: number = 0
): number {
  return baseDuration + addedTime1H + addedTime2H;
}

export interface MinutesPlayedInfo {
  /** Regulatory minutes played (always capped at 90) - used for scoring/ratings */
  minutesPlayed: number;
  /** Total minutes played including added time (informational only) */
  minutesPlayedTotal: number;
  /** Start minute (0 for starters, entered_minute for subs) */
  startMinute: number;
  /** End minute regulatory (capped at 90) */
  endMinute: number;
  /** End minute total (includes added time) */
  endMinuteTotal: number;
  /** Display string like "0' → 90'" or "71' → 90'" (uses regulatory) */
  rangeDisplay: string;
  /** Display string with actual end including added time like "0' → 90+8'" */
  rangeDisplayTotal: string;
  /** Display string like "90 min" (regulatory) */
  durationDisplay: string;
  /** Display string like "98 min" (total with added time) */
  durationDisplayTotal: string;
  /** Whether match had added time */
  hasAddedTime: boolean;
}

export interface MatchPlayerMinutesInput {
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played?: number | null; // Manual override (uses regulatory)
}

export interface MatchContextInput {
  /** Base match duration (default 90) */
  baseDuration?: number;
  /** Added time in first half */
  addedTime1H?: number;
  /** Added time in second half */
  addedTime2H?: number;
  /** Raw end minute string like "90+8" if available */
  rawEndMinute?: string | null;
}

/**
 * Calculate standardized minutes played for a match player.
 * Returns both regulatory (capped at 90) and total (with added time) values.
 * 
 * @param player - Match player data with started, entered_minute, exited_minute
 * @param matchContext - Optional match context with added time info
 * @returns MinutesPlayedInfo with both regulatory and total values
 */
export function calculateMinutesPlayed(
  player: MatchPlayerMinutesInput,
  matchContext?: MatchContextInput
): MinutesPlayedInfo {
  const baseDuration = matchContext?.baseDuration ?? STANDARD_MATCH_DURATION;
  const addedTime1H = matchContext?.addedTime1H ?? 0;
  const addedTime2H = matchContext?.addedTime2H ?? 0;
  const effectiveDuration = getMatchEffectiveDuration(baseDuration, addedTime1H, addedTime2H);
  const hasAddedTime = addedTime1H > 0 || addedTime2H > 0;
  
  // If manual override is set, use it for regulatory (but still calculate range)
  const hasManualOverride = player.minutes_played !== null && player.minutes_played !== undefined;
  
  let startMinute: number;
  let endMinuteReg: number;
  let endMinuteTotal: number;
  let rawEndDisplay: string;
  
  if (player.started) {
    // Starter: begins at 0'
    startMinute = 0;
    
    if (player.exited_minute !== null) {
      // Was substituted out - use actual exit minute
      endMinuteReg = normalizeMinuteReg(player.exited_minute);
      endMinuteTotal = normalizeMinuteTotal(player.exited_minute, effectiveDuration);
      rawEndDisplay = String(player.exited_minute);
    } else {
      // Played until end
      endMinuteReg = STANDARD_MATCH_DURATION;
      endMinuteTotal = effectiveDuration;
      // Use added time format if available
      if (addedTime2H > 0) {
        rawEndDisplay = `90+${addedTime2H}`;
      } else {
        rawEndDisplay = "90";
      }
    }
  } else {
    // Substitute: begins at entered_minute
    if (player.entered_minute !== null) {
      startMinute = normalizeMinuteReg(player.entered_minute);
      
      if (player.exited_minute !== null) {
        // Was substituted out
        endMinuteReg = normalizeMinuteReg(player.exited_minute);
        endMinuteTotal = normalizeMinuteTotal(player.exited_minute, effectiveDuration);
        rawEndDisplay = String(player.exited_minute);
      } else {
        // Played until end
        endMinuteReg = STANDARD_MATCH_DURATION;
        endMinuteTotal = effectiveDuration;
        if (addedTime2H > 0) {
          rawEndDisplay = `90+${addedTime2H}`;
        } else {
          rawEndDisplay = "90";
        }
      }
    } else {
      // Never entered - 0 minutes
      startMinute = 0;
      endMinuteReg = 0;
      endMinuteTotal = 0;
      rawEndDisplay = "—";
    }
  }
  
  // Calculate minutes played
  let minutesPlayedReg = Math.max(0, endMinuteReg - startMinute);
  const minutesPlayedTotal = Math.max(0, endMinuteTotal - startMinute);
  
  // Cap regulatory at 90 (safety)
  minutesPlayedReg = Math.min(minutesPlayedReg, STANDARD_MATCH_DURATION);
  
  // Use manual override if set (for regulatory only)
  if (hasManualOverride) {
    minutesPlayedReg = Math.min(player.minutes_played!, STANDARD_MATCH_DURATION);
  }
  
  // Build display strings
  const didPlay = player.started || player.entered_minute !== null;
  
  // Regulatory range display (capped at 90)
  const rangeDisplay = didPlay
    ? `${startMinute}' → ${endMinuteReg}'`
    : "—";
  
  // Total range display (shows actual end with added time)
  const rangeDisplayTotal = didPlay
    ? `${startMinute}' → ${rawEndDisplay}'`
    : "—";
  
  const durationDisplay = `${minutesPlayedReg} min`;
  const durationDisplayTotal = `${minutesPlayedTotal} min`;
  
  return {
    minutesPlayed: minutesPlayedReg,
    minutesPlayedTotal,
    startMinute,
    endMinute: endMinuteReg,
    endMinuteTotal,
    rangeDisplay,
    rangeDisplayTotal,
    durationDisplay,
    durationDisplayTotal,
    hasAddedTime,
  };
}

/**
 * Get percentage of match played (based on 90' regulatory game)
 * Always capped at 100%
 */
export function getMinutesPlayedPercent(minutesPlayed: number): number {
  const percent = Math.round((minutesPlayed / STANDARD_MATCH_DURATION) * 100);
  return Math.min(percent, 100);
}
