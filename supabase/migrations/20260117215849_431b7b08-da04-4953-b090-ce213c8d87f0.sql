-- Fix end_first_half_v2: DO NOT remove players from field at halftime
-- Only pause the clock and update elapsed time
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

  -- Close presence intervals for period 1 (for tracking purposes), 
  -- but DO NOT change is_on_field - players stay in field status
  UPDATE player_field_presence SET
    exited_at_seconds = v_final_seconds,
    updated_at = now()
  WHERE match_id = p_game_id 
    AND period = 1 
    AND exited_at_seconds IS NULL;

  -- Update match: pause clock, save elapsed time, stay in half=1 (halftime)
  -- Players remain on field - only clock state changes
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
    'message', 'Intervalo! Jogadores permanecem em campo.'
  );
END;
$$;

-- Fix start_second_half_v2: Preserve players on field and create new presence intervals
-- =====================================================
CREATE OR REPLACE FUNCTION public.start_second_half_v2(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_player RECORD;
  v_intervals_created integer := 0;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo';
  END IF;

  IF v_match.half != 1 THEN
    RAISE EXCEPTION 'Deve estar no intervalo para iniciar 2º tempo';
  END IF;

  -- Create new presence intervals for period 2 for all players currently on field
  -- (they stay on field, just need a new tracking interval for the new period)
  FOR v_player IN 
    SELECT id, player_id 
    FROM match_players 
    WHERE match_id = p_game_id AND is_on_field = true
  LOOP
    INSERT INTO player_field_presence (
      match_id,
      match_player_id,
      player_id,
      period,
      entered_at_seconds,
      role
    ) VALUES (
      p_game_id,
      v_player.id,
      v_player.player_id,
      2,
      0,
      'continuation'
    );
    v_intervals_created := v_intervals_created + 1;
  END LOOP;

  -- Update match to second half
  UPDATE matches SET
    half = 2,
    clock_status = 'running',
    half_start_time = now(),
    elapsed_seconds_in_half = 0,
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'half', 2,
    'players_continued', v_intervals_created,
    'message', '2º tempo iniciado! Jogadores permanecem em campo.'
  );
END;
$$;