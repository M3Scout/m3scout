-- Fix end_first_half_v2: Increment minutes_played when closing intervals
-- =====================================================
CREATE OR REPLACE FUNCTION public.end_first_half_v2(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_final_seconds integer;
  v_intervals_closed integer := 0;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo';
  END IF;

  IF v_match.half != 1 THEN
    RAISE EXCEPTION 'Deve estar no 1º tempo';
  END IF;

  -- Calculate final elapsed seconds for first half
  IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_final_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0) + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  ELSE
    v_final_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0);
  END IF;

  -- Close presence intervals AND increment minutes_played for each player
  WITH closed_intervals AS (
    UPDATE player_field_presence SET
      exited_at_seconds = v_final_seconds,
      updated_at = now()
    WHERE match_id = p_game_id 
      AND period = 1 
      AND exited_at_seconds IS NULL
    RETURNING match_player_id, entered_at_seconds
  )
  UPDATE match_players mp SET
    minutes_played = COALESCE(mp.minutes_played, 0) + 
      GREATEST(0, FLOOR((v_final_seconds - ci.entered_at_seconds) / 60.0)::integer),
    updated_at = now()
  FROM closed_intervals ci
  WHERE mp.id = ci.match_player_id;

  GET DIAGNOSTICS v_intervals_closed = ROW_COUNT;

  -- Update match: pause clock, save elapsed time, stay in half=1 (halftime)
  UPDATE matches SET
    clock_status = 'stopped',
    elapsed_seconds_in_half = v_final_seconds,
    half_start_time = NULL,
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'final_seconds', v_final_seconds,
    'intervals_closed', v_intervals_closed,
    'message', 'Intervalo! Minutos do 1º tempo contabilizados.'
  );
END;
$$;

-- Fix end_game_v2: Increment minutes_played when closing intervals
-- =====================================================
CREATE OR REPLACE FUNCTION public.end_game_v2(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_final_seconds integer;
  v_players_closed integer;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo para encerrar';
  END IF;

  -- Calculate final elapsed time
  IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_final_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0) + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  ELSE
    v_final_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0);
  END IF;

  -- Close all open presence intervals AND increment minutes_played
  WITH closed_intervals AS (
    UPDATE player_field_presence SET
      exited_at_seconds = v_final_seconds,
      updated_at = now()
    WHERE match_id = p_game_id 
      AND period = v_match.half 
      AND exited_at_seconds IS NULL
    RETURNING match_player_id, entered_at_seconds
  )
  UPDATE match_players mp SET
    minutes_played = COALESCE(mp.minutes_played, 0) + 
      GREATEST(0, FLOOR((v_final_seconds - ci.entered_at_seconds) / 60.0)::integer),
    updated_at = now()
  FROM closed_intervals ci
  WHERE mp.id = ci.match_player_id;

  GET DIAGNOSTICS v_players_closed = ROW_COUNT;

  -- Update all on-field players to off-field
  UPDATE match_players SET
    is_on_field = false,
    exited_minute = CASE v_match.half 
      WHEN 1 THEN FLOOR(v_final_seconds / 60.0)::integer
      ELSE 45 + FLOOR(v_final_seconds / 60.0)::integer
    END,
    updated_at = now()
  WHERE match_id = p_game_id AND is_on_field = true;

  -- Update match to finished
  UPDATE matches SET
    status = 'finished',
    clock_status = 'stopped',
    elapsed_seconds_in_half = v_final_seconds,
    half_start_time = NULL,
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'finished',
    'final_half', v_match.half,
    'final_seconds', v_final_seconds,
    'players_closed', v_players_closed,
    'message', 'Jogo encerrado! Minutos contabilizados.'
  );
END;
$$;