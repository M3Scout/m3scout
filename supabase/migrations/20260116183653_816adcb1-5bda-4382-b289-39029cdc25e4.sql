-- =====================================================
-- LIVE MATCH STATE MACHINE + RPCs
-- =====================================================

-- 1) Add new columns to match_events for event status tracking
ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS event_status text NOT NULL DEFAULT 'official' 
  CHECK (event_status IN ('draft', 'official', 'voided'));

ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS count_in_stats boolean NOT NULL DEFAULT true;

ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS game_time_seconds integer NULL;

ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS void_reason text NULL;

ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS period integer DEFAULT 1;

-- 2) Add pause tracking columns to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS pause_total_seconds integer NOT NULL DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_match_events_event_status ON public.match_events(event_status);
CREATE INDEX IF NOT EXISTS idx_match_events_game_id_status ON public.match_events(match_id, event_status);

-- =====================================================
-- HELPER FUNCTION: Calculate live game clock seconds
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_live_game_clock_seconds(p_match_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_elapsed integer;
BEGIN
  SELECT 
    status,
    half,
    clock_status,
    half_start_time,
    elapsed_seconds_in_half,
    pause_total_seconds,
    match_start_time,
    duration_minutes
  INTO v_match
  FROM matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- If clock is running, calculate from half_start_time
  IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_elapsed := v_match.elapsed_seconds_in_half + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  ELSE
    v_elapsed := v_match.elapsed_seconds_in_half;
  END IF;

  -- Add first half if we're in second half
  IF v_match.half = 2 THEN
    v_elapsed := v_elapsed + (v_match.duration_minutes / 2) * 60;
  END IF;

  RETURN v_elapsed;
END;
$$;

-- =====================================================
-- RPC 1: START LIVE GAME
-- Transitions from draft -> live and officializes pending events
-- =====================================================
CREATE OR REPLACE FUNCTION public.start_live_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_events_updated integer;
  v_result jsonb;
BEGIN
  -- Get match and lock for update
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  -- Validate status
  IF v_match.status != 'draft' THEN
    RAISE EXCEPTION 'Jogo deve estar em pré-jogo para iniciar. Status atual: %', v_match.status;
  END IF;

  -- Update match: transition to live
  UPDATE matches SET
    status = 'live',
    half = 1,
    clock_status = 'running',
    match_start_time = now(),
    half_start_time = now(),
    elapsed_seconds_in_half = 0,
    pause_total_seconds = 0,
    updated_at = now()
  WHERE id = p_game_id;

  -- Update all starters to be on field with entered_minute = 0
  UPDATE match_players SET
    is_on_field = true,
    entered_minute = 0,
    updated_at = now()
  WHERE match_id = p_game_id 
    AND started = true 
    AND is_removed = false;

  -- Officialize all draft events (created during pre-game)
  UPDATE match_events SET
    event_status = 'official',
    count_in_stats = true,
    game_time_seconds = 0,
    minute = 0,
    display_minute = '0'''
  WHERE match_id = p_game_id 
    AND event_status = 'draft';

  GET DIAGNOSTICS v_events_updated = ROW_COUNT;

  -- Build result
  SELECT jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'live',
    'started_at', now(),
    'events_officialized', v_events_updated
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC 2: PAUSE LIVE GAME
-- =====================================================
CREATE OR REPLACE FUNCTION public.pause_live_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_new_elapsed integer;
BEGIN
  -- Get match and lock
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo para pausar';
  END IF;

  IF v_match.clock_status != 'running' THEN
    RAISE EXCEPTION 'Cronômetro já está pausado';
  END IF;

  -- Calculate elapsed time and pause
  v_new_elapsed := v_match.elapsed_seconds_in_half;
  IF v_match.half_start_time IS NOT NULL THEN
    v_new_elapsed := v_new_elapsed + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  END IF;

  UPDATE matches SET
    clock_status = 'paused',
    elapsed_seconds_in_half = v_new_elapsed,
    half_start_time = NULL,
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'clock_status', 'paused',
    'elapsed_seconds', v_new_elapsed
  );
END;
$$;

-- =====================================================
-- RPC 3: RESUME LIVE GAME
-- =====================================================
CREATE OR REPLACE FUNCTION public.resume_live_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
BEGIN
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo para retomar';
  END IF;

  IF v_match.clock_status = 'running' THEN
    RAISE EXCEPTION 'Cronômetro já está rodando';
  END IF;

  UPDATE matches SET
    clock_status = 'running',
    half_start_time = now(),
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'clock_status', 'running',
    'resumed_at', now()
  );
END;
$$;

-- =====================================================
-- RPC 4: FINISH LIVE GAME
-- =====================================================
CREATE OR REPLACE FUNCTION public.finish_live_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_final_clock integer;
BEGIN
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo para finalizar';
  END IF;

  -- Calculate final clock
  v_final_clock := v_match.elapsed_seconds_in_half;
  IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_final_clock := v_final_clock + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  END IF;

  -- Add first half if in second half
  IF v_match.half = 2 THEN
    v_final_clock := v_final_clock + (v_match.duration_minutes / 2) * 60;
  END IF;

  UPDATE matches SET
    status = 'finished',
    clock_status = 'stopped',
    elapsed_seconds_in_half = CASE 
      WHEN clock_status = 'running' AND half_start_time IS NOT NULL 
      THEN elapsed_seconds_in_half + EXTRACT(EPOCH FROM (now() - half_start_time))::integer
      ELSE elapsed_seconds_in_half
    END,
    half_start_time = NULL,
    updated_at = now()
  WHERE id = p_game_id;

  -- Calculate final minutes for all on-field players
  UPDATE match_players SET
    is_on_field = false,
    exited_minute = v_final_clock / 60,
    minutes_played = COALESCE(exited_minute, v_final_clock / 60) - COALESCE(entered_minute, 0),
    updated_at = now()
  WHERE match_id = p_game_id 
    AND is_on_field = true 
    AND is_removed = false;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'finished',
    'final_clock_seconds', v_final_clock
  );
END;
$$;

-- =====================================================
-- RPC 5: CREATE LIVE EVENT
-- Creates event with proper status based on game state
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_live_event(
  p_game_id uuid,
  p_player_id uuid,
  p_type text,
  p_notes text DEFAULT NULL,
  p_force_time_seconds integer DEFAULT NULL,
  p_half integer DEFAULT NULL,
  p_display_minute text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_event_status text;
  v_count_in_stats boolean;
  v_game_time_seconds integer;
  v_minute integer;
  v_final_display_minute text;
  v_event_id uuid;
  v_period integer;
BEGIN
  -- Get match state
  SELECT * INTO v_match
  FROM matches
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  -- Determine event status based on game state
  IF v_match.status = 'draft' THEN
    -- Pre-game: create as draft, will be officialized when game starts
    v_event_status := 'draft';
    v_count_in_stats := false;
    v_game_time_seconds := NULL;
    v_minute := NULL;
    v_final_display_minute := NULL;
    v_period := 1;
    
  ELSIF v_match.status = 'live' THEN
    -- Live: create as official with current time
    v_event_status := 'official';
    v_count_in_stats := true;
    v_period := v_match.half;
    
    -- Calculate game time
    IF p_force_time_seconds IS NOT NULL THEN
      v_game_time_seconds := p_force_time_seconds;
    ELSE
      v_game_time_seconds := get_live_game_clock_seconds(p_game_id);
    END IF;
    
    v_minute := v_game_time_seconds / 60;
    v_final_display_minute := COALESCE(p_display_minute, v_minute || '''');
    
  ELSIF v_match.status = 'finished' THEN
    -- Finished: block new events (could add admin override here)
    RAISE EXCEPTION 'Não é possível criar eventos em um jogo finalizado';
    
  ELSE
    RAISE EXCEPTION 'Estado de jogo inválido: %', v_match.status;
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
    v_minute,
    v_final_display_minute,
    COALESCE(p_half, v_period),
    v_period,
    1
  )
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_status', v_event_status,
    'count_in_stats', v_count_in_stats,
    'game_time_seconds', v_game_time_seconds,
    'minute', v_minute,
    'display_minute', v_final_display_minute
  );
END;
$$;

-- =====================================================
-- RPC 6: VOID LIVE EVENT
-- Voids an event instead of deleting (for audit trail)
-- =====================================================
CREATE OR REPLACE FUNCTION public.void_live_event(
  p_event_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
BEGIN
  SELECT * INTO v_event
  FROM match_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;

  IF v_event.event_status = 'voided' THEN
    RAISE EXCEPTION 'Evento já foi anulado';
  END IF;

  UPDATE match_events SET
    event_status = 'voided',
    count_in_stats = false,
    void_reason = p_reason
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'previous_status', v_event.event_status,
    'voided_at', now()
  );
END;
$$;

-- =====================================================
-- RPC 7: EDIT LIVE EVENT TIME
-- Allows editing the time of an event
-- =====================================================
CREATE OR REPLACE FUNCTION public.edit_live_event_time(
  p_event_id uuid,
  p_game_time_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_match RECORD;
  v_minute integer;
  v_display_minute text;
BEGIN
  SELECT e.*, m.status as match_status, m.duration_minutes
  INTO v_event
  FROM match_events e
  JOIN matches m ON m.id = e.match_id
  WHERE e.id = p_event_id
  FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;

  IF v_event.match_status NOT IN ('live', 'finished') THEN
    RAISE EXCEPTION 'Só é possível editar eventos de jogos ao vivo ou finalizados';
  END IF;

  v_minute := p_game_time_seconds / 60;
  
  -- Calculate display minute
  IF v_minute <= v_event.duration_minutes / 2 THEN
    v_display_minute := v_minute || '''';
  ELSIF v_minute <= v_event.duration_minutes THEN
    v_display_minute := v_minute || '''';
  ELSE
    -- Added time
    v_display_minute := v_event.duration_minutes || '+' || (v_minute - v_event.duration_minutes) || '''';
  END IF;

  UPDATE match_events SET
    game_time_seconds = p_game_time_seconds,
    minute = v_minute,
    display_minute = v_display_minute
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'game_time_seconds', p_game_time_seconds,
    'minute', v_minute,
    'display_minute', v_display_minute
  );
END;
$$;

-- =====================================================
-- RPC: Toggle play/pause (convenience function)
-- =====================================================
CREATE OR REPLACE FUNCTION public.toggle_live_game_clock(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
BEGIN
  SELECT clock_status INTO v_match
  FROM matches
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.clock_status = 'running' THEN
    RETURN pause_live_game(p_game_id);
  ELSE
    RETURN resume_live_game(p_game_id);
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_live_game_clock_seconds(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_live_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_live_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_live_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_live_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_live_event(uuid, uuid, text, text, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_live_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_live_event_time(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_live_game_clock(uuid) TO authenticated;