
-- Create the missing function update_player_stat_for_event
-- This function updates match_player_stats when an event is recorded
CREATE OR REPLACE FUNCTION public.update_player_stat_for_event(
  p_match_id UUID,
  p_player_id UUID,
  p_event_type match_event_type,
  p_delta INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure match_player_stats row exists
  INSERT INTO match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  -- Update the appropriate stat column based on event type
  UPDATE match_player_stats
  SET updated_at = NOW(),
      goals = CASE WHEN p_event_type = 'goal' THEN GREATEST(0, goals + p_delta) ELSE goals END,
      assists = CASE WHEN p_event_type = 'assist' THEN GREATEST(0, assists + p_delta) ELSE assists END,
      shots = CASE WHEN p_event_type = 'shot' THEN GREATEST(0, shots + p_delta) ELSE shots END,
      shots_on_target = CASE WHEN p_event_type = 'shot_on_target' THEN GREATEST(0, shots_on_target + p_delta) ELSE shots_on_target END,
      key_passes = CASE WHEN p_event_type = 'key_pass' THEN GREATEST(0, key_passes + p_delta) ELSE key_passes END,
      chances_created = CASE WHEN p_event_type = 'chance_created' THEN GREATEST(0, chances_created + p_delta) ELSE chances_created END,
      passes_completed = CASE WHEN p_event_type = 'pass_complete' THEN GREATEST(0, passes_completed + p_delta) ELSE passes_completed END,
      passes_total = CASE WHEN p_event_type IN ('pass_complete', 'pass_failed') THEN GREATEST(0, passes_total + p_delta) ELSE passes_total END,
      dribbles_success = CASE WHEN p_event_type = 'dribble_success' THEN GREATEST(0, dribbles_success + p_delta) ELSE dribbles_success END,
      dribbles_total = CASE WHEN p_event_type IN ('dribble_success', 'dribble_failed') THEN GREATEST(0, dribbles_total + p_delta) ELSE dribbles_total END,
      tackles = CASE WHEN p_event_type = 'tackle' THEN GREATEST(0, tackles + p_delta) ELSE tackles END,
      interceptions = CASE WHEN p_event_type = 'interception' THEN GREATEST(0, interceptions + p_delta) ELSE interceptions END,
      recoveries = CASE WHEN p_event_type = 'recovery' THEN GREATEST(0, recoveries + p_delta) ELSE recoveries END,
      clearances = CASE WHEN p_event_type = 'clearance' THEN GREATEST(0, clearances + p_delta) ELSE clearances END,
      duels_won = CASE WHEN p_event_type = 'duel_won' THEN GREATEST(0, duels_won + p_delta) ELSE duels_won END,
      duels_total = CASE WHEN p_event_type IN ('duel_won', 'duel_lost') THEN GREATEST(0, duels_total + p_delta) ELSE duels_total END,
      aerial_duels_won = CASE WHEN p_event_type = 'aerial_won' THEN GREATEST(0, aerial_duels_won + p_delta) ELSE aerial_duels_won END,
      aerial_duels_total = CASE WHEN p_event_type IN ('aerial_won', 'aerial_lost') THEN GREATEST(0, aerial_duels_total + p_delta) ELSE aerial_duels_total END,
      yellow_cards = CASE WHEN p_event_type = 'yellow_card' THEN GREATEST(0, yellow_cards + p_delta) ELSE yellow_cards END,
      red_cards = CASE WHEN p_event_type = 'red_card' THEN GREATEST(0, red_cards + p_delta) ELSE red_cards END,
      fouls_committed = CASE WHEN p_event_type = 'foul_committed' THEN GREATEST(0, fouls_committed + p_delta) ELSE fouls_committed END,
      fouls_suffered = CASE WHEN p_event_type = 'foul_suffered' THEN GREATEST(0, fouls_suffered + p_delta) ELSE fouls_suffered END,
      possession_lost = CASE WHEN p_event_type = 'possession_lost' THEN GREATEST(0, possession_lost + p_delta) ELSE possession_lost END,
      saves = CASE WHEN p_event_type = 'save' THEN GREATEST(0, saves + p_delta) ELSE saves END,
      goals_conceded = CASE WHEN p_event_type = 'goal_conceded' THEN GREATEST(0, goals_conceded + p_delta) ELSE goals_conceded END,
      crosses_success = CASE WHEN p_event_type = 'cross_success' THEN GREATEST(0, crosses_success + p_delta) ELSE crosses_success END,
      crosses_failed = CASE WHEN p_event_type = 'cross_failed' THEN GREATEST(0, crosses_failed + p_delta) ELSE crosses_failed END,
      blocked_shots = CASE WHEN p_event_type = 'blocked_shot' THEN GREATEST(0, blocked_shots + p_delta) ELSE blocked_shots END,
      was_dribbled = CASE WHEN p_event_type = 'was_dribbled' THEN GREATEST(0, was_dribbled + p_delta) ELSE was_dribbled END,
      offsides = CASE WHEN p_event_type = 'offside' THEN GREATEST(0, offsides + p_delta) ELSE offsides END,
      ball_actions = CASE WHEN p_event_type = 'ball_action' THEN GREATEST(0, ball_actions + p_delta) ELSE ball_actions END
  WHERE match_id = p_match_id AND player_id = p_player_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_player_stat_for_event(UUID, UUID, match_event_type, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_stat_for_event(UUID, UUID, match_event_type, INTEGER) TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
