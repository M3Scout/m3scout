-- =====================================================
-- LIVE MATCH V3: Agency Mode - Clock + Player Presence
-- =====================================================
-- Objetivo: cronômetro independente de atletas, 
-- entrada/saída registra minuto exato por período

-- =====================================================
-- 1. TABELA: player_field_presence
-- Registra intervalos de presença em campo por período
-- =====================================================
CREATE TABLE IF NOT EXISTS public.player_field_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  match_player_id uuid NOT NULL REFERENCES public.match_players(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  period smallint NOT NULL DEFAULT 1 CHECK (period IN (1, 2)),
  role text NOT NULL DEFAULT 'substitute' CHECK (role IN ('starter', 'substitute')),
  entered_at_seconds integer NOT NULL DEFAULT 0,
  exited_at_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_player_id, period, entered_at_seconds)
);

-- Enable RLS
ALTER TABLE public.player_field_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view field presence"
  ON public.player_field_presence FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can manage field presence"
  ON public.player_field_presence FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

-- Index for fast lookups
CREATE INDEX idx_player_field_presence_match_player 
  ON public.player_field_presence(match_id, match_player_id);

-- =====================================================
-- 2. HELPER: get_period_clock_seconds
-- Retorna segundos decorridos no período ATUAL (não total do jogo)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_period_clock_seconds(p_match_id uuid)
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
    elapsed_seconds_in_half
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

  RETURN COALESCE(v_elapsed, 0);
END;
$$;

-- =====================================================
-- 3. RPC: player_enter_field (Agency Mode)
-- Atleta entra em campo no minuto atual do período
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

  RETURN jsonb_build_object(
    'success', true,
    'presence_id', v_presence_id,
    'match_player_id', p_match_player_id,
    'period', v_match.half,
    'entered_at_seconds', v_period_seconds,
    'display_minute', CASE 
      WHEN v_match.half = 1 THEN 
        CASE WHEN v_period_seconds <= 2700 THEN FLOOR(v_period_seconds / 60.0)::integer::text || ''''
        ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
        END
      ELSE 
        CASE WHEN v_period_seconds <= 2700 THEN (45 + FLOOR(v_period_seconds / 60.0)::integer)::text || ''''
        ELSE '90+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
        END
    END
  );
END;
$$;

-- =====================================================
-- 4. RPC: player_exit_field (Agency Mode)
-- Atleta sai de campo no minuto atual do período
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

  RETURN jsonb_build_object(
    'success', true,
    'match_player_id', p_match_player_id,
    'period', v_match.half,
    'exited_at_seconds', v_period_seconds,
    'minutes_this_interval', v_minutes_this_interval,
    'display_minute', CASE 
      WHEN v_match.half = 1 THEN 
        CASE WHEN v_period_seconds <= 2700 THEN FLOOR(v_period_seconds / 60.0)::integer::text || ''''
        ELSE '45+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
        END
      ELSE 
        CASE WHEN v_period_seconds <= 2700 THEN (45 + FLOOR(v_period_seconds / 60.0)::integer)::text || ''''
        ELSE '90+' || CEIL((v_period_seconds - 2700) / 60.0)::integer::text || ''''
        END
    END
  );
END;
$$;

-- =====================================================
-- 5. RPC: start_first_half (Agency Mode)
-- Inicia o jogo - NÃO requer atletas em campo
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

  -- Officialize pending events
  WITH updated_events AS (
    UPDATE match_events SET
      event_status = 'official',
      count_in_stats = true,
      game_time_seconds = COALESCE(game_time_seconds, 0)
    WHERE match_id = p_game_id AND event_status = 'draft'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_events_updated FROM updated_events;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'live',
    'half', 1,
    'starters_on_field', v_starters_on_field,
    'events_officialized', COALESCE(v_events_updated, 0)
  );
END;
$$;

-- =====================================================
-- 6. RPC: end_first_half_v2
-- Encerra 1º tempo, fecha intervalos de presença abertos
-- =====================================================
CREATE OR REPLACE FUNCTION public.end_first_half_v2(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_final_seconds integer;
  v_players_closed integer;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo';
  END IF;

  IF v_match.half != 1 THEN
    RAISE EXCEPTION 'Já está no 2º tempo ou encerrado';
  END IF;

  -- Calculate final elapsed time in first half
  IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_final_seconds := v_match.elapsed_seconds_in_half + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  ELSE
    v_final_seconds := v_match.elapsed_seconds_in_half;
  END IF;

  -- Close all open presence intervals for period 1
  WITH closed AS (
    UPDATE player_field_presence SET
      exited_at_seconds = v_final_seconds,
      updated_at = now()
    WHERE match_id = p_game_id 
      AND period = 1 
      AND exited_at_seconds IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_players_closed FROM closed;

  -- Update all on-field players to off-field
  UPDATE match_players SET
    is_on_field = false,
    exited_minute = FLOOR(v_final_seconds / 60.0)::integer,
    updated_at = now()
  WHERE match_id = p_game_id AND is_on_field = true;

  -- Update match to halftime state
  UPDATE matches SET
    clock_status = 'stopped',
    elapsed_seconds_in_half = v_final_seconds,
    half_start_time = NULL,
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'halftime',
    'first_half_seconds', v_final_seconds,
    'players_closed', v_players_closed
  );
END;
$$;

-- =====================================================
-- 7. RPC: start_second_half_v2
-- Inicia 2º tempo, NÃO coloca jogadores em campo automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.start_second_half_v2(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
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
    'message', 'Marque manualmente os atletas que entram em campo no 2º tempo'
  );
END;
$$;

-- =====================================================
-- 8. RPC: end_game_v2
-- Encerra jogo definitivamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.end_game_v2(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_final_seconds integer;
  v_players_closed integer;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo para encerrar';
  END IF;

  -- Calculate final elapsed time
  IF v_match.clock_status = 'running' AND v_match.half_start_time IS NOT NULL THEN
    v_final_seconds := v_match.elapsed_seconds_in_half + 
      EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
  ELSE
    v_final_seconds := v_match.elapsed_seconds_in_half;
  END IF;

  -- Close all open presence intervals for current period
  WITH closed AS (
    UPDATE player_field_presence SET
      exited_at_seconds = v_final_seconds,
      updated_at = now()
    WHERE match_id = p_game_id 
      AND period = v_match.half 
      AND exited_at_seconds IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_players_closed FROM closed;

  -- Update all on-field players
  UPDATE match_players SET
    is_on_field = false,
    exited_minute = CASE v_match.half 
      WHEN 1 THEN FLOOR(v_final_seconds / 60.0)::integer
      ELSE 45 + FLOOR(v_final_seconds / 60.0)::integer
    END,
    updated_at = now()
  WHERE match_id = p_game_id AND is_on_field = true;

  -- Update match to finished
  UPDATE matches SET
    status = 'finished',
    clock_status = 'stopped',
    elapsed_seconds_in_half = v_final_seconds,
    half_start_time = NULL,
    updated_at = now()
  WHERE id = p_game_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'status', 'finished',
    'final_half', v_match.half,
    'final_seconds', v_final_seconds,
    'players_closed', v_players_closed
  );
END;
$$;

-- =====================================================
-- 9. RPC: toggle_clock (unified play/pause)
-- =====================================================
CREATE OR REPLACE FUNCTION public.toggle_clock(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_new_elapsed integer;
  v_new_status text;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.status != 'live' THEN
    RAISE EXCEPTION 'Jogo deve estar ao vivo';
  END IF;

  IF v_match.clock_status = 'running' THEN
    -- Pause
    IF v_match.half_start_time IS NOT NULL THEN
      v_new_elapsed := v_match.elapsed_seconds_in_half + 
        EXTRACT(EPOCH FROM (now() - v_match.half_start_time))::integer;
    ELSE
      v_new_elapsed := v_match.elapsed_seconds_in_half;
    END IF;

    UPDATE matches SET
      clock_status = 'paused',
      elapsed_seconds_in_half = v_new_elapsed,
      half_start_time = NULL,
      updated_at = now()
    WHERE id = p_game_id;

    v_new_status := 'paused';
  ELSE
    -- Resume
    v_new_elapsed := v_match.elapsed_seconds_in_half;

    UPDATE matches SET
      clock_status = 'running',
      half_start_time = now(),
      updated_at = now()
    WHERE id = p_game_id;

    v_new_status := 'running';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'clock_status', v_new_status,
    'elapsed_seconds', COALESCE(v_new_elapsed, v_match.elapsed_seconds_in_half)
  );
END;
$$;

-- =====================================================
-- 10. RPC: set_added_time
-- Define acréscimos para o tempo atual
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_added_time(
  p_game_id uuid,
  p_added_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_match.half = 1 THEN
    UPDATE matches SET
      added_time_first_half = p_added_seconds,
      updated_at = now()
    WHERE id = p_game_id;
  ELSE
    UPDATE matches SET
      added_time_second_half = p_added_seconds,
      updated_at = now()
    WHERE id = p_game_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_game_id,
    'half', v_match.half,
    'added_seconds', p_added_seconds
  );
END;
$$;