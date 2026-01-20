-- ============================================================
-- FIX: edit_live_event_time must also update match_players
-- when editing player_on/player_off events
-- 
-- Problem: Editing an event only updated match_events, but the
-- "Tempo em Campo" display uses match_players.entered_minute
-- which was NOT updated, causing UI to show old value.
-- ============================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.edit_live_event_time(uuid, integer);

-- Recreate with match_players sync for player_on/player_off
CREATE FUNCTION public.edit_live_event_time(
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
  v_period integer;
  v_period_seconds integer;
  v_display_minute text;
  v_absolute_minute integer;
BEGIN
  -- Get the event
  SELECT * INTO v_event FROM match_events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Evento não encontrado');
  END IF;
  
  -- Get the match
  SELECT * INTO v_match FROM matches WHERE id = v_event.match_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Jogo não encontrado');
  END IF;
  
  -- Block edits on applied matches
  IF v_match.status = 'applied' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Estatísticas já aplicadas. Não é possível editar.');
  END IF;
  
  -- Calculate period and display minute
  IF p_game_time_seconds <= 2700 THEN
    v_period := 1;
    v_period_seconds := p_game_time_seconds;
  ELSE
    v_period := 2;
    v_period_seconds := p_game_time_seconds - 2700;
  END IF;
  
  -- Calculate absolute minute (European format: 0-90+)
  v_absolute_minute := FLOOR(p_game_time_seconds / 60.0)::integer;
  
  -- Calculate display_minute with stoppage time notation
  v_display_minute := CASE 
    WHEN v_period = 1 THEN 
      CASE WHEN v_period_seconds <= 2700 THEN v_absolute_minute::text || ''''
      ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
      END
    ELSE 
      CASE WHEN v_period_seconds <= 2700 THEN v_absolute_minute::text || ''''
      ELSE '90+' || CEIL((p_game_time_seconds - 5400) / 60.0)::integer::text || ''''
      END
  END;
  
  -- Update match_events
  UPDATE match_events
  SET 
    game_time_seconds = p_game_time_seconds, 
    minute = v_absolute_minute,
    display_minute = v_display_minute, 
    period = v_period, 
    half = v_period
  WHERE id = p_event_id;
  
  -- CRITICAL: Sync match_players for player_on/player_off events
  -- This ensures "Tempo em Campo" display stays in sync
  IF v_event.event_type = 'player_on' THEN
    UPDATE match_players
    SET 
      entered_minute = v_absolute_minute,
      -- Recalculate minutes_played
      minutes_played = COALESCE(exited_minute, 90) - v_absolute_minute
    WHERE match_id = v_event.match_id 
      AND player_id = v_event.player_id;
  ELSIF v_event.event_type = 'player_off' THEN
    UPDATE match_players
    SET 
      exited_minute = LEAST(v_absolute_minute, 90),
      -- Recalculate minutes_played
      minutes_played = CASE 
        WHEN started = true THEN LEAST(v_absolute_minute, 90)
        WHEN entered_minute IS NOT NULL THEN LEAST(v_absolute_minute, 90) - entered_minute
        ELSE 0
      END
    WHERE match_id = v_event.match_id 
      AND player_id = v_event.player_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'event_id', p_event_id, 
    'game_time_seconds', p_game_time_seconds, 
    'display_minute', v_display_minute,
    'synced_match_players', v_event.event_type IN ('player_on', 'player_off')
  );
END;
$$;