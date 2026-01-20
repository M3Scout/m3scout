-- Update create_live_event_v2 and void_live_event to allow edits on 'applied' matches
-- This enables Post-Match Review Mode to correct statistics even after they've been applied

-- First, update create_live_event_v2
DROP FUNCTION IF EXISTS public.create_live_event_v2(uuid, uuid, text, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.create_live_event_v2(
  p_game_id uuid,
  p_player_id uuid,
  p_type text,
  p_half integer DEFAULT NULL,
  p_force_time_seconds integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_display_minute text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_event_id uuid;
  v_game_time_seconds integer;
  v_period integer;
  v_period_seconds integer;
  v_minute integer;
  v_event_status text := 'draft';
  v_count_in_stats boolean := false;
  v_final_display_minute text;
  v_is_review_mode boolean := false;
BEGIN
  -- Get match data
  SELECT *
  INTO v_match
  FROM matches
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Jogo não encontrado');
  END IF;

  -- Check if this is review mode (finished or applied match with forced time)
  -- NOTE: We now allow edits on 'applied' matches in review mode
  v_is_review_mode := (v_match.status IN ('finished', 'applied') AND p_force_time_seconds IS NOT NULL);

  -- Determine event status and game time based on match state
  IF v_match.status = 'draft' THEN
    v_event_status := 'draft';
    v_count_in_stats := false;
    v_game_time_seconds := COALESCE(p_force_time_seconds, 0);
    v_period := COALESCE(p_half, 1);
    v_period_seconds := 0;
    v_minute := 0;
    v_final_display_minute := '0''';
    
  ELSIF v_match.status = 'live' THEN
    v_event_status := 'official';
    v_count_in_stats := true;
    
    IF p_force_time_seconds IS NOT NULL THEN
      v_game_time_seconds := p_force_time_seconds;
      v_period := COALESCE(p_half, v_match.half);
      IF v_period = 1 THEN
        v_period_seconds := p_force_time_seconds;
      ELSE
        v_period_seconds := p_force_time_seconds - 2700;
        IF v_period_seconds < 0 THEN v_period_seconds := 0; END IF;
      END IF;
    ELSE
      v_period := COALESCE(p_half, v_match.half);
      
      IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
        v_period_seconds := v_match.elapsed_seconds_in_half 
          + EXTRACT(EPOCH FROM (NOW() - v_match.half_start_time))::integer;
      ELSE
        v_period_seconds := v_match.elapsed_seconds_in_half;
      END IF;
      
      IF v_period = 2 THEN
        v_game_time_seconds := 2700 + v_period_seconds;
      ELSE
        v_game_time_seconds := v_period_seconds;
      END IF;
    END IF;
    
    v_minute := v_game_time_seconds / 60;
    
    IF p_display_minute IS NOT NULL THEN
      v_final_display_minute := p_display_minute;
    ELSE
      v_final_display_minute := CASE 
        WHEN v_match.half = 1 THEN 
          CASE WHEN v_period_seconds <= 2700 THEN FLOOR(v_period_seconds / 60.0)::integer::text || ''''
          ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
          END
        ELSE 
          CASE WHEN v_period_seconds <= 2700 THEN (45 + FLOOR(v_period_seconds / 60.0)::integer)::text || ''''
          ELSE '90+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
          END
      END;
    END IF;
    
  ELSIF v_match.status IN ('finished', 'applied') THEN
    -- Both finished and applied matches can be edited in review mode
    IF NOT v_is_review_mode THEN
      RETURN jsonb_build_object('success', false, 'message', 'Use o modo revisão para editar esta partida.');
    END IF;
    
    v_event_status := 'official';
    v_count_in_stats := true;
    v_game_time_seconds := p_force_time_seconds;
    
    IF p_force_time_seconds <= 2700 THEN
      v_period := 1;
      v_period_seconds := p_force_time_seconds;
    ELSE
      v_period := 2;
      v_period_seconds := p_force_time_seconds - 2700;
    END IF;
    
    v_minute := p_force_time_seconds / 60;
    
    IF p_display_minute IS NOT NULL THEN
      v_final_display_minute := p_display_minute;
    ELSE
      v_final_display_minute := CASE 
        WHEN v_period = 1 THEN 
          CASE WHEN v_period_seconds <= 2700 THEN FLOOR(v_period_seconds / 60.0)::integer::text || ''''
          ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
          END
        ELSE 
          CASE WHEN v_period_seconds <= 2700 THEN (45 + FLOOR(v_period_seconds / 60.0)::integer)::text || ''''
          ELSE '90+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
          END
      END;
    END IF;
    
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Estado de jogo inválido: ' || v_match.status);
  END IF;

  INSERT INTO match_events (
    match_id, player_id, event_type, event_status, count_in_stats,
    game_time_seconds, minute, display_minute, half, period, value
  ) VALUES (
    p_game_id, p_player_id, p_type::match_event_type, v_event_status, v_count_in_stats,
    v_game_time_seconds, v_minute, v_final_display_minute, COALESCE(p_half, v_period), v_period, 1
  )
  RETURNING id INTO v_event_id;

  IF v_event_status = 'official' THEN
    PERFORM apply_event_stats(p_game_id, p_player_id, p_type, 1);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_status', v_event_status,
    'count_in_stats', v_count_in_stats,
    'game_time_seconds', v_game_time_seconds,
    'minute', v_minute,
    'display_minute', v_final_display_minute,
    'stats_updated', v_event_status = 'official',
    'review_mode', v_is_review_mode,
    'match_status', v_match.status
  );
END;
$$;

-- Now update void_live_event
DROP FUNCTION IF EXISTS public.void_live_event(uuid, text);

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
  v_match RECORD;
  v_stats_reverted boolean := false;
BEGIN
  SELECT * INTO v_event FROM match_events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Evento não encontrado');
  END IF;
  
  SELECT * INTO v_match FROM matches WHERE id = v_event.match_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Jogo não encontrado');
  END IF;
  
  -- NOTE: We no longer block edits on 'applied' matches
  -- This allows Post-Match Review Mode to correct statistics
  -- The UI controls access via isReviewMode flag
  
  IF v_event.count_in_stats AND v_event.event_status = 'official' THEN
    PERFORM apply_event_stats(v_event.match_id, v_event.player_id, v_event.event_type::text, -1);
    v_stats_reverted := true;
  END IF;
  
  UPDATE match_events
  SET event_status = 'voided', count_in_stats = false, void_reason = p_reason
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'event_id', p_event_id, 
    'stats_reverted', v_stats_reverted,
    'match_status', v_match.status
  );
END;
$$;