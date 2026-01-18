-- Fix: apply_event_stats overload ambiguity ("is not unique")
-- Root cause: two overloaded functions named apply_event_stats with the same parameter names but different argument order.
-- Resolution: standardize call sites to the canonical signature and drop the legacy overload.

CREATE OR REPLACE FUNCTION public.create_live_event_v2(
  p_game_id uuid,
  p_player_id uuid,
  p_type text,
  p_half integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_force_time_seconds integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_current_seconds integer;
  v_event_id uuid;
  v_event_status text;
  v_display_minute text;
  v_period integer;
  v_half_duration integer := 45 * 60; -- 45 minutes per half in seconds
BEGIN
  -- Fetch match info
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Partida não encontrada');
  END IF;

  -- Determine period from p_half or match state
  v_period := COALESCE(p_half, v_match.half, 1);

  -- Determine event status based on match status
  IF v_match.status = 'live' THEN
    v_event_status := 'official';
  ELSE
    v_event_status := 'draft';
  END IF;

  -- Calculate current game time in seconds
  IF p_force_time_seconds IS NOT NULL THEN
    v_current_seconds := p_force_time_seconds;
  ELSIF v_match.status = 'live' AND v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    -- Calculate elapsed seconds based on timer
    v_current_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0) +
      EXTRACT(EPOCH FROM (NOW() - v_match.half_start_time))::integer;

    -- Add first half duration if in second half
    IF v_period = 2 THEN
      v_current_seconds := v_current_seconds + v_half_duration;
    END IF;
  ELSIF v_match.status = 'live' AND v_match.clock_status = 'paused' THEN
    v_current_seconds := COALESCE(v_match.elapsed_seconds_in_half, 0);
    IF v_period = 2 THEN
      v_current_seconds := v_current_seconds + v_half_duration;
    END IF;
  ELSE
    -- Draft mode - use 0 seconds or first half start
    v_current_seconds := 0;
  END IF;

  -- Calculate display minute (e.g., "45+2", "67'")
  DECLARE
    v_base_minutes integer;
    v_period_seconds integer;
    v_added_time integer;
  BEGIN
    IF v_period = 1 THEN
      v_period_seconds := LEAST(v_current_seconds, v_half_duration);
      v_base_minutes := CEIL(v_period_seconds::float / 60);
      IF v_current_seconds > v_half_duration THEN
        v_added_time := CEIL((v_current_seconds - v_half_duration)::float / 60);
        v_display_minute := '45+' || v_added_time::text;
      ELSE
        v_display_minute := GREATEST(1, v_base_minutes)::text || '''';
      END IF;
    ELSE
      v_period_seconds := v_current_seconds - v_half_duration;
      v_base_minutes := 45 + CEIL(LEAST(v_period_seconds, v_half_duration)::float / 60);
      IF v_period_seconds > v_half_duration THEN
        v_added_time := CEIL((v_period_seconds - v_half_duration)::float / 60);
        v_display_minute := '90+' || v_added_time::text;
      ELSE
        v_display_minute := GREATEST(46, v_base_minutes)::text || '''';
      END IF;
    END IF;
  END;

  -- Insert the event
  INSERT INTO match_events (
    match_id,
    player_id,
    event_type,
    event_status,
    game_time_seconds,
    period,
    half,
    display_minute,
    value,
    count_in_stats
  ) VALUES (
    p_game_id,
    p_player_id,
    p_type::match_event_type,
    v_event_status,
    v_current_seconds,
    v_period,
    v_period,
    v_display_minute,
    1,
    v_event_status = 'official'
  )
  RETURNING id INTO v_event_id;

  -- If event is official, apply stats immediately
  IF v_event_status = 'official' THEN
    -- IMPORTANT: use positional args to bind to the canonical signature:
    -- apply_event_stats(p_delta integer, p_event_type text, p_match_id uuid, p_player_id uuid)
    PERFORM public.apply_event_stats(1, p_type, p_game_id, p_player_id);
  END IF;

  RETURN json_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_status', v_event_status,
    'game_time_seconds', v_current_seconds,
    'display_minute', v_display_minute,
    'period', v_period,
    'stats_applied', v_event_status = 'official'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_last_live_event(
  p_game_id uuid,
  p_player_id uuid,
  p_event_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_match RECORD;
BEGIN
  -- Fetch match info
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Partida não encontrada');
  END IF;

  -- Find the most recent event of this type for this player in this match
  SELECT * INTO v_event
  FROM match_events
  WHERE match_id = p_game_id
    AND player_id = p_player_id
    AND event_type = p_event_type::match_event_type
    AND event_status != 'voided'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Nenhum evento encontrado para remover');
  END IF;

  -- If the event was official, reverse the stats
  IF v_event.event_status = 'official' AND v_event.count_in_stats THEN
    PERFORM public.apply_event_stats(-1, p_event_type, p_game_id, p_player_id);
  END IF;

  -- Mark the event as voided instead of deleting (for audit trail)
  UPDATE match_events
  SET
    event_status = 'voided',
    count_in_stats = false,
    void_reason = 'Removido pelo usuário'
  WHERE id = v_event.id;

  RETURN json_build_object(
    'success', true,
    'event_id', v_event.id,
    'event_type', p_event_type,
    'message', 'Evento removido com sucesso'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_live_event(
  p_event_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
BEGIN
  -- Get event data
  SELECT * INTO v_event FROM match_events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'event_not_found',
      'message', 'Evento não encontrado'
    );
  END IF;

  -- If event was official and counted in stats, revert them
  IF v_event.event_status = 'official' AND v_event.count_in_stats THEN
    PERFORM public.apply_event_stats(-1, v_event.event_type::text, v_event.match_id, v_event.player_id);
  END IF;

  -- Void the event
  UPDATE match_events
  SET
    event_status = 'voided',
    count_in_stats = false,
    void_reason = p_reason
  WHERE id = p_event_id;

  RETURN json_build_object(
    'success', true,
    'event_id', p_event_id,
    'stats_reverted', v_event.count_in_stats
  );
END;
$$;

-- Drop the legacy overload that caused ambiguity with named parameters.
DROP FUNCTION IF EXISTS public.apply_event_stats(uuid, uuid, text, integer);