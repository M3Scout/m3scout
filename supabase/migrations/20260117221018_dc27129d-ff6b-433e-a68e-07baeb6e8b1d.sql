-- Fix start_second_half_v2: Use valid role value ('substitute') instead of 'continuation'
-- The role check constraint only allows: 'starter' or 'substitute'
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
  -- Use 'substitute' as role since they are continuing from 1st half (valid check constraint value)
  -- Players who started the match and remain will have role='substitute' for period 2 tracking only
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
      'substitute'  -- Valid value per check constraint
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