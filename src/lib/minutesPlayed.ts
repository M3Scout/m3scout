/**
 * Standardized "Time on Field" calculation utilities.
 * 
 * OFFICIAL RULES:
 * - Starter: startMinute = 0
 * - End of game ALWAYS = 90 (ignore added time)
 * - Substitute: use exact minute from "Entrou em Campo" event
 * 
 * CALCULATION:
 * - endMinute = 90
 * - minutesPlayed = max(0, endMinute - startMinute)
 * 
 * DISPLAY:
 * - Starter: "0' → 90'" | "90 min"
 * - Substitute (entered at X'): "X' → 90'" | "(90 - X) min"
 */

export const STANDARD_MATCH_DURATION = 90;

export interface MinutesPlayedInfo {
  /** Total minutes played (always based on 90' game) */
  minutesPlayed: number;
  /** Start minute (0 for starters, entered_minute for subs) */
  startMinute: number;
  /** End minute (always 90, or exited_minute if substituted out) */
  endMinute: number;
  /** Display string like "0' → 90'" or "71' → 90'" */
  rangeDisplay: string;
  /** Display string like "90 min" or "19 min" */
  durationDisplay: string;
}

export interface MatchPlayerMinutesInput {
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played?: number | null; // Manual override
}

/**
 * Calculate standardized minutes played for a match player.
 * 
 * @param player - Match player data with started, entered_minute, exited_minute
 * @returns MinutesPlayedInfo with calculated values and display strings
 */
export function calculateMinutesPlayed(player: MatchPlayerMinutesInput): MinutesPlayedInfo {
  // If manual override is set, use it (but still calculate proper range display)
  const hasManualOverride = player.minutes_played !== null && player.minutes_played !== undefined;
  
  let startMinute: number;
  let endMinute: number;
  
  if (player.started) {
    // Starter: begins at 0'
    startMinute = 0;
    
    if (player.exited_minute !== null) {
      // Was substituted out - use actual exit minute (capped at 90)
      endMinute = Math.min(player.exited_minute, STANDARD_MATCH_DURATION);
    } else {
      // Played until end = 90'
      endMinute = STANDARD_MATCH_DURATION;
    }
  } else {
    // Substitute: begins at entered_minute
    if (player.entered_minute !== null) {
      startMinute = player.entered_minute;
      
      if (player.exited_minute !== null) {
        // Was substituted out - use actual exit minute (capped at 90)
        endMinute = Math.min(player.exited_minute, STANDARD_MATCH_DURATION);
      } else {
        // Played until end = 90'
        endMinute = STANDARD_MATCH_DURATION;
      }
    } else {
      // Never entered - 0 minutes
      startMinute = 0;
      endMinute = 0;
    }
  }
  
  // Calculate minutes played
  let minutesPlayed = Math.max(0, endMinute - startMinute);
  
  // Use manual override if set
  if (hasManualOverride) {
    minutesPlayed = player.minutes_played!;
  }
  
  // Build display strings
  const rangeDisplay = player.started || player.entered_minute !== null
    ? `${startMinute}' → ${endMinute}'`
    : "—";
  
  const durationDisplay = `${minutesPlayed} min`;
  
  return {
    minutesPlayed,
    startMinute,
    endMinute,
    rangeDisplay,
    durationDisplay,
  };
}

/**
 * Get percentage of match played (based on 90' game)
 */
export function getMinutesPlayedPercent(minutesPlayed: number): number {
  return Math.round((minutesPlayed / STANDARD_MATCH_DURATION) * 100);
}
