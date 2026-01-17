-- =====================================================
-- LIVE MATCH V4: Automatic Event Creation for Player Entry/Exit
-- =====================================================
-- Objetivo: Criar eventos automaticamente quando jogador entra/sai de campo

-- =====================================================
-- 1. Add new event types to the enum
-- =====================================================
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'player_on';
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'player_off';

-- =====================================================
-- 2. RPC: player_enter_field_with_event (V4)
-- Atomically: update presence + create event
-- =====================================================
CREATE OR REPLACE FUNCTION public.player_enter_field(
  p_match_id uuid,
  p_match_player_id uuid,
  p_role text DEFAULT 'substitute'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_mp RECORD;
  v_period_seconds integer;
  v_presence_id uuid;
  v_event_id uuid;
  v_display_minute text;
  v_event_status text;
BEGIN
  -- Get match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  -- Get match player
  SELECT * INTO v_mp FROM match_players WHERE id = p_match_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogador não encontrado no jogo';
  END IF;

  -- Verify player isn't already on field
  IF v_mp.is_on_field = true THEN
    RAISE EXCEPTION 'Jogador já está em campo';
  END IF;

  -- Get current period clock
  v_period_seconds := get_period_clock_seconds(p_match_id);

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

  -- Create presence record
  INSERT INTO player_field_presence (
    match_id, match_player_id, player_id, period, role, entered_at_seconds
  ) VALUES (
    p_match_id, p_match_player_id, v_mp.player_id, v_match.half, p_role, v_period_seconds
  )
  RETURNING id INTO v_presence_id;

  -- Update match_players
  UPDATE match_players SET
    is_on_field = true,
    entered_minute = FLOOR(v_period_seconds / 60.0)::integer,
    updated_at = now()
  WHERE id = p_match_player_id;

  -- Create event in timeline (PLAYER_ON)
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
    v_period_seconds,
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
    'entered_at_seconds', v_period_seconds,
    'display_minute', v_display_minute,
    'event_status', v_event_status
  );
END;
$$;

-- =====================================================
-- 3. RPC: player_exit_field_with_event (V4)
-- Atomically: update presence + create event
-- =====================================================
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
  v_match RECORD;
  v_mp RECORD;
  v_period_seconds integer;
  v_presence RECORD;
  v_minutes_this_interval integer;
  v_event_id uuid;
  v_display_minute text;
  v_event_status text;
BEGIN
  -- Get match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  -- Get match player
  SELECT * INTO v_mp FROM match_players WHERE id = p_match_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogador não encontrado no jogo';
  END IF;

  -- Verify player is on field
  IF v_mp.is_on_field = false THEN
    RAISE EXCEPTION 'Jogador não está em campo';
  END IF;

  -- Get current period clock
  v_period_seconds := get_period_clock_seconds(p_match_id);

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

  -- Find the open presence record for current period
  SELECT * INTO v_presence 
  FROM player_field_presence 
  WHERE match_player_id = p_match_player_id 
    AND period = v_match.half 
    AND exited_at_seconds IS NULL
  ORDER BY entered_at_seconds DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    -- Close the presence interval
    UPDATE player_field_presence SET
      exited_at_seconds = v_period_seconds,
      updated_at = now()
    WHERE id = v_presence.id;

    v_minutes_this_interval := GREATEST(0, FLOOR((v_period_seconds - v_presence.entered_at_seconds) / 60.0)::integer);
  ELSE
    v_minutes_this_interval := 0;
  END IF;

  -- Update match_players
  UPDATE match_players SET
    is_on_field = false,
    exited_minute = FLOOR(v_period_seconds / 60.0)::integer,
    minutes_played = COALESCE(minutes_played, 0) + v_minutes_this_interval,
    updated_at = now()
  WHERE id = p_match_player_id;

  -- Create event in timeline (PLAYER_OFF)
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
    v_period_seconds,
    v_display_minute,
    v_event_status,
    false  -- Entry/exit events don't count in stats
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'match_player_id', p_match_player_id,
    'period', v_match.half,
    'exited_at_seconds', v_period_seconds,
    'minutes_this_interval', v_minutes_this_interval,
    'display_minute', v_display_minute,
    'event_status', v_event_status
  );
END;
$$;