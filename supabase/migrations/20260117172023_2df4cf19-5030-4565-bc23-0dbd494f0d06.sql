-- =====================================================
-- LIVE MATCH V5: Automatic Stats Update for Goal/Assist Events
-- =====================================================
-- Objetivo: Atualizar estatísticas automaticamente quando Gol ou Assistência são registrados

-- =====================================================
-- 1. Create match_player_stats table for per-match stats
-- This tracks stats for each player within a specific match
-- =====================================================
CREATE TABLE IF NOT EXISTS public.match_player_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  shots integer NOT NULL DEFAULT 0,
  shots_on_target integer NOT NULL DEFAULT 0,
  key_passes integer NOT NULL DEFAULT 0,
  chances_created integer NOT NULL DEFAULT 0,
  passes_completed integer NOT NULL DEFAULT 0,
  passes_total integer NOT NULL DEFAULT 0,
  dribbles_success integer NOT NULL DEFAULT 0,
  dribbles_total integer NOT NULL DEFAULT 0,
  tackles integer NOT NULL DEFAULT 0,
  interceptions integer NOT NULL DEFAULT 0,
  recoveries integer NOT NULL DEFAULT 0,
  clearances integer NOT NULL DEFAULT 0,
  duels_won integer NOT NULL DEFAULT 0,
  duels_total integer NOT NULL DEFAULT 0,
  aerial_duels_won integer NOT NULL DEFAULT 0,
  yellow_cards integer NOT NULL DEFAULT 0,
  red_cards integer NOT NULL DEFAULT 0,
  fouls_committed integer NOT NULL DEFAULT 0,
  fouls_suffered integer NOT NULL DEFAULT 0,
  possession_lost integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  goals_conceded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view match player stats"
  ON public.match_player_stats FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can manage match player stats"
  ON public.match_player_stats FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

-- Index for fast lookups
CREATE INDEX idx_match_player_stats_match_player 
  ON public.match_player_stats(match_id, player_id);

-- =====================================================
-- 2. Helper function to update stats based on event type
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_event_stats(
  p_match_id uuid,
  p_player_id uuid,
  p_event_type text,
  p_delta integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure record exists
  INSERT INTO match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  -- Apply stats based on event type
  CASE p_event_type
    WHEN 'goal' THEN
      UPDATE match_player_stats SET
        goals = GREATEST(0, goals + p_delta),
        shots = GREATEST(0, shots + p_delta),
        shots_on_target = GREATEST(0, shots_on_target + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'assist' THEN
      UPDATE match_player_stats SET
        assists = GREATEST(0, assists + p_delta),
        passes_completed = GREATEST(0, passes_completed + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'shot' THEN
      UPDATE match_player_stats SET
        shots = GREATEST(0, shots + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'shot_on_target' THEN
      UPDATE match_player_stats SET
        shots = GREATEST(0, shots + p_delta),
        shots_on_target = GREATEST(0, shots_on_target + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'key_pass' THEN
      UPDATE match_player_stats SET
        key_passes = GREATEST(0, key_passes + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'chance_created' THEN
      UPDATE match_player_stats SET
        chances_created = GREATEST(0, chances_created + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'dribble_success' THEN
      UPDATE match_player_stats SET
        dribbles_success = GREATEST(0, dribbles_success + p_delta),
        dribbles_total = GREATEST(0, dribbles_total + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'dribble_attempt' THEN
      UPDATE match_player_stats SET
        dribbles_total = GREATEST(0, dribbles_total + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'tackle' THEN
      UPDATE match_player_stats SET
        tackles = GREATEST(0, tackles + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'interception' THEN
      UPDATE match_player_stats SET
        interceptions = GREATEST(0, interceptions + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'recovery' THEN
      UPDATE match_player_stats SET
        recoveries = GREATEST(0, recoveries + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'clearance' THEN
      UPDATE match_player_stats SET
        clearances = GREATEST(0, clearances + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'duel_won' THEN
      UPDATE match_player_stats SET
        duels_won = GREATEST(0, duels_won + p_delta),
        duels_total = GREATEST(0, duels_total + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'duel_total' THEN
      UPDATE match_player_stats SET
        duels_total = GREATEST(0, duels_total + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'aerial_duel_won' THEN
      UPDATE match_player_stats SET
        aerial_duels_won = GREATEST(0, aerial_duels_won + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'yellow' THEN
      UPDATE match_player_stats SET
        yellow_cards = GREATEST(0, yellow_cards + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'red' THEN
      UPDATE match_player_stats SET
        red_cards = GREATEST(0, red_cards + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'foul_committed' THEN
      UPDATE match_player_stats SET
        fouls_committed = GREATEST(0, fouls_committed + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'foul_suffered' THEN
      UPDATE match_player_stats SET
        fouls_suffered = GREATEST(0, fouls_suffered + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'pass_success' THEN
      UPDATE match_player_stats SET
        passes_completed = GREATEST(0, passes_completed + p_delta),
        passes_total = GREATEST(0, passes_total + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'pass_total' THEN
      UPDATE match_player_stats SET
        passes_total = GREATEST(0, passes_total + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'possession_lost' THEN
      UPDATE match_player_stats SET
        possession_lost = GREATEST(0, possession_lost + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'save' THEN
      UPDATE match_player_stats SET
        saves = GREATEST(0, saves + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    WHEN 'goal_conceded' THEN
      UPDATE match_player_stats SET
        goals_conceded = GREATEST(0, goals_conceded + p_delta),
        updated_at = now()
      WHERE match_id = p_match_id AND player_id = p_player_id;
      
    ELSE
      -- For other event types (player_on, player_off, substitution, etc.), no stats update
      NULL;
  END CASE;
END;
$$;

-- =====================================================
-- 3. Update create_live_event to also update stats
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
  v_period_seconds integer;
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
    
    -- Calculate game time using period clock
    v_period_seconds := get_period_clock_seconds(p_game_id);
    
    IF p_force_time_seconds IS NOT NULL THEN
      v_game_time_seconds := p_force_time_seconds;
    ELSE
      v_game_time_seconds := v_period_seconds;
    END IF;
    
    v_minute := v_game_time_seconds / 60;
    
    -- Calculate proper display minute with added time notation
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

  -- If event is official (game is live), apply stats immediately
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
    'stats_updated', v_event_status = 'official'
  );
END;
$$;

-- =====================================================
-- 4. Update void_live_event to revert stats
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
  v_stats_reverted boolean := false;
BEGIN
  -- Get and lock the event
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

  -- If the event was official (counted in stats), revert the stats
  IF v_event.event_status = 'official' AND v_event.count_in_stats = true THEN
    PERFORM apply_event_stats(v_event.match_id, v_event.player_id, v_event.event_type::text, -1);
    v_stats_reverted := true;
  END IF;

  -- Mark event as voided
  UPDATE match_events SET
    event_status = 'voided',
    count_in_stats = false,
    void_reason = p_reason
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'voided', true,
    'reason', p_reason,
    'stats_reverted', v_stats_reverted
  );
END;
$$;

-- =====================================================
-- 5. Update start_first_half to apply pending event stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.start_first_half(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_events_updated integer;
  v_starters_on_field integer := 0;
  v_pending_event RECORD;
  v_stats_applied integer := 0;
BEGIN
  -- Get match and lock
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'draft' THEN
    RAISE EXCEPTION 'Jogo deve estar em pré-jogo para iniciar. Status atual: %', v_match.status;
  END IF;

  -- Update match to live state
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

  -- Move starters to field (if any)
  WITH updated_starters AS (
    UPDATE match_players SET
      is_on_field = true,
      entered_minute = 0,
      updated_at = now()
    WHERE match_id = p_game_id 
      AND started = true 
      AND is_removed = false
    RETURNING id, player_id
  ),
  inserted_presence AS (
    INSERT INTO player_field_presence (match_id, match_player_id, player_id, period, role, entered_at_seconds)
    SELECT p_game_id, us.id, us.player_id, 1, 'starter', 0
    FROM updated_starters us
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_starters_on_field FROM updated_starters;

  -- Officialize pending events AND apply their stats
  FOR v_pending_event IN 
    SELECT * FROM match_events 
    WHERE match_id = p_game_id AND event_status = 'draft'
  LOOP
    -- Update event to official
    UPDATE match_events SET
      event_status = 'official',
      count_in_stats = true,
      game_time_seconds = COALESCE(game_time_seconds, 0)
    WHERE id = v_pending_event.id;
    
    -- Apply stats for this event
    PERFORM apply_event_stats(p_game_id, v_pending_event.player_id, v_pending_event.event_type::text, 1);
    v_stats_applied := v_stats_applied + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_events_updated 
  FROM match_events 
  WHERE match_id = p_game_id AND event_status = 'official';

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'live',
    'half', 1,
    'starters_on_field', v_starters_on_field,
    'events_officialized', v_stats_applied,
    'stats_applied', v_stats_applied
  );
END;
$$;

-- =====================================================
-- 6. Create RPC to get match player stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_match_player_stats(p_match_id uuid)
RETURNS SETOF match_player_stats
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM match_player_stats WHERE match_id = p_match_id;
$$;