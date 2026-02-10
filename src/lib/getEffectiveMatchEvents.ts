/**
 * getEffectiveMatchEvents - SINGLE SOURCE OF TRUTH for match event filtering
 * 
 * This function filters match events to return ONLY the effective (valid) events
 * that should be used for:
 * - Timeline display
 * - Summary/tile stats
 * - Player profile stats
 * 
 * RULES:
 * 1. Exclude voided events (event_status === "voided")
 * 2. Only include events that count in stats (count_in_stats === true) when forStats=true
 * 3. Only include official events (event_status === "official") when forStats=true
 * 4. Events edited in Review Mode are already persisted — the DB always has the latest version
 * 
 * IMPORTANT: The DB is already the source of truth for event times.
 * When edit_live_event_time RPC is called, it updates:
 * - match_events.minute, display_minute, game_time_seconds
 * - match_players.entered_minute / exited_minute (for player_on/player_off events)
 * So no additional revision tracking is needed on the frontend.
 */

export interface MatchEventMinimal {
  id: string;
  event_type: string;
  event_status: string;
  count_in_stats: boolean;
  player_id: string;
  value: number;
  [key: string]: any;
}

/**
 * Get effective match events for display (timeline)
 * Excludes voided events but includes drafts
 */
export function getEffectiveMatchEventsForDisplay<T extends MatchEventMinimal>(
  events: T[]
): T[] {
  return events.filter(e => e.event_status !== "voided");
}

/**
 * Get effective match events for stats calculation
 * Only official events that count in stats
 */
export function getEffectiveMatchEventsForStats<T extends MatchEventMinimal>(
  events: T[]
): T[] {
  return events.filter(
    e => e.event_status === "official" && e.count_in_stats === true
  );
}

/**
 * Compute player stats from effective events
 * 
 * This is the canonical way to derive stats from events.
 * Used by regenerateSummary and can be used for validation.
 * 
 * CRITICAL: The returned object uses the SAME field semantics as match_player_stats:
 * - passes_total = FAILED passes count (NOT actual total)
 * - dribbles_total = FAILED dribbles count (NOT actual total)
 * - duels_total = LOST duels count (NOT actual total)
 * - shots = OFF-TARGET shots count (NOT actual total)
 * 
 * See statsSemantics.ts for full documentation.
 */
export function computePlayerStatsFromEvents<T extends MatchEventMinimal>(
  events: T[],
  playerId: string
): Record<string, number> {
  const effective = getEffectiveMatchEventsForStats(events);
  const playerEvents = effective.filter(e => e.player_id === playerId);
  
  // Count events by type
  const counts: Record<string, number> = {};
  for (const event of playerEvents) {
    counts[event.event_type] = (counts[event.event_type] || 0) + event.value;
  }

  if (import.meta.env.DEV) {
    // Log pass events for debugging ghost passes
    const passEvents = playerEvents.filter(e => 
      e.event_type === 'pass_success' || e.event_type === 'pass_total'
    );
    if (passEvents.length > 0) {
      console.log(`[computePlayerStats] Player ${playerId.slice(0, 8)} passes:`, {
        pass_success_events: passEvents.filter(e => e.event_type === 'pass_success').length,
        pass_total_events: passEvents.filter(e => e.event_type === 'pass_total').length,
        pass_success_count: counts['pass_success'] || 0,
        pass_failed_count: counts['pass_total'] || 0,
        result: `${counts['pass_success'] || 0}/${(counts['pass_success'] || 0) + (counts['pass_total'] || 0)}`,
      });
    }
  }
  
  return {
    goals: counts["goal"] || 0,
    assists: counts["assist"] || 0,
    // shots = OFF-TARGET shots only
    shots: counts["shot"] || 0,
    shots_on_target: (counts["shot_on_target"] || 0) + (counts["goal"] || 0),
    shots_blocked: counts["shot_blocked"] || 0,
    key_passes: counts["key_pass"] || 0,
    chances_created: counts["chance_created"] || 0,
    // passes_completed = successful passes
    passes_completed: counts["pass_success"] || 0,
    // passes_total = FAILED passes only (NOT success + failed!)
    passes_total: counts["pass_total"] || 0,
    // dribbles_success = successful dribbles
    dribbles_success: counts["dribble_success"] || 0,
    // dribbles_total = FAILED dribbles only (NOT success + failed!)
    dribbles_total: counts["dribble_attempt"] || 0,
    tackles: counts["tackle"] || 0,
    interceptions: counts["interception"] || 0,
    recoveries: counts["recovery"] || 0,
    clearances: counts["clearance"] || 0,
    // duels_won = all won duels
    duels_won: (counts["duel_won"] || 0) + (counts["ground_duel_won"] || 0) + (counts["aerial_duel_won"] || 0),
    // duels_total = LOST duels only (NOT won + lost!)
    duels_total: (counts["duel_total"] || 0) + (counts["ground_duel_total"] || 0) + (counts["aerial_duel_total"] || 0),
    aerial_duels_won: counts["aerial_duel_won"] || 0,
    aerial_duels_total: counts["aerial_duel_total"] || 0,
    ground_duels_won: counts["ground_duel_won"] || 0,
    ground_duels_total: counts["ground_duel_total"] || 0,
    crosses_success: counts["cross_success"] || 0,
    crosses_failed: counts["cross_failed"] || 0,
    yellow_cards: counts["yellow"] || 0,
    red_cards: counts["red"] || 0,
    fouls_committed: counts["foul_committed"] || 0,
    fouls_suffered: counts["foul_suffered"] || 0,
    possession_lost: counts["possession_lost"] || 0,
    saves: counts["save"] || 0,
    goals_conceded: counts["goal_conceded"] || 0,
  };
}
