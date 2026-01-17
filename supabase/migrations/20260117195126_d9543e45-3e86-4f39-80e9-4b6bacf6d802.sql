-- Update create_live_event_v2 to use football-style rounding for display_minute
-- Rule: if seconds >= 31, round up to next minute

CREATE OR REPLACE FUNCTION public.create_live_event_v2(
  p_game_id UUID,
  p_player_id UUID,
  p_type TEXT,
  p_half INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_force_time_seconds INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_event_id UUID;
  v_game_time_seconds INT;
  v_period INT;
  v_event_status TEXT;
  v_count_in_stats BOOLEAN;
  v_minute INT;
  v_remaining_seconds INT;
  v_final_display_minute TEXT;
  v_base_minute INT;
  v_regular_time_limit INT;
BEGIN
  -- Get match data
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Match not found');
  END IF;

  -- Determine period
  v_period := COALESCE(p_half, v_match.half, 1);

  -- Calculate game time in seconds
  IF p_force_time_seconds IS NOT NULL THEN
    v_game_time_seconds := p_force_time_seconds;
  ELSIF v_match.status = 'live' AND v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_game_time_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0) + 
      EXTRACT(EPOCH FROM (NOW() - v_match.half_start_time::timestamptz))::INT;
  ELSIF v_match.status = 'live' THEN
    v_game_time_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0);
  ELSE
    v_game_time_seconds := 0;
  END IF;

  -- Ensure non-negative
  v_game_time_seconds := GREATEST(v_game_time_seconds, 0);

  -- Calculate minute using football rounding rule
  -- If remaining seconds >= 31, round up to next minute
  v_remaining_seconds := v_game_time_seconds % 60;
  IF v_remaining_seconds >= 31 THEN
    v_minute := (v_game_time_seconds / 60) + 1;
  ELSE
    v_minute := v_game_time_seconds / 60;
  END IF;

  -- Calculate display minute with period offset
  IF v_period = 1 THEN
    v_base_minute := 0;
    v_regular_time_limit := 45;
  ELSE
    v_base_minute := 45;
    v_regular_time_limit := 90;
  END IF;

  -- Build display minute string
  IF (v_base_minute + v_minute) > v_regular_time_limit THEN
    -- Added time
    v_final_display_minute := v_regular_time_limit::TEXT || '+' || 
      ((v_base_minute + v_minute) - v_regular_time_limit)::TEXT || '''';
  ELSIF (v_base_minute + v_minute) = v_regular_time_limit AND v_remaining_seconds > 0 THEN
    -- At limit with seconds, might be added time
    v_final_display_minute := v_regular_time_limit::TEXT || '''';
  ELSE
    -- Ensure minimum of 1' for events after game started (unless exactly 0 seconds)
    IF (v_base_minute + v_minute) = 0 AND v_game_time_seconds > 0 THEN
      v_final_display_minute := '1''';
    ELSE
      v_final_display_minute := (v_base_minute + v_minute)::TEXT || '''';
    END IF;
  END IF;

  -- Determine event status and count_in_stats
  IF v_match.status = 'live' THEN
    v_event_status := 'official';
    v_count_in_stats := TRUE;
  ELSE
    v_event_status := 'pending';
    v_count_in_stats := FALSE;
  END IF;

  -- Insert the event
  INSERT INTO match_events (
    match_id,
    player_id,
    event_type,
    event_status,
    count_in_stats,
    game_time_seconds,
    minute,
    display_minute,
    half,
    period,
    value
  ) VALUES (
    p_game_id,
    p_player_id,
    p_type::match_event_type,
    v_event_status,
    v_count_in_stats,
    v_game_time_seconds,
    v_base_minute + v_minute,
    v_final_display_minute,
    COALESCE(p_half, v_period),
    v_period,
    1
  )
  RETURNING id INTO v_event_id;

  -- If event is official (game is live), apply stats immediately
  IF v_event_status = 'official' THEN
    PERFORM apply_event_stats(p_game_id, p_player_id, p_type, 1);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_status', v_event_status,
    'count_in_stats', v_count_in_stats,
    'game_time_seconds', v_game_time_seconds,
    'minute', v_base_minute + v_minute,
    'display_minute', v_final_display_minute,
    'stats_updated', v_event_status = 'official'
  );
END;
$$;