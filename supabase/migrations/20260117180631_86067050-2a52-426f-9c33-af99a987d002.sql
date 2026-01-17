-- Create the single, unified create_live_event_v2 function
CREATE OR REPLACE FUNCTION public.create_live_event_v2(
  p_game_id uuid,
  p_player_id uuid,
  p_type text,
  p_half integer DEFAULT NULL,
  p_force_time_seconds integer DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_clock_seconds integer;
  v_period_seconds integer;
  v_event_id uuid;
  v_event_status text;
  v_count_in_stats boolean;
  v_display_minute text;
  v_event_type match_event_type;
BEGIN
  -- Validate event type
  BEGIN
    v_event_type := p_type::match_event_type;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_type',
      'message', format('Tipo de evento inválido: %s', p_type)
    );
  END;

  -- Get match data
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'match_not_found',
      'message', 'Jogo não encontrado'
    );
  END IF;

  -- Block events for finished matches
  IF v_match.status = 'finished' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'match_finished',
      'message', 'Não é possível criar eventos em um jogo finalizado'
    );
  END IF;

  -- Calculate clock seconds based on game state
  IF v_match.status = 'draft' THEN
    -- Pre-game: no time tracking
    v_event_status := 'draft';
    v_count_in_stats := false;
    v_clock_seconds := NULL;
    v_display_minute := NULL;
  ELSIF v_match.status = 'live' THEN
    -- Live game: use current clock or forced time
    v_event_status := 'official';
    v_count_in_stats := true;
    
    -- Get period clock seconds
    v_period_seconds := get_period_clock_seconds(p_game_id);
    
    IF p_force_time_seconds IS NOT NULL THEN
      v_clock_seconds := p_force_time_seconds;
    ELSE
      v_clock_seconds := v_period_seconds;
    END IF;
    
    -- Calculate display minute with added time notation
    v_display_minute := CASE 
      WHEN COALESCE(p_half, v_match.half) = 1 THEN 
        CASE 
          WHEN v_clock_seconds <= 2700 THEN FLOOR(v_clock_seconds / 60.0)::integer::text || ''''
          ELSE '45+' || CEIL((v_clock_seconds - 2700) / 60.0)::integer::text || ''''
        END
      ELSE 
        CASE 
          WHEN v_clock_seconds <= 2700 THEN (45 + FLOOR(v_clock_seconds / 60.0)::integer)::text || ''''
          ELSE '90+' || CEIL((v_clock_seconds - 2700) / 60.0)::integer::text || ''''
        END
    END;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_status',
      'message', format('Estado de jogo inválido: %s', v_match.status)
    );
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
      v_display_minute,
      v_event_status,
      v_count_in_stats,
      1
    )
    RETURNING id INTO v_event_id;
  EXCEPTION WHEN OTHERS THEN
    -- Handle duplicate detection
    IF SQLERRM LIKE '%Duplicate event%' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'duplicate_event',
        'message', 'Evento duplicado detectado. Aguarde um momento.'
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'insert_failed',
        'message', SQLERRM
      );
    END IF;
  END;

  -- If match is live, apply stats automatically
  IF v_match.status = 'live' AND v_count_in_stats THEN
    PERFORM apply_event_stats(p_game_id, p_player_id, p_type, 1);
  END IF;

  -- Return success with event details
  RETURN json_build_object(
    'success', true,
    'event_id', v_event_id,
    'event_status', v_event_status,
    'stats_applied', v_count_in_stats,
    'display_minute', v_display_minute
  );
END;
$$;

-- Also update apply_event_stats to ensure correct behavior
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
  -- Ensure player stats row exists
  INSERT INTO match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  -- Update stats based on event type with GREATEST to prevent negative
  CASE p_event_type
    -- Goal: +1 goal, +1 shot, +1 shot on target
    WHEN 'goal' THEN
      UPDATE match_player_stats
      SET 
        goals = GREATEST(0, goals + p_delta),
        shots = GREATEST(0, shots + p_delta),
        shots_on_target = GREATEST(0, shots_on_target + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Assist: +1 assist ONLY (no pass stats)
    WHEN 'assist' THEN
      UPDATE match_player_stats
      SET assists = GREATEST(0, assists + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Shot: +1 shot
    WHEN 'shot' THEN
      UPDATE match_player_stats
      SET shots = GREATEST(0, shots + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Shot on target: +1 shot, +1 shot on target
    WHEN 'shot_on_target' THEN
      UPDATE match_player_stats
      SET 
        shots = GREATEST(0, shots + p_delta),
        shots_on_target = GREATEST(0, shots_on_target + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Key pass
    WHEN 'key_pass' THEN
      UPDATE match_player_stats
      SET key_passes = GREATEST(0, key_passes + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Chance created
    WHEN 'chance_created' THEN
      UPDATE match_player_stats
      SET chances_created = GREATEST(0, chances_created + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Dribble success: +1 dribble success, +1 dribble total
    WHEN 'dribble_success' THEN
      UPDATE match_player_stats
      SET 
        dribbles_success = GREATEST(0, dribbles_success + p_delta),
        dribbles_total = GREATEST(0, dribbles_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Dribble attempt: +1 dribble total only
    WHEN 'dribble_attempt' THEN
      UPDATE match_player_stats
      SET dribbles_total = GREATEST(0, dribbles_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Tackle
    WHEN 'tackle' THEN
      UPDATE match_player_stats
      SET tackles = GREATEST(0, tackles + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Interception
    WHEN 'interception' THEN
      UPDATE match_player_stats
      SET interceptions = GREATEST(0, interceptions + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Recovery
    WHEN 'recovery' THEN
      UPDATE match_player_stats
      SET recoveries = GREATEST(0, recoveries + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Clearance
    WHEN 'clearance' THEN
      UPDATE match_player_stats
      SET clearances = GREATEST(0, clearances + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Duel won: +1 duel won, +1 duel total
    WHEN 'duel_won' THEN
      UPDATE match_player_stats
      SET 
        duels_won = GREATEST(0, duels_won + p_delta),
        duels_total = GREATEST(0, duels_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Duel total
    WHEN 'duel_total' THEN
      UPDATE match_player_stats
      SET duels_total = GREATEST(0, duels_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Aerial duel won
    WHEN 'aerial_duel_won' THEN
      UPDATE match_player_stats
      SET aerial_duels_won = GREATEST(0, aerial_duels_won + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Yellow card
    WHEN 'yellow' THEN
      UPDATE match_player_stats
      SET yellow_cards = GREATEST(0, yellow_cards + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Red card
    WHEN 'red' THEN
      UPDATE match_player_stats
      SET red_cards = GREATEST(0, red_cards + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Foul committed
    WHEN 'foul_committed' THEN
      UPDATE match_player_stats
      SET fouls_committed = GREATEST(0, fouls_committed + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Foul suffered
    WHEN 'foul_suffered' THEN
      UPDATE match_player_stats
      SET fouls_suffered = GREATEST(0, fouls_suffered + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Pass success: +1 pass completed, +1 pass total
    WHEN 'pass_success' THEN
      UPDATE match_player_stats
      SET 
        passes_completed = GREATEST(0, passes_completed + p_delta),
        passes_total = GREATEST(0, passes_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Pass total
    WHEN 'pass_total' THEN
      UPDATE match_player_stats
      SET passes_total = GREATEST(0, passes_total + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- Possession lost
    WHEN 'possession_lost' THEN
      UPDATE match_player_stats
      SET possession_lost = GREATEST(0, possession_lost + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Save
    WHEN 'save' THEN
      UPDATE match_player_stats
      SET saves = GREATEST(0, saves + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Goal conceded
    WHEN 'goal_conceded' THEN
      UPDATE match_player_stats
      SET goals_conceded = GREATEST(0, goals_conceded + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Box save
    WHEN 'box_save' THEN
      UPDATE match_player_stats
      SET saves = GREATEST(0, saves + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    -- GK: Penalty saved
    WHEN 'penalty_saved' THEN
      UPDATE match_player_stats
      SET saves = GREATEST(0, saves + p_delta)
      WHERE match_id = p_match_id AND player_id = p_player_id;

    ELSE
      -- Unknown event type - no stats update
      NULL;
  END CASE;
END;
$$;