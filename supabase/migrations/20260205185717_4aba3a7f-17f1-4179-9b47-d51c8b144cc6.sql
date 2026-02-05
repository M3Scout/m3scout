-- Add client_event_id column for idempotent event writes
-- This prevents duplicate events when network is unstable and client retries

-- 1. Add the column (nullable initially for existing rows)
ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS client_event_id UUID DEFAULT NULL;

-- 2. Create a unique constraint to prevent duplicates per match
-- Using a partial unique index (only non-null values) to allow legacy rows without client_event_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_events_idempotent 
ON public.match_events (match_id, client_event_id) 
WHERE client_event_id IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.match_events.client_event_id IS 'Client-generated UUID for idempotent writes. Prevents duplicate events on network retry.';

-- 4. Update the create_live_event_v2 RPC to accept and use client_event_id
-- First, drop the existing function to recreate with new signature
DROP FUNCTION IF EXISTS public.create_live_event_v2(UUID, UUID, TEXT, SMALLINT, INTEGER, TEXT, TEXT);

-- Recreate with client_event_id parameter
CREATE OR REPLACE FUNCTION public.create_live_event_v2(
  p_game_id UUID,
  p_player_id UUID,
  p_type TEXT,
  p_half SMALLINT DEFAULT NULL,
  p_force_time_seconds INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_display_minute TEXT DEFAULT NULL,
  p_client_event_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_event_id UUID;
  v_event_status TEXT;
  v_minute INTEGER;
  v_game_time_seconds INTEGER;
  v_period SMALLINT;
  v_display_min TEXT;
  v_existing_event_id UUID;
BEGIN
  -- Get match info
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Match not found');
  END IF;

  -- IDEMPOTENCY CHECK: If client_event_id provided, check if already exists
  IF p_client_event_id IS NOT NULL THEN
    SELECT id INTO v_existing_event_id 
    FROM match_events 
    WHERE match_id = p_game_id AND client_event_id = p_client_event_id;
    
    IF FOUND THEN
      -- Event already exists - return success with existing event ID (idempotent)
      RETURN jsonb_build_object(
        'success', true, 
        'event_id', v_existing_event_id,
        'event_status', 'existing',
        'message', 'Event already recorded (idempotent)',
        'stats_applied', true
      );
    END IF;
  END IF;

  -- Determine event status based on match status
  IF v_match.status = 'draft' THEN
    v_event_status := 'draft';
  ELSE
    v_event_status := 'official';
  END IF;

  -- Determine timing
  IF p_force_time_seconds IS NOT NULL THEN
    v_game_time_seconds := p_force_time_seconds;
    v_minute := FLOOR(p_force_time_seconds / 60);
    v_period := COALESCE(p_half, v_match.half);
  ELSIF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    -- Calculate current game time
    v_game_time_seconds := v_match.elapsed_seconds_in_half + 
      EXTRACT(EPOCH FROM (NOW() - v_match.half_start_time))::INTEGER;
    v_minute := FLOOR(v_game_time_seconds / 60);
    v_period := v_match.half;
  ELSE
    v_game_time_seconds := v_match.elapsed_seconds_in_half;
    v_minute := FLOOR(v_game_time_seconds / 60);
    v_period := v_match.half;
  END IF;

  -- Display minute
  v_display_min := COALESCE(p_display_minute, v_minute::TEXT || '''');

  -- Insert the event
  INSERT INTO match_events (
    match_id,
    player_id,
    event_type,
    minute,
    half,
    period,
    game_time_seconds,
    display_minute,
    event_status,
    count_in_stats,
    client_event_id
  ) VALUES (
    p_game_id,
    p_player_id,
    p_type::match_event_type,
    v_minute,
    v_period,
    v_period,
    v_game_time_seconds,
    v_display_min,
    v_event_status,
    (v_event_status = 'official'),
    p_client_event_id
  )
  RETURNING id INTO v_event_id;

  -- Update match_player_stats if event is official
  IF v_event_status = 'official' THEN
    PERFORM update_player_stat_for_event(p_game_id, p_player_id, p_type::match_event_type, 1);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_status', v_event_status,
    'minute', v_minute,
    'period', v_period,
    'game_time_seconds', v_game_time_seconds,
    'stats_applied', (v_event_status = 'official')
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;