-- Fix player_enter_field to store ABSOLUTE game_time_seconds (not period-relative)
-- Bug: Was storing period-relative seconds (e.g., 1380s for 23' of 2nd half)
-- Fix: Store absolute seconds (e.g., 4080s for 68' = 45' + 23')

CREATE OR REPLACE FUNCTION public.player_enter_field(
  p_match_id uuid,
  p_match_player_id uuid,
  p_role text DEFAULT 'outfield'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_mp record;
  v_period_seconds integer;
  v_absolute_seconds integer;
  v_display_minute text;
  v_presence_id uuid;
  v_event_id uuid;
  v_event_status text;
  v_half_duration integer := 2700; -- 45 minutes in seconds
BEGIN
  -- Get match info
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada';
  END IF;

  -- Get match_player info
  SELECT mp.*, p.full_name
  INTO v_mp
  FROM match_players mp
  JOIN players p ON p.id = mp.player_id
  WHERE mp.id = p_match_player_id AND mp.match_id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogador não encontrado nesta partida';
  END IF;

  -- Verify player isn't already on field
  IF v_mp.is_on_field = true THEN
    RAISE EXCEPTION 'Jogador já está em campo';
  END IF;

  -- Get current period clock (time within the current half)
  v_period_seconds := get_period_clock_seconds(p_match_id);

  -- Calculate ABSOLUTE game time in seconds
  -- For 1st half: absolute = period_seconds
  -- For 2nd half: absolute = period_seconds + 2700 (45 minutes)
  IF v_match.half = 2 THEN
    v_absolute_seconds := v_period_seconds + v_half_duration;
  ELSE
    v_absolute_seconds := v_period_seconds;
  END IF;

  -- Calculate display minute (for UI display)
  v_display_minute := CASE 
    WHEN v_match.half = 1 THEN 
      CASE WHEN v_period_seconds <= 2700 THEN FLOOR(v_period_seconds / 60.0)::integer::text || ''''
      ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
      END
    ELSE 
      CASE WHEN v_period_seconds <= 2700 THEN (45 + FLOOR(v_period_seconds / 60.0)::integer)::text || ''''
      ELSE '90+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
      END
  END;

  -- Determine event status based on match status
  v_event_status := CASE WHEN v_match.status = 'live' THEN 'official' ELSE 'draft' END;

  -- Create presence record (stores period-relative seconds for its own logic)
  INSERT INTO player_field_presence (
    match_id, match_player_id, player_id, period, role, entered_at_seconds
  ) VALUES (
    p_match_id, p_match_player_id, v_mp.player_id, v_match.half, p_role, v_period_seconds
  )
  RETURNING id INTO v_presence_id;

  -- Update match_players with ABSOLUTE minute
  UPDATE match_players SET
    is_on_field = true,
    entered_minute = FLOOR(v_absolute_seconds / 60.0)::integer,
    updated_at = now()
  WHERE id = p_match_player_id;

  -- Create event in timeline (PLAYER_ON) with ABSOLUTE game_time_seconds
  INSERT INTO match_events (
    match_id,
    player_id,
    event_type,
    value,
    half,
    period,
    game_time_seconds,
    display_minute,
    event_status,
    count_in_stats
  ) VALUES (
    p_match_id,
    v_mp.player_id,
    'player_on',
    1,
    v_match.half,
    v_match.half,
    v_absolute_seconds,  -- FIXED: Store absolute seconds, not period-relative
    v_display_minute,
    v_event_status,
    false  -- Entry/exit events don't count in stats
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'presence_id', v_presence_id,
    'event_id', v_event_id,
    'match_player_id', p_match_player_id,
    'period', v_match.half,
    'entered_at_seconds', v_absolute_seconds,  -- Return absolute seconds
    'display_minute', v_display_minute,
    'event_status', v_event_status
  );
END;
$$;

-- Also fix player_exit_field to store ABSOLUTE game_time_seconds
CREATE OR REPLACE FUNCTION public.player_exit_field(
  p_match_id uuid,
  p_match_player_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match record;
  v_mp record;
  v_period_seconds integer;
  v_absolute_seconds integer;
  v_display_minute text;
  v_presence record;
  v_event_id uuid;
  v_event_status text;
  v_half_duration integer := 2700; -- 45 minutes in seconds
BEGIN
  -- Get match info
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada';
  END IF;

  -- Get match_player info
  SELECT mp.*, p.full_name
  INTO v_mp
  FROM match_players mp
  JOIN players p ON p.id = mp.player_id
  WHERE mp.id = p_match_player_id AND mp.match_id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogador não encontrado nesta partida';
  END IF;

  -- Verify player is on field
  IF v_mp.is_on_field = false THEN
    RAISE EXCEPTION 'Jogador não está em campo';
  END IF;

  -- Get the active presence record
  SELECT * INTO v_presence
  FROM player_field_presence
  WHERE match_player_id = p_match_player_id
    AND match_id = p_match_id
    AND exited_at_seconds IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get current period clock
  v_period_seconds := get_period_clock_seconds(p_match_id);

  -- Calculate ABSOLUTE game time in seconds
  IF v_match.half = 2 THEN
    v_absolute_seconds := v_period_seconds + v_half_duration;
  ELSE
    v_absolute_seconds := v_period_seconds;
  END IF;

  -- Calculate display minute
  v_display_minute := CASE 
    WHEN v_match.half = 1 THEN 
      CASE WHEN v_period_seconds <= 2700 THEN FLOOR(v_period_seconds / 60.0)::integer::text || ''''
      ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
      END
    ELSE 
      CASE WHEN v_period_seconds <= 2700 THEN (45 + FLOOR(v_period_seconds / 60.0)::integer)::text || ''''
      ELSE '90+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
      END
  END;

  -- Determine event status based on match status
  v_event_status := CASE WHEN v_match.status = 'live' THEN 'official' ELSE 'draft' END;

  -- Update presence record (keep using period-relative for its own calculations)
  IF v_presence.id IS NOT NULL THEN
    UPDATE player_field_presence SET
      exited_at_seconds = v_period_seconds,
      updated_at = now()
    WHERE id = v_presence.id;
  END IF;

  -- Update match_players with ABSOLUTE minute
  UPDATE match_players SET
    is_on_field = false,
    exited_minute = FLOOR(v_absolute_seconds / 60.0)::integer,
    updated_at = now()
  WHERE id = p_match_player_id;

  -- Create event in timeline (PLAYER_OFF) with ABSOLUTE game_time_seconds
  INSERT INTO match_events (
    match_id,
    player_id,
    event_type,
    value,
    half,
    period,
    game_time_seconds,
    display_minute,
    event_status,
    count_in_stats
  ) VALUES (
    p_match_id,
    v_mp.player_id,
    'player_off',
    1,
    v_match.half,
    v_match.half,
    v_absolute_seconds,  -- FIXED: Store absolute seconds, not period-relative
    v_display_minute,
    v_event_status,
    false  -- Entry/exit events don't count in stats
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_player_id', p_match_player_id,
    'period', v_match.half,
    'exited_at_seconds', v_absolute_seconds,  -- Return absolute seconds
    'display_minute', v_display_minute,
    'event_status', v_event_status,
    'event_id', v_event_id
  );
END;
$$;