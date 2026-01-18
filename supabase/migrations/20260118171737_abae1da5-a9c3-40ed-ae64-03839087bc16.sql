-- Fix apply_event_stats: when 'goal' event is recorded, it should also count as a shot and shot_on_target
-- Root cause: goal events were only incrementing goals, not shots/shots_on_target
-- This caused player profile to show 0 shots even when goals were scored

CREATE OR REPLACE FUNCTION public.apply_event_stats(p_delta integer, p_event_type text, p_match_id uuid, p_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Upsert into match_player_stats with the appropriate column update
  INSERT INTO match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  -- Update the specific stat based on event type
  CASE p_event_type
    WHEN 'goal' THEN
      -- A goal is ALWAYS a shot on target, so increment: goals, shots, shots_on_target
      UPDATE match_player_stats 
      SET goals = GREATEST(0, goals + p_delta), 
          shots = GREATEST(0, shots + p_delta),
          shots_on_target = GREATEST(0, shots_on_target + p_delta),
          updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'assist' THEN
      UPDATE match_player_stats SET assists = GREATEST(0, assists + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'shot' THEN
      UPDATE match_player_stats SET shots = GREATEST(0, shots + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'shot_on_target' THEN
      UPDATE match_player_stats SET shots = GREATEST(0, shots + p_delta), shots_on_target = GREATEST(0, shots_on_target + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'key_pass' THEN
      UPDATE match_player_stats SET key_passes = GREATEST(0, key_passes + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'chance_created' THEN
      UPDATE match_player_stats SET chances_created = GREATEST(0, chances_created + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'dribble_success' THEN
      UPDATE match_player_stats SET dribbles_success = GREATEST(0, dribbles_success + p_delta), dribbles_total = GREATEST(0, dribbles_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'dribble_attempt' THEN
      UPDATE match_player_stats SET dribbles_total = GREATEST(0, dribbles_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'tackle' THEN
      UPDATE match_player_stats SET tackles = GREATEST(0, tackles + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'interception' THEN
      UPDATE match_player_stats SET interceptions = GREATEST(0, interceptions + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'recovery' THEN
      UPDATE match_player_stats SET recoveries = GREATEST(0, recoveries + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'clearance' THEN
      UPDATE match_player_stats SET clearances = GREATEST(0, clearances + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'duel_won' THEN
      UPDATE match_player_stats SET duels_won = GREATEST(0, duels_won + p_delta), duels_total = GREATEST(0, duels_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'duel_total' THEN
      UPDATE match_player_stats SET duels_total = GREATEST(0, duels_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'aerial_duel_won' THEN
      UPDATE match_player_stats SET aerial_duels_won = GREATEST(0, aerial_duels_won + p_delta), aerial_duels_total = GREATEST(0, aerial_duels_total + p_delta), duels_won = GREATEST(0, duels_won + p_delta), duels_total = GREATEST(0, duels_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'aerial_duel_total' THEN
      UPDATE match_player_stats SET aerial_duels_total = GREATEST(0, aerial_duels_total + p_delta), duels_total = GREATEST(0, duels_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'ground_duel_won' THEN
      UPDATE match_player_stats SET duels_won = GREATEST(0, duels_won + p_delta), duels_total = GREATEST(0, duels_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'ground_duel_total' THEN
      UPDATE match_player_stats SET duels_total = GREATEST(0, duels_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'yellow' THEN
      UPDATE match_player_stats SET yellow_cards = GREATEST(0, yellow_cards + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'red' THEN
      UPDATE match_player_stats SET red_cards = GREATEST(0, red_cards + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'foul_committed' THEN
      UPDATE match_player_stats SET fouls_committed = GREATEST(0, fouls_committed + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'foul_suffered' THEN
      UPDATE match_player_stats SET fouls_suffered = GREATEST(0, fouls_suffered + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'pass_success' THEN
      UPDATE match_player_stats SET passes_completed = GREATEST(0, passes_completed + p_delta), passes_total = GREATEST(0, passes_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'pass_total' THEN
      UPDATE match_player_stats SET passes_total = GREATEST(0, passes_total + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'possession_lost' THEN
      UPDATE match_player_stats SET possession_lost = GREATEST(0, possession_lost + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'save' THEN
      UPDATE match_player_stats SET saves = GREATEST(0, saves + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'box_save' THEN
      UPDATE match_player_stats SET saves = GREATEST(0, saves + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    WHEN 'goal_conceded' THEN
      UPDATE match_player_stats SET goals_conceded = GREATEST(0, goals_conceded + p_delta), updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
    ELSE
      -- Unknown event type - log or ignore
      NULL;
  END CASE;
END;
$function$;