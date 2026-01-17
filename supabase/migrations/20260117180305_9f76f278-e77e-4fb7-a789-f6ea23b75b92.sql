-- First drop the existing void_live_event function that returns jsonb
DROP FUNCTION IF EXISTS public.void_live_event(uuid, text);

-- Now recreate void_live_event to return json and revert stats properly
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
    PERFORM apply_event_stats(v_event.match_id, v_event.player_id, v_event.event_type::text, -1);
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