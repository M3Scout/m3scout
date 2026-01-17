-- Add unique constraint to prevent duplicate events in the same second for same player and type
-- First, create a function to check for duplicates
CREATE OR REPLACE FUNCTION public.check_duplicate_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if an event with the same type, player, and game_time_seconds exists within the last 2 seconds
  IF EXISTS (
    SELECT 1 FROM public.match_events
    WHERE match_id = NEW.match_id
      AND player_id = NEW.player_id
      AND event_type = NEW.event_type
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND ABS(COALESCE(game_time_seconds, 0) - COALESCE(NEW.game_time_seconds, 0)) <= 2
      AND event_status != 'voided'
      AND created_at > NOW() - INTERVAL '5 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate event detected: same player, type, and time within 2 seconds';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate events
DROP TRIGGER IF EXISTS prevent_duplicate_events ON public.match_events;
CREATE TRIGGER prevent_duplicate_events
  BEFORE INSERT ON public.match_events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_event();

-- Update the create_live_event RPC to handle duplicate errors gracefully
CREATE OR REPLACE FUNCTION public.create_live_event(
  p_game_id uuid,
  p_player_id uuid,
  p_type text,
  p_half integer DEFAULT NULL,
  p_display_minute text DEFAULT NULL,
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
  v_clock_seconds integer;
  v_event_id uuid;
  v_event_status text;
  v_count_in_stats boolean;
  v_result json;
  v_event_type match_event_type;
BEGIN
  -- Validate event type
  BEGIN
    v_event_type := p_type::match_event_type;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid event type: %', p_type;
  END;

  -- Get match data
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_game_id;
  END IF;

  -- Calculate clock seconds
  IF p_force_time_seconds IS NOT NULL THEN
    v_clock_seconds := p_force_time_seconds;
  ELSE
    v_clock_seconds := get_live_game_clock_seconds(p_game_id);
  END IF;

  -- Determine event status based on match status
  IF v_match.status = 'live' THEN
    v_event_status := 'official';
    v_count_in_stats := true;
  ELSE
    v_event_status := 'draft';
    v_count_in_stats := false;
  END IF;

  -- Try to insert the event (trigger will prevent duplicates)
  BEGIN
    INSERT INTO match_events (
      match_id,
      player_id,
      event_type,
      half,
      period,
      game_time_seconds,
      display_minute,
      event_status,
      count_in_stats,
      value
    ) VALUES (
      p_game_id,
      p_player_id,
      v_event_type,
      COALESCE(p_half, v_match.half, 1),
      COALESCE(v_match.half, 1),
      v_clock_seconds,
      COALESCE(p_display_minute, v_clock_seconds / 60 || ''''),
      v_event_status,
      v_count_in_stats,
      1
    )
    RETURNING id INTO v_event_id;
  EXCEPTION WHEN OTHERS THEN
    -- If duplicate detected, return error info
    IF SQLERRM LIKE '%Duplicate event%' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'duplicate_event',
        'message', 'Evento duplicado detectado. Aguarde um momento.'
      );
    ELSE
      RAISE;
    END IF;
  END;

  -- If match is live, apply stats
  IF v_match.status = 'live' AND v_count_in_stats THEN
    PERFORM apply_event_stats(p_game_id, p_player_id, p_type, 1);
  END IF;

  -- Get the created event
  SELECT json_build_object(
    'success', true,
    'event', row_to_json(e),
    'stats_applied', v_count_in_stats
  ) INTO v_result
  FROM match_events e
  WHERE e.id = v_event_id;

  RETURN v_result;
END;
$$;