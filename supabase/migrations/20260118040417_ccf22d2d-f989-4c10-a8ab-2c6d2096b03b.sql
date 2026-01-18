-- Add missing columns to match_player_stats for proper duel tracking
ALTER TABLE public.match_player_stats 
ADD COLUMN IF NOT EXISTS aerial_duels_total integer NOT NULL DEFAULT 0;

-- Update apply_event_stats to properly handle aerial duels
-- aerial_duel_won should increment both aerial_duels_won AND aerial_duels_total
-- We also need to increment duels_total since aerial duels are a subset of duels
CREATE OR REPLACE FUNCTION public.apply_event_stats(
  p_delta integer DEFAULT 1,
  p_event_type text DEFAULT NULL::text,
  p_match_id uuid DEFAULT NULL::uuid,
  p_player_id uuid DEFAULT NULL::uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure player stats row exists
  INSERT INTO match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  -- Update stats based on event type with GREATEST to prevent negative
  CASE p_event_type
    -- Goal: +1 goal, +1 shot, +1 shot on target
    WHEN 'goal' THEN
      UPDATE match_player_stats
      SET 
        goals = GREATEST(0, goals + p_delta),
        shots = GREATEST(0, shots + p_delta),
        shots_on_target = GREATEST(0, shots_on_target + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Assist: +1 assist ONLY (no pass stats)
    WHEN 'assist' THEN
      UPDATE match_player_stats
      SET assists = GREATEST(0, assists + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Shot (off target): +1 shot only
    WHEN 'shot' THEN
      UPDATE match_player_stats
      SET shots = GREATEST(0, shots + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Shot on target: +1 shot, +1 shot on target
    WHEN 'shot_on_target' THEN
      UPDATE match_player_stats
      SET 
        shots = GREATEST(0, shots + p_delta),
        shots_on_target = GREATEST(0, shots_on_target + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Key pass
    WHEN 'key_pass' THEN
      UPDATE match_player_stats
      SET key_passes = GREATEST(0, key_passes + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Chance created
    WHEN 'chance_created' THEN
      UPDATE match_player_stats
      SET chances_created = GREATEST(0, chances_created + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Dribble success: +1 dribble success, +1 dribble total
    WHEN 'dribble_success' THEN
      UPDATE match_player_stats
      SET 
        dribbles_success = GREATEST(0, dribbles_success + p_delta),
        dribbles_total = GREATEST(0, dribbles_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Dribble attempt (failed): +1 dribble total only
    WHEN 'dribble_attempt' THEN
      UPDATE match_player_stats
      SET dribbles_total = GREATEST(0, dribbles_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Tackle
    WHEN 'tackle' THEN
      UPDATE match_player_stats
      SET tackles = GREATEST(0, tackles + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Interception
    WHEN 'interception' THEN
      UPDATE match_player_stats
      SET interceptions = GREATEST(0, interceptions + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Recovery
    WHEN 'recovery' THEN
      UPDATE match_player_stats
      SET recoveries = GREATEST(0, recoveries + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Clearance
    WHEN 'clearance' THEN
      UPDATE match_player_stats
      SET clearances = GREATEST(0, clearances + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Duel won (ground): +1 duel won, +1 duel total
    WHEN 'duel_won' THEN
      UPDATE match_player_stats
      SET 
        duels_won = GREATEST(0, duels_won + p_delta),
        duels_total = GREATEST(0, duels_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Duel total (ground lost): +1 duel total only
    WHEN 'duel_total' THEN
      UPDATE match_player_stats
      SET duels_total = GREATEST(0, duels_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Aerial duel won: +1 aerial won, +1 aerial total, +1 duel won, +1 duel total
    WHEN 'aerial_duel_won' THEN
      UPDATE match_player_stats
      SET 
        aerial_duels_won = GREATEST(0, aerial_duels_won + p_delta),
        aerial_duels_total = GREATEST(0, aerial_duels_total + p_delta),
        duels_won = GREATEST(0, duels_won + p_delta),
        duels_total = GREATEST(0, duels_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Yellow card
    WHEN 'yellow' THEN
      UPDATE match_player_stats
      SET yellow_cards = GREATEST(0, yellow_cards + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Red card
    WHEN 'red' THEN
      UPDATE match_player_stats
      SET red_cards = GREATEST(0, red_cards + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Foul committed
    WHEN 'foul_committed' THEN
      UPDATE match_player_stats
      SET fouls_committed = GREATEST(0, fouls_committed + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Foul suffered
    WHEN 'foul_suffered' THEN
      UPDATE match_player_stats
      SET fouls_suffered = GREATEST(0, fouls_suffered + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Pass success: +1 pass completed, +1 pass total
    WHEN 'pass_success' THEN
      UPDATE match_player_stats
      SET 
        passes_completed = GREATEST(0, passes_completed + p_delta),
        passes_total = GREATEST(0, passes_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Pass total (failed pass): +1 pass total only
    WHEN 'pass_total' THEN
      UPDATE match_player_stats
      SET passes_total = GREATEST(0, passes_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Possession lost
    WHEN 'possession_lost' THEN
      UPDATE match_player_stats
      SET possession_lost = GREATEST(0, possession_lost + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Save
    WHEN 'save' THEN
      UPDATE match_player_stats
      SET saves = GREATEST(0, saves + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Goal conceded
    WHEN 'goal_conceded' THEN
      UPDATE match_player_stats
      SET goals_conceded = GREATEST(0, goals_conceded + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Box save
    WHEN 'box_save' THEN
      UPDATE match_player_stats
      SET saves = GREATEST(0, saves + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Penalty saved
    WHEN 'penalty_saved' THEN
      UPDATE match_player_stats
      SET saves = GREATEST(0, saves + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    ELSE
      -- Unknown event type - no stats update
      NULL;
  END CASE;
END;
$$;