
-- Create RPC to rebuild match_player_stats from events (SINGLE SOURCE OF TRUTH)
-- This ensures all stats come from events, not from potentially corrupted persisted data

CREATE OR REPLACE FUNCTION public.rebuild_match_player_stats_from_events(
  p_match_id uuid DEFAULT NULL,
  p_player_id uuid DEFAULT NULL
)
RETURNS TABLE(
  match_id uuid,
  player_id uuid,
  stats_before jsonb,
  stats_after jsonb,
  events_processed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  v_events_count integer;
  v_stats_before jsonb;
  v_stats_after jsonb;
  -- Computed stats from events
  v_goals integer;
  v_assists integer;
  v_shots integer;
  v_shots_on_target integer;
  v_shots_blocked integer;
  v_offsides integer;
  v_key_passes integer;
  v_chances_created integer;
  v_passes_completed integer;
  v_passes_failed integer;
  v_crosses_success integer;
  v_crosses_failed integer;
  v_dribbles_success integer;
  v_dribbles_failed integer;
  v_tackles integer;
  v_interceptions integer;
  v_recoveries integer;
  v_clearances integer;
  v_duels_won integer;
  v_duels_lost integer;
  v_aerial_duels_won integer;
  v_aerial_duels_lost integer;
  v_fouls_committed integer;
  v_fouls_suffered integer;
  v_possession_lost integer;
  v_yellow_cards integer;
  v_red_cards integer;
  v_saves integer;
  v_goals_conceded integer;
  v_blocked_shots integer;
  v_was_dribbled integer;
  v_ball_actions integer;
BEGIN
  -- Process each match/player combination
  FOR rec IN 
    SELECT DISTINCT mps.match_id, mps.player_id
    FROM match_player_stats mps
    WHERE (p_match_id IS NULL OR mps.match_id = p_match_id)
      AND (p_player_id IS NULL OR mps.player_id = p_player_id)
  LOOP
    -- Get current stats for comparison
    SELECT jsonb_build_object(
      'dribbles_success', mps.dribbles_success,
      'dribbles_total', mps.dribbles_total,
      'passes_completed', mps.passes_completed,
      'passes_total', mps.passes_total
    ) INTO v_stats_before
    FROM match_player_stats mps
    WHERE mps.match_id = rec.match_id AND mps.player_id = rec.player_id;
    
    -- Count events for this match/player
    SELECT COUNT(*) INTO v_events_count
    FROM match_events me
    WHERE me.match_id = rec.match_id 
      AND me.player_id = rec.player_id
      AND me.event_status = 'official'
      AND me.count_in_stats = true;
    
    -- Aggregate stats from events
    SELECT 
      COALESCE(SUM(CASE WHEN me.event_type = 'goal' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'assist' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'shot' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'shot_on_target' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'shot_blocked' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'offside' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'key_pass' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'chance_created' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'pass_success' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'pass_total' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'cross_success' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'cross_failed' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'dribble_success' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'dribble_attempt' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'tackle' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'interception' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'recovery' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'clearance' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type IN ('duel_won', 'ground_duel_won') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type IN ('duel_total', 'ground_duel_total') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'aerial_duel_won' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'aerial_duel_total' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'foul_committed' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'foul_suffered' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'possession_lost' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'yellow' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'red' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'save' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'goal_conceded' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'blocked_shot' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'was_dribbled' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN me.event_type = 'ball_action' THEN 1 ELSE 0 END), 0)
    INTO
      v_goals, v_assists, v_shots, v_shots_on_target, v_shots_blocked, v_offsides,
      v_key_passes, v_chances_created, v_passes_completed, v_passes_failed,
      v_crosses_success, v_crosses_failed, v_dribbles_success, v_dribbles_failed,
      v_tackles, v_interceptions, v_recoveries, v_clearances,
      v_duels_won, v_duels_lost, v_aerial_duels_won, v_aerial_duels_lost,
      v_fouls_committed, v_fouls_suffered, v_possession_lost,
      v_yellow_cards, v_red_cards, v_saves, v_goals_conceded,
      v_blocked_shots, v_was_dribbled, v_ball_actions
    FROM match_events me
    WHERE me.match_id = rec.match_id 
      AND me.player_id = rec.player_id
      AND me.event_status = 'official'
      AND me.count_in_stats = true;
    
    -- Update match_player_stats with values from events
    -- CRITICAL: dribbles_total and passes_total store FAILED count, NOT actual total
    UPDATE match_player_stats mps SET
      goals = v_goals,
      assists = v_assists,
      shots = v_shots,
      shots_on_target = v_shots_on_target,
      shots_blocked = v_shots_blocked,
      offsides = v_offsides,
      key_passes = v_key_passes,
      chances_created = v_chances_created,
      passes_completed = v_passes_completed,
      passes_total = v_passes_failed, -- STORES FAILED, NOT TOTAL!
      crosses_success = v_crosses_success,
      crosses_failed = v_crosses_failed,
      dribbles_success = v_dribbles_success,
      dribbles_total = v_dribbles_failed, -- STORES FAILED, NOT TOTAL!
      tackles = v_tackles,
      interceptions = v_interceptions,
      recoveries = v_recoveries,
      clearances = v_clearances,
      duels_won = v_duels_won,
      duels_total = v_duels_lost, -- STORES LOST, NOT TOTAL!
      aerial_duels_won = v_aerial_duels_won,
      aerial_duels_total = v_aerial_duels_lost, -- STORES LOST, NOT TOTAL!
      fouls_committed = v_fouls_committed,
      fouls_suffered = v_fouls_suffered,
      possession_lost = v_possession_lost,
      yellow_cards = v_yellow_cards,
      red_cards = v_red_cards,
      saves = v_saves,
      goals_conceded = v_goals_conceded,
      blocked_shots = v_blocked_shots,
      was_dribbled = v_was_dribbled,
      ball_actions = v_ball_actions,
      updated_at = now()
    WHERE mps.match_id = rec.match_id AND mps.player_id = rec.player_id;
    
    -- Get new stats for comparison
    SELECT jsonb_build_object(
      'dribbles_success', mps.dribbles_success,
      'dribbles_total', mps.dribbles_total,
      'passes_completed', mps.passes_completed,
      'passes_total', mps.passes_total
    ) INTO v_stats_after
    FROM match_player_stats mps
    WHERE mps.match_id = rec.match_id AND mps.player_id = rec.player_id;
    
    -- Return result
    match_id := rec.match_id;
    player_id := rec.player_id;
    stats_before := v_stats_before;
    stats_after := v_stats_after;
    events_processed := v_events_count;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION public.rebuild_match_player_stats_from_events TO authenticated;

COMMENT ON FUNCTION public.rebuild_match_player_stats_from_events IS 
'Rebuild match_player_stats from match_events. CRITICAL: dribbles_total/passes_total store FAILED count, not actual total.';
