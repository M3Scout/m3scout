-- Add goalkeeper-specific stats to player_stats table
ALTER TABLE public.player_stats 
ADD COLUMN IF NOT EXISTS saves integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalties_saved integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS errors_leading_to_goal integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS aerial_duels_won integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS accurate_passes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_passes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS duels_won integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_duels integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS chances_created integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_passes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shots_on_target integer NOT NULL DEFAULT 0;

-- Update validation trigger
CREATE OR REPLACE FUNCTION public.validate_player_stats_non_negative()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.matches < 0 THEN RAISE EXCEPTION 'matches cannot be negative'; END IF;
  IF NEW.minutes < 0 THEN RAISE EXCEPTION 'minutes cannot be negative'; END IF;
  IF NEW.goals < 0 THEN RAISE EXCEPTION 'goals cannot be negative'; END IF;
  IF NEW.assists < 0 THEN RAISE EXCEPTION 'assists cannot be negative'; END IF;
  IF NEW.yellow_cards < 0 THEN RAISE EXCEPTION 'yellow_cards cannot be negative'; END IF;
  IF NEW.red_cards < 0 THEN RAISE EXCEPTION 'red_cards cannot be negative'; END IF;
  IF NEW.tackles < 0 THEN RAISE EXCEPTION 'tackles cannot be negative'; END IF;
  IF NEW.interceptions < 0 THEN RAISE EXCEPTION 'interceptions cannot be negative'; END IF;
  IF NEW.recoveries < 0 THEN RAISE EXCEPTION 'recoveries cannot be negative'; END IF;
  IF NEW.saves < 0 THEN RAISE EXCEPTION 'saves cannot be negative'; END IF;
  IF NEW.goals_conceded < 0 THEN RAISE EXCEPTION 'goals_conceded cannot be negative'; END IF;
  IF NEW.clean_sheets < 0 THEN RAISE EXCEPTION 'clean_sheets cannot be negative'; END IF;
  IF NEW.penalties_saved < 0 THEN RAISE EXCEPTION 'penalties_saved cannot be negative'; END IF;
  IF NEW.errors_leading_to_goal < 0 THEN RAISE EXCEPTION 'errors_leading_to_goal cannot be negative'; END IF;
  IF NEW.aerial_duels_won < 0 THEN RAISE EXCEPTION 'aerial_duels_won cannot be negative'; END IF;
  IF NEW.accurate_passes < 0 THEN RAISE EXCEPTION 'accurate_passes cannot be negative'; END IF;
  IF NEW.total_passes < 0 THEN RAISE EXCEPTION 'total_passes cannot be negative'; END IF;
  IF NEW.duels_won < 0 THEN RAISE EXCEPTION 'duels_won cannot be negative'; END IF;
  IF NEW.total_duels < 0 THEN RAISE EXCEPTION 'total_duels cannot be negative'; END IF;
  IF NEW.chances_created < 0 THEN RAISE EXCEPTION 'chances_created cannot be negative'; END IF;
  IF NEW.key_passes < 0 THEN RAISE EXCEPTION 'key_passes cannot be negative'; END IF;
  IF NEW.shots < 0 THEN RAISE EXCEPTION 'shots cannot be negative'; END IF;
  IF NEW.shots_on_target < 0 THEN RAISE EXCEPTION 'shots_on_target cannot be negative'; END IF;
  RETURN NEW;
END;
$function$;

-- Create new V2 rating calculation function with position-aware weights
CREATE OR REPLACE FUNCTION public.calculate_athlete_auto_rating(p_player_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_player RECORD;
  v_position_group TEXT := 'midfielder';
  v_season_year INT;
  v_comp_record RECORD;
  v_comp_count INT := 0;
  v_comp_index INT := 0;
  
  -- Competition arrays for weighted calculation
  v_competitions JSONB := '[]'::JSONB;
  v_comp_data JSONB;
  
  -- Weights and scores
  v_recency_weight NUMERIC;
  v_minutes_factor NUMERIC;
  v_combined_weight NUMERIC;
  v_competition_level_score NUMERIC;
  v_position_stats_score NUMERIC;
  v_final_comp_score NUMERIC;
  
  -- Stat calculation variables
  v_minutes_90 NUMERIC;
  v_stat_breakdown JSONB;
  v_available_stats JSONB;
  v_total_weight NUMERIC;
  v_weighted_score NUMERIC;
  
  -- Per-90 metrics
  v_goals_90 NUMERIC;
  v_assists_90 NUMERIC;
  v_ga_90 NUMERIC;
  v_tackles_90 NUMERIC;
  v_interceptions_90 NUMERIC;
  v_recoveries_90 NUMERIC;
  v_saves_90 NUMERIC;
  v_goals_conceded_90 NUMERIC;
  v_aerial_duels_90 NUMERIC;
  v_accurate_passes_90 NUMERIC;
  v_duels_won_pct NUMERIC;
  v_pass_accuracy NUMERIC;
  v_chances_created_90 NUMERIC;
  v_key_passes_90 NUMERIC;
  v_shots_90 NUMERIC;
  v_shots_on_target_90 NUMERIC;
  v_cards_90 NUMERIC;
  
  -- Final calculations
  v_sum_weighted_scores NUMERIC := 0;
  v_sum_weights NUMERIC := 0;
  v_final_score_100 NUMERIC;
  v_rating_05 NUMERIC;
  v_details JSONB;
  v_reliability TEXT;
  v_total_minutes INT := 0;
  v_total_matches INT := 0;
BEGIN
  -- Get player data
  SELECT id, position, age, current_club
  INTO v_player
  FROM public.players
  WHERE id = p_player_id;
  
  IF v_player IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Determine position group (V2 algorithm: 5 groups)
  v_position_group := CASE 
    WHEN v_player.position = 'Goleiro' THEN 'goalkeeper'
    WHEN v_player.position IN ('Zagueiro') THEN 'center_back'
    WHEN v_player.position IN ('Volante') THEN 'defensive_mid'
    WHEN v_player.position IN ('Meia', 'Meia Atacante', 'Meia Central', 'Meio-Campo') THEN 'midfielder'
    WHEN v_player.position IN ('Atacante', 'Centroavante', 'Ponta Direita', 'Ponta Esquerda', 'Segundo Atacante') THEN 'forward'
    WHEN v_player.position IN ('Lateral Direito', 'Lateral Esquerdo', 'Ala Direito', 'Ala Esquerdo') THEN 'center_back'
    ELSE 'midfielder'
  END;
  
  -- Find the most recent season with stats
  SELECT MAX(season_year) INTO v_season_year
  FROM public.player_stats
  WHERE player_id = p_player_id;
  
  IF v_season_year IS NULL THEN
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;
  
  -- Count competitions for recency weighting
  SELECT COUNT(*) INTO v_comp_count
  FROM public.player_stats
  WHERE player_id = p_player_id AND season_year = v_season_year;
  
  IF v_comp_count = 0 THEN
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;
  
  -- Process each competition (ordered by coefficient desc for recency)
  FOR v_comp_record IN 
    SELECT 
      ps.id,
      c.id AS competition_id,
      COALESCE(c.name, 'Sem competição') AS competition_name,
      COALESCE(c.final_coefficient, 1.0) AS final_coefficient,
      ps.matches,
      ps.minutes,
      ps.goals,
      ps.assists,
      ps.yellow_cards,
      ps.red_cards,
      ps.tackles,
      ps.interceptions,
      ps.recoveries,
      ps.saves,
      ps.goals_conceded,
      ps.clean_sheets,
      ps.penalties_saved,
      ps.errors_leading_to_goal,
      ps.aerial_duels_won,
      ps.accurate_passes,
      ps.total_passes,
      ps.duels_won,
      ps.total_duels,
      ps.chances_created,
      ps.key_passes,
      ps.shots,
      ps.shots_on_target
    FROM public.player_stats ps
    LEFT JOIN public.competitions c ON ps.competition_id = c.id
    WHERE ps.player_id = p_player_id AND ps.season_year = v_season_year
    ORDER BY COALESCE(c.final_coefficient, 1.0) DESC, ps.minutes DESC
  LOOP
    v_comp_index := v_comp_index + 1;
    v_total_minutes := v_total_minutes + v_comp_record.minutes;
    v_total_matches := v_total_matches + v_comp_record.matches;
    
    -- Calculate recency weight (V2: first=0.50, second=0.30, rest share 0.20)
    IF v_comp_index = 1 THEN
      v_recency_weight := 0.50;
    ELSIF v_comp_index = 2 THEN
      v_recency_weight := 0.30;
    ELSIF v_comp_count > 2 THEN
      v_recency_weight := 0.20 / (v_comp_count - 2);
    ELSE
      v_recency_weight := 0.20;
    END IF;
    
    -- Calculate minutes factor (V2 thresholds)
    v_minutes_factor := CASE
      WHEN v_comp_record.minutes >= 1800 THEN 1.0
      WHEN v_comp_record.minutes >= 900 THEN 0.8
      WHEN v_comp_record.minutes >= 450 THEN 0.6
      WHEN v_comp_record.minutes >= 1 THEN 0.35
      ELSE 0
    END;
    
    -- Combined weight
    v_combined_weight := v_recency_weight * v_minutes_factor;
    
    -- Competition level score (V2: coefficient range 0.75-1.30)
    v_competition_level_score := LEAST(100, GREATEST(0, 
      ((v_comp_record.final_coefficient - 0.75) / (1.30 - 0.75)) * 100
    ));
    
    -- Calculate per-90 metrics
    v_minutes_90 := GREATEST(v_comp_record.minutes / 90.0, 0.1);
    v_goals_90 := v_comp_record.goals / v_minutes_90;
    v_assists_90 := v_comp_record.assists / v_minutes_90;
    v_ga_90 := (v_comp_record.goals + v_comp_record.assists) / v_minutes_90;
    v_tackles_90 := v_comp_record.tackles / v_minutes_90;
    v_interceptions_90 := v_comp_record.interceptions / v_minutes_90;
    v_recoveries_90 := v_comp_record.recoveries / v_minutes_90;
    v_saves_90 := v_comp_record.saves / v_minutes_90;
    v_goals_conceded_90 := v_comp_record.goals_conceded / v_minutes_90;
    v_aerial_duels_90 := v_comp_record.aerial_duels_won / v_minutes_90;
    v_accurate_passes_90 := v_comp_record.accurate_passes / v_minutes_90;
    v_pass_accuracy := CASE WHEN v_comp_record.total_passes > 0 
      THEN (v_comp_record.accurate_passes::NUMERIC / v_comp_record.total_passes) * 100 
      ELSE NULL END;
    v_duels_won_pct := CASE WHEN v_comp_record.total_duels > 0 
      THEN (v_comp_record.duels_won::NUMERIC / v_comp_record.total_duels) * 100 
      ELSE NULL END;
    v_chances_created_90 := v_comp_record.chances_created / v_minutes_90;
    v_key_passes_90 := v_comp_record.key_passes / v_minutes_90;
    v_shots_90 := v_comp_record.shots / v_minutes_90;
    v_shots_on_target_90 := v_comp_record.shots_on_target / v_minutes_90;
    v_cards_90 := (v_comp_record.yellow_cards + 3 * v_comp_record.red_cards) / v_minutes_90;
    
    -- Calculate position stats score with missing data redistribution
    v_stat_breakdown := '[]'::JSONB;
    v_total_weight := 0;
    v_weighted_score := 0;
    
    IF v_position_group = 'goalkeeper' THEN
      -- Goalkeeper weights: saves 18, penalties_saved 8, accurate_passes 10, 
      -- goals_conceded (inv) 14, errors (inv) 16, aerial 8, discipline 6, minutes 20
      v_available_stats := jsonb_build_array(
        jsonb_build_object('name', 'saves_per_90', 'weight', 18, 'value', v_saves_90, 'max', 5.0, 'available', v_comp_record.saves > 0 OR v_comp_record.minutes > 0),
        jsonb_build_object('name', 'penalties_saved', 'weight', 8, 'value', v_comp_record.penalties_saved, 'max', 3.0, 'available', true),
        jsonb_build_object('name', 'accurate_passes_90', 'weight', 10, 'value', v_accurate_passes_90, 'max', 30.0, 'available', v_comp_record.accurate_passes > 0),
        jsonb_build_object('name', 'goals_conceded_inv', 'weight', 14, 'value', GREATEST(0, 100 - (v_goals_conceded_90 * 50)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'errors_inv', 'weight', 16, 'value', GREATEST(0, 100 - (v_comp_record.errors_leading_to_goal * 25)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'aerial_duels_90', 'weight', 8, 'value', v_aerial_duels_90, 'max', 3.0, 'available', v_comp_record.aerial_duels_won > 0),
        jsonb_build_object('name', 'discipline', 'weight', 6, 'value', GREATEST(0, 100 - (v_cards_90 * 100)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'minutes_games', 'weight', 20, 'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100), 'max', 100.0, 'available', true, 'is_score', true)
      );
    ELSIF v_position_group = 'center_back' THEN
      v_available_stats := jsonb_build_array(
        jsonb_build_object('name', 'tackles_90', 'weight', 16, 'value', v_tackles_90, 'max', 6.0, 'available', v_comp_record.tackles > 0),
        jsonb_build_object('name', 'interceptions_90', 'weight', 16, 'value', v_interceptions_90, 'max', 4.0, 'available', v_comp_record.interceptions > 0),
        jsonb_build_object('name', 'recoveries_90', 'weight', 12, 'value', v_recoveries_90, 'max', 10.0, 'available', v_comp_record.recoveries > 0),
        jsonb_build_object('name', 'duels_won_pct', 'weight', 14, 'value', COALESCE(v_duels_won_pct, 50), 'max', 100.0, 'available', v_comp_record.total_duels > 0, 'is_score', true),
        jsonb_build_object('name', 'accurate_passes_90', 'weight', 8, 'value', v_accurate_passes_90, 'max', 50.0, 'available', v_comp_record.accurate_passes > 0),
        jsonb_build_object('name', 'pass_accuracy', 'weight', 6, 'value', COALESCE(v_pass_accuracy, 70), 'max', 100.0, 'available', v_comp_record.total_passes > 0, 'is_score', true),
        jsonb_build_object('name', 'ga_per_90', 'weight', 6, 'value', v_ga_90, 'max', 0.5, 'available', true),
        jsonb_build_object('name', 'discipline', 'weight', 8, 'value', GREATEST(0, 100 - (v_cards_90 * 100)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'minutes_games', 'weight', 14, 'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100), 'max', 100.0, 'available', true, 'is_score', true)
      );
    ELSIF v_position_group = 'defensive_mid' THEN
      v_available_stats := jsonb_build_array(
        jsonb_build_object('name', 'tackles_90', 'weight', 18, 'value', v_tackles_90, 'max', 6.0, 'available', v_comp_record.tackles > 0),
        jsonb_build_object('name', 'recoveries_90', 'weight', 16, 'value', v_recoveries_90, 'max', 10.0, 'available', v_comp_record.recoveries > 0),
        jsonb_build_object('name', 'interceptions_90', 'weight', 14, 'value', v_interceptions_90, 'max', 4.0, 'available', v_comp_record.interceptions > 0),
        jsonb_build_object('name', 'accurate_passes_90', 'weight', 10, 'value', v_accurate_passes_90, 'max', 50.0, 'available', v_comp_record.accurate_passes > 0),
        jsonb_build_object('name', 'pass_accuracy', 'weight', 8, 'value', COALESCE(v_pass_accuracy, 70), 'max', 100.0, 'available', v_comp_record.total_passes > 0, 'is_score', true),
        jsonb_build_object('name', 'ga_per_90', 'weight', 8, 'value', v_ga_90, 'max', 0.5, 'available', true),
        jsonb_build_object('name', 'discipline', 'weight', 6, 'value', GREATEST(0, 100 - (v_cards_90 * 100)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'minutes_games', 'weight', 20, 'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100), 'max', 100.0, 'available', true, 'is_score', true)
      );
    ELSIF v_position_group = 'midfielder' THEN
      v_available_stats := jsonb_build_array(
        jsonb_build_object('name', 'ga_per_90', 'weight', 22, 'value', v_ga_90, 'max', 1.0, 'available', true),
        jsonb_build_object('name', 'chances_created_90', 'weight', 16, 'value', v_chances_created_90, 'max', 3.0, 'available', v_comp_record.chances_created > 0),
        jsonb_build_object('name', 'key_passes_90', 'weight', 14, 'value', v_key_passes_90, 'max', 3.0, 'available', v_comp_record.key_passes > 0),
        jsonb_build_object('name', 'accurate_passes_90', 'weight', 10, 'value', v_accurate_passes_90, 'max', 50.0, 'available', v_comp_record.accurate_passes > 0),
        jsonb_build_object('name', 'pass_accuracy', 'weight', 8, 'value', COALESCE(v_pass_accuracy, 70), 'max', 100.0, 'available', v_comp_record.total_passes > 0, 'is_score', true),
        jsonb_build_object('name', 'shots_90', 'weight', 8, 'value', v_shots_90, 'max', 4.0, 'available', v_comp_record.shots > 0),
        jsonb_build_object('name', 'discipline', 'weight', 4, 'value', GREATEST(0, 100 - (v_cards_90 * 100)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'minutes_games', 'weight', 10, 'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100), 'max', 100.0, 'available', true, 'is_score', true)
      );
    ELSE -- forward
      v_available_stats := jsonb_build_array(
        jsonb_build_object('name', 'goals_per_90', 'weight', 28, 'value', v_goals_90, 'max', 1.2, 'available', true),
        jsonb_build_object('name', 'ga_per_90', 'weight', 20, 'value', v_ga_90, 'max', 1.5, 'available', true),
        jsonb_build_object('name', 'shots_90', 'weight', 12, 'value', v_shots_90, 'max', 5.0, 'available', v_comp_record.shots > 0),
        jsonb_build_object('name', 'shots_on_target_90', 'weight', 16, 'value', v_shots_on_target_90, 'max', 3.0, 'available', v_comp_record.shots_on_target > 0),
        jsonb_build_object('name', 'chances_created_90', 'weight', 10, 'value', v_chances_created_90, 'max', 2.0, 'available', v_comp_record.chances_created > 0),
        jsonb_build_object('name', 'discipline', 'weight', 4, 'value', GREATEST(0, 100 - (v_cards_90 * 100)), 'max', 100.0, 'available', true, 'is_score', true),
        jsonb_build_object('name', 'minutes_games', 'weight', 10, 'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100), 'max', 100.0, 'available', true, 'is_score', true)
      );
    END IF;
    
    -- Calculate weighted score with redistribution for missing stats
    SELECT 
      SUM((s->>'weight')::NUMERIC) 
    INTO v_total_weight
    FROM jsonb_array_elements(v_available_stats) s
    WHERE (s->>'available')::BOOLEAN = true;
    
    IF v_total_weight > 0 THEN
      SELECT 
        SUM(
          CASE 
            WHEN (s->>'is_score')::BOOLEAN = true THEN
              ((s->>'weight')::NUMERIC / v_total_weight) * 100 * (s->>'value')::NUMERIC / (s->>'max')::NUMERIC
            ELSE
              ((s->>'weight')::NUMERIC / v_total_weight) * 100 * LEAST(1.0, (s->>'value')::NUMERIC / (s->>'max')::NUMERIC)
          END
        )
      INTO v_position_stats_score
      FROM jsonb_array_elements(v_available_stats) s
      WHERE (s->>'available')::BOOLEAN = true;
    ELSE
      v_position_stats_score := 50; -- Default if no stats available
    END IF;
    
    v_position_stats_score := LEAST(100, GREATEST(0, v_position_stats_score));
    
    -- Build stat breakdown for details
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', s->>'name',
        'weight', (s->>'weight')::NUMERIC,
        'adjusted_weight', CASE WHEN (s->>'available')::BOOLEAN THEN 
          ROUND(((s->>'weight')::NUMERIC / v_total_weight) * 100, 1) ELSE 0 END,
        'value', ROUND((s->>'value')::NUMERIC, 2),
        'max', (s->>'max')::NUMERIC,
        'available', (s->>'available')::BOOLEAN,
        'score', CASE 
          WHEN NOT (s->>'available')::BOOLEAN THEN 0
          WHEN (s->>'is_score')::BOOLEAN = true THEN ROUND((s->>'value')::NUMERIC, 1)
          ELSE ROUND(LEAST(100, (s->>'value')::NUMERIC / (s->>'max')::NUMERIC * 100), 1)
        END
      )
    )
    INTO v_stat_breakdown
    FROM jsonb_array_elements(v_available_stats) s;
    
    -- Final competition score (V2: 70% position stats, 30% competition level)
    v_final_comp_score := (v_position_stats_score * 0.70) + (v_competition_level_score * 0.30);
    
    -- Accumulate weighted scores
    IF v_combined_weight > 0 THEN
      v_sum_weighted_scores := v_sum_weighted_scores + (v_final_comp_score * v_combined_weight);
      v_sum_weights := v_sum_weights + v_combined_weight;
    END IF;
    
    -- Build competition data for details
    v_comp_data := jsonb_build_object(
      'competition_id', v_comp_record.competition_id,
      'competition_name', v_comp_record.competition_name,
      'final_coefficient', v_comp_record.final_coefficient,
      'matches', v_comp_record.matches,
      'minutes', v_comp_record.minutes,
      'goals', v_comp_record.goals,
      'assists', v_comp_record.assists,
      'yellow_cards', v_comp_record.yellow_cards,
      'red_cards', v_comp_record.red_cards,
      'tackles', v_comp_record.tackles,
      'interceptions', v_comp_record.interceptions,
      'recoveries', v_comp_record.recoveries,
      'saves', v_comp_record.saves,
      'goals_conceded', v_comp_record.goals_conceded,
      'recency_weight', ROUND(v_recency_weight, 3),
      'minutes_factor', v_minutes_factor,
      'combined_weight', ROUND(v_combined_weight, 3),
      'competition_level_score', ROUND(v_competition_level_score, 1),
      'position_stats_score', ROUND(v_position_stats_score, 1),
      'final_score', ROUND(v_final_comp_score, 1),
      'stat_breakdown', v_stat_breakdown
    );
    
    v_competitions := v_competitions || v_comp_data;
  END LOOP;
  
  -- Calculate final score
  IF v_sum_weights > 0 THEN
    v_final_score_100 := v_sum_weighted_scores / v_sum_weights;
  ELSE
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;
  
  -- Convert to 0-5 scale (V2: divide by 20, round to 0.5)
  v_rating_05 := ROUND((v_final_score_100 / 20.0) * 2) / 2;
  v_rating_05 := LEAST(5.0, GREATEST(0.0, v_rating_05));
  
  -- Determine reliability
  v_reliability := CASE 
    WHEN v_total_minutes < 450 OR v_total_matches < 5 THEN 'low'
    WHEN v_total_minutes <= 1200 OR v_total_matches <= 12 THEN 'medium'
    ELSE 'high'
  END;
  
  -- Build final details JSON (V2 format)
  v_details := jsonb_build_object(
    'version', 'v2',
    'calculated_at', NOW(),
    'season_year', v_season_year,
    'position', v_player.position,
    'position_group', v_position_group,
    'age', v_player.age,
    'total_minutes', v_total_minutes,
    'total_matches', v_total_matches,
    'reliability', v_reliability,
    'scores', jsonb_build_object(
      'final_index_100', ROUND(v_final_score_100, 1),
      'rating_0_5', v_rating_05
    ),
    'competitions', v_competitions
  );
  
  -- Store details in player record
  UPDATE public.players SET auto_rating_details = v_details WHERE id = p_player_id;
  
  RETURN v_rating_05::NUMERIC(3,1);
END;
$function$;