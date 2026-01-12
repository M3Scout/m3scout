CREATE OR REPLACE FUNCTION public.calculate_athlete_auto_rating(p_player_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_player RECORD;
  v_position_group TEXT := 'midfielder';
  v_comp_record RECORD;
  
  -- Year-based weighting
  v_year1 INT;
  v_year2 INT;
  v_year1_weight NUMERIC;
  v_year2_weight NUMERIC;
  v_year1_total_minutes NUMERIC := 0;
  v_year2_total_minutes NUMERIC := 0;
  
  -- Competition arrays for weighted calculation
  v_competitions JSONB := '[]'::JSONB;
  v_comp_data JSONB;
  
  -- Weights and scores
  v_year_weight NUMERIC;
  v_in_year_weight NUMERIC;
  v_final_weight NUMERIC;
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
  
  -- V2: Find the 2 most recent years with stats
  SELECT 
    (array_agg(DISTINCT season_year ORDER BY season_year DESC))[1],
    (array_agg(DISTINCT season_year ORDER BY season_year DESC))[2]
  INTO v_year1, v_year2
  FROM public.player_stats
  WHERE player_id = p_player_id;
  
  IF v_year1 IS NULL THEN
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;
  
  -- V2: Calculate year weights (60/40 or 100%)
  IF v_year2 IS NOT NULL THEN
    v_year1_weight := 0.60;
    v_year2_weight := 0.40;
  ELSE
    v_year1_weight := 1.0;
    v_year2_weight := 0.0;
  END IF;
  
  -- V2: Calculate total minutes per year
  SELECT COALESCE(SUM(minutes), 0) INTO v_year1_total_minutes
  FROM public.player_stats
  WHERE player_id = p_player_id AND season_year = v_year1;
  
  IF v_year2 IS NOT NULL THEN
    SELECT COALESCE(SUM(minutes), 0) INTO v_year2_total_minutes
    FROM public.player_stats
    WHERE player_id = p_player_id AND season_year = v_year2;
  END IF;
  
  -- Process each competition from the 2 most recent years
  FOR v_comp_record IN 
    SELECT 
      ps.id,
      c.id AS competition_id,
      COALESCE(c.name, 'Sem competição') AS competition_name,
      COALESCE(c.final_coefficient, 1.0) AS final_coefficient,
      ps.season_year,
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
    WHERE ps.player_id = p_player_id 
      AND (ps.season_year = v_year1 OR (v_year2 IS NOT NULL AND ps.season_year = v_year2))
    ORDER BY ps.season_year DESC, ps.minutes DESC
  LOOP
    v_total_minutes := v_total_minutes + v_comp_record.minutes;
    v_total_matches := v_total_matches + v_comp_record.matches;
    
    -- V2: Calculate year weight and in-year weight
    IF v_comp_record.season_year = v_year1 THEN
      v_year_weight := v_year1_weight;
      v_in_year_weight := CASE 
        WHEN v_year1_total_minutes > 0 THEN v_comp_record.minutes / v_year1_total_minutes
        ELSE 1.0
      END;
    ELSE
      v_year_weight := v_year2_weight;
      v_in_year_weight := CASE 
        WHEN v_year2_total_minutes > 0 THEN v_comp_record.minutes / v_year2_total_minutes
        ELSE 1.0
      END;
    END IF;
    
    -- V2: Final weight = year_weight * in-year_weight
    v_final_weight := v_year_weight * v_in_year_weight;
    
    -- Competition level score - NEW RANGE: 0.50-2.00 aligned with tier thresholds
    -- coefficient 0.50 → 0, coefficient 2.00 → 100
    v_competition_level_score := LEAST(100, GREATEST(0, 
      ((v_comp_record.final_coefficient - 0.50) / (2.00 - 0.50)) * 100
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
      v_available_stats := jsonb_build_array(
        jsonb_build_object(
          'name', 'saves_per_90',
          'stat_key', 'gk_saves',
          'stat_label', 'Defesas',
          'category', 'gk',
          'direction', 'higher_is_better',
          'weight', 18,
          'value', v_saves_90,
          'value_raw', v_comp_record.saves,
          'value_per90', v_saves_90,
          'max', 5.0,
          'available', v_comp_record.saves > 0 OR v_comp_record.minutes > 0
        ),
        jsonb_build_object(
          'name', 'penalties_saved',
          'stat_key', 'gk_penalties_saved',
          'stat_label', 'Pênaltis Salvos',
          'category', 'gk',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', v_comp_record.penalties_saved,
          'value_raw', v_comp_record.penalties_saved,
          'value_per90', CASE WHEN v_comp_record.minutes > 0 THEN v_comp_record.penalties_saved / v_minutes_90 ELSE NULL END,
          'max', 3.0,
          'available', true
        ),
        jsonb_build_object(
          'name', 'accurate_passes_90',
          'stat_key', 'accurate_passes',
          'stat_label', 'Passes Certos',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 10,
          'value', v_accurate_passes_90,
          'value_raw', v_comp_record.accurate_passes,
          'value_per90', v_accurate_passes_90,
          'max', 30.0,
          'available', v_comp_record.accurate_passes > 0
        ),
        jsonb_build_object(
          'name', 'goals_conceded_inv',
          'stat_key', 'gk_goals_conceded',
          'stat_label', 'Gols Sofridos',
          'category', 'gk',
          'direction', 'lower_is_better',
          'weight', 14,
          'value', GREATEST(0, 100 - (v_goals_conceded_90 * 50)),
          'value_raw', v_comp_record.goals_conceded,
          'value_per90', v_goals_conceded_90,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'errors_inv',
          'stat_key', 'gk_errors_led_to_goal',
          'stat_label', 'Erros que Resultam em Gol',
          'category', 'gk',
          'direction', 'lower_is_better',
          'weight', 16,
          'value', GREATEST(0, 100 - (v_comp_record.errors_leading_to_goal * 25)),
          'value_raw', v_comp_record.errors_leading_to_goal,
          'value_per90', CASE WHEN v_comp_record.minutes > 0 THEN v_comp_record.errors_leading_to_goal / v_minutes_90 ELSE NULL END,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'aerial_duels_90',
          'stat_key', 'aerial_duels_won',
          'stat_label', 'Duelos Aéreos Vencidos',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', v_aerial_duels_90,
          'value_raw', v_comp_record.aerial_duels_won,
          'value_per90', v_aerial_duels_90,
          'max', 3.0,
          'available', v_comp_record.aerial_duels_won > 0
        ),
        jsonb_build_object(
          'name', 'discipline',
          'stat_key', 'cards',
          'stat_label', 'Cartões (por 90)',
          'category', 'discipline',
          'direction', 'lower_is_better',
          'weight', 6,
          'value', GREATEST(0, 100 - (v_cards_90 * 100)),
          'value_raw', (v_comp_record.yellow_cards + 3 * v_comp_record.red_cards),
          'value_per90', v_cards_90,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'minutes_games',
          'stat_key', 'minutes',
          'stat_label', 'Minutos',
          'category', 'general',
          'direction', 'higher_is_better',
          'weight', 20,
          'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100),
          'value_raw', v_comp_record.minutes,
          'value_per90', NULL,
          'max', 100.0,
          'available', true,
          'is_score', true
        )
      );
    ELSIF v_position_group = 'center_back' THEN
      v_available_stats := jsonb_build_array(
        jsonb_build_object(
          'name', 'tackles_90',
          'stat_key', 'tackles',
          'stat_label', 'Desarmes',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 16,
          'value', v_tackles_90,
          'value_raw', v_comp_record.tackles,
          'value_per90', v_tackles_90,
          'max', 6.0,
          'available', v_comp_record.tackles > 0
        ),
        jsonb_build_object(
          'name', 'interceptions_90',
          'stat_key', 'interceptions',
          'stat_label', 'Interceptações',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 16,
          'value', v_interceptions_90,
          'value_raw', v_comp_record.interceptions,
          'value_per90', v_interceptions_90,
          'max', 4.0,
          'available', v_comp_record.interceptions > 0
        ),
        jsonb_build_object(
          'name', 'recoveries_90',
          'stat_key', 'recoveries',
          'stat_label', 'Recuperações',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 12,
          'value', v_recoveries_90,
          'value_raw', v_comp_record.recoveries,
          'value_per90', v_recoveries_90,
          'max', 10.0,
          'available', v_comp_record.recoveries > 0
        ),
        jsonb_build_object(
          'name', 'duels_won_pct',
          'stat_key', 'duels_won_pct',
          'stat_label', 'Duelos Ganhos (%)',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 14,
          'value', COALESCE(v_duels_won_pct, 50),
          'value_raw', COALESCE(v_duels_won_pct, 0),
          'value_per90', NULL,
          'max', 100.0,
          'available', v_comp_record.total_duels > 0,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'accurate_passes_90',
          'stat_key', 'accurate_passes',
          'stat_label', 'Passes Certos',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', v_accurate_passes_90,
          'value_raw', v_comp_record.accurate_passes,
          'value_per90', v_accurate_passes_90,
          'max', 50.0,
          'available', v_comp_record.accurate_passes > 0
        ),
        jsonb_build_object(
          'name', 'pass_accuracy',
          'stat_key', 'pass_accuracy',
          'stat_label', 'Passes Certos (%)',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 6,
          'value', COALESCE(v_pass_accuracy, 70),
          'value_raw', COALESCE(v_pass_accuracy, 0),
          'value_per90', NULL,
          'max', 100.0,
          'available', v_comp_record.total_passes > 0,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'ga_per_90',
          'stat_key', 'goal_contributions',
          'stat_label', 'Participações em Gol',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 6,
          'value', v_ga_90,
          'value_raw', (v_comp_record.goals + v_comp_record.assists),
          'value_per90', v_ga_90,
          'max', 0.5,
          'available', true
        ),
        jsonb_build_object(
          'name', 'discipline',
          'stat_key', 'cards',
          'stat_label', 'Cartões (por 90)',
          'category', 'discipline',
          'direction', 'lower_is_better',
          'weight', 8,
          'value', GREATEST(0, 100 - (v_cards_90 * 100)),
          'value_raw', (v_comp_record.yellow_cards + 3 * v_comp_record.red_cards),
          'value_per90', v_cards_90,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'minutes_games',
          'stat_key', 'minutes',
          'stat_label', 'Minutos',
          'category', 'general',
          'direction', 'higher_is_better',
          'weight', 14,
          'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100),
          'value_raw', v_comp_record.minutes,
          'value_per90', NULL,
          'max', 100.0,
          'available', true,
          'is_score', true
        )
      );
    ELSIF v_position_group = 'defensive_mid' THEN
      v_available_stats := jsonb_build_array(
        jsonb_build_object(
          'name', 'tackles_90',
          'stat_key', 'tackles',
          'stat_label', 'Desarmes',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 18,
          'value', v_tackles_90,
          'value_raw', v_comp_record.tackles,
          'value_per90', v_tackles_90,
          'max', 6.0,
          'available', v_comp_record.tackles > 0
        ),
        jsonb_build_object(
          'name', 'recoveries_90',
          'stat_key', 'recoveries',
          'stat_label', 'Recuperações',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 16,
          'value', v_recoveries_90,
          'value_raw', v_comp_record.recoveries,
          'value_per90', v_recoveries_90,
          'max', 10.0,
          'available', v_comp_record.recoveries > 0
        ),
        jsonb_build_object(
          'name', 'interceptions_90',
          'stat_key', 'interceptions',
          'stat_label', 'Interceptações',
          'category', 'defensive',
          'direction', 'higher_is_better',
          'weight', 14,
          'value', v_interceptions_90,
          'value_raw', v_comp_record.interceptions,
          'value_per90', v_interceptions_90,
          'max', 4.0,
          'available', v_comp_record.interceptions > 0
        ),
        jsonb_build_object(
          'name', 'accurate_passes_90',
          'stat_key', 'accurate_passes',
          'stat_label', 'Passes Certos',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 10,
          'value', v_accurate_passes_90,
          'value_raw', v_comp_record.accurate_passes,
          'value_per90', v_accurate_passes_90,
          'max', 50.0,
          'available', v_comp_record.accurate_passes > 0
        ),
        jsonb_build_object(
          'name', 'pass_accuracy',
          'stat_key', 'pass_accuracy',
          'stat_label', 'Passes Certos (%)',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', COALESCE(v_pass_accuracy, 70),
          'value_raw', COALESCE(v_pass_accuracy, 0),
          'value_per90', NULL,
          'max', 100.0,
          'available', v_comp_record.total_passes > 0,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'ga_per_90',
          'stat_key', 'goal_contributions',
          'stat_label', 'Participações em Gol',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', v_ga_90,
          'value_raw', (v_comp_record.goals + v_comp_record.assists),
          'value_per90', v_ga_90,
          'max', 0.5,
          'available', true
        ),
        jsonb_build_object(
          'name', 'discipline',
          'stat_key', 'cards',
          'stat_label', 'Cartões (por 90)',
          'category', 'discipline',
          'direction', 'lower_is_better',
          'weight', 6,
          'value', GREATEST(0, 100 - (v_cards_90 * 100)),
          'value_raw', (v_comp_record.yellow_cards + 3 * v_comp_record.red_cards),
          'value_per90', v_cards_90,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'minutes_games',
          'stat_key', 'minutes',
          'stat_label', 'Minutos',
          'category', 'general',
          'direction', 'higher_is_better',
          'weight', 20,
          'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100),
          'value_raw', v_comp_record.minutes,
          'value_per90', NULL,
          'max', 100.0,
          'available', true,
          'is_score', true
        )
      );
    ELSIF v_position_group = 'midfielder' THEN
      v_available_stats := jsonb_build_array(
        jsonb_build_object(
          'name', 'ga_per_90',
          'stat_key', 'goal_contributions',
          'stat_label', 'Participações em Gol',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 22,
          'value', v_ga_90,
          'value_raw', (v_comp_record.goals + v_comp_record.assists),
          'value_per90', v_ga_90,
          'max', 1.0,
          'available', true
        ),
        jsonb_build_object(
          'name', 'chances_created_90',
          'stat_key', 'chances_created',
          'stat_label', 'Chances Criadas',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 16,
          'value', v_chances_created_90,
          'value_raw', v_comp_record.chances_created,
          'value_per90', v_chances_created_90,
          'max', 3.0,
          'available', v_comp_record.chances_created > 0
        ),
        jsonb_build_object(
          'name', 'key_passes_90',
          'stat_key', 'key_passes',
          'stat_label', 'Passes Decisivos',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 14,
          'value', v_key_passes_90,
          'value_raw', v_comp_record.key_passes,
          'value_per90', v_key_passes_90,
          'max', 3.0,
          'available', v_comp_record.key_passes > 0
        ),
        jsonb_build_object(
          'name', 'accurate_passes_90',
          'stat_key', 'accurate_passes',
          'stat_label', 'Passes Certos',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 10,
          'value', v_accurate_passes_90,
          'value_raw', v_comp_record.accurate_passes,
          'value_per90', v_accurate_passes_90,
          'max', 50.0,
          'available', v_comp_record.accurate_passes > 0
        ),
        jsonb_build_object(
          'name', 'pass_accuracy',
          'stat_key', 'pass_accuracy',
          'stat_label', 'Passes Certos (%)',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', COALESCE(v_pass_accuracy, 70),
          'value_raw', COALESCE(v_pass_accuracy, 0),
          'value_per90', NULL,
          'max', 100.0,
          'available', v_comp_record.total_passes > 0,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'shots_90',
          'stat_key', 'shots',
          'stat_label', 'Finalizações',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 8,
          'value', v_shots_90,
          'value_raw', v_comp_record.shots,
          'value_per90', v_shots_90,
          'max', 4.0,
          'available', v_comp_record.shots > 0
        ),
        jsonb_build_object(
          'name', 'discipline',
          'stat_key', 'cards',
          'stat_label', 'Cartões (por 90)',
          'category', 'discipline',
          'direction', 'lower_is_better',
          'weight', 4,
          'value', GREATEST(0, 100 - (v_cards_90 * 100)),
          'value_raw', (v_comp_record.yellow_cards + 3 * v_comp_record.red_cards),
          'value_per90', v_cards_90,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'minutes_games',
          'stat_key', 'minutes',
          'stat_label', 'Minutos',
          'category', 'general',
          'direction', 'higher_is_better',
          'weight', 10,
          'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100),
          'value_raw', v_comp_record.minutes,
          'value_per90', NULL,
          'max', 100.0,
          'available', true,
          'is_score', true
        )
      );
    ELSE -- forward
      v_available_stats := jsonb_build_array(
        jsonb_build_object(
          'name', 'goals_per_90',
          'stat_key', 'goals',
          'stat_label', 'Gols',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 28,
          'value', v_goals_90,
          'value_raw', v_comp_record.goals,
          'value_per90', v_goals_90,
          'max', 1.2,
          'available', true
        ),
        jsonb_build_object(
          'name', 'ga_per_90',
          'stat_key', 'goal_contributions',
          'stat_label', 'Participações em Gol',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 20,
          'value', v_ga_90,
          'value_raw', (v_comp_record.goals + v_comp_record.assists),
          'value_per90', v_ga_90,
          'max', 1.5,
          'available', true
        ),
        jsonb_build_object(
          'name', 'shots_90',
          'stat_key', 'shots',
          'stat_label', 'Finalizações',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 12,
          'value', v_shots_90,
          'value_raw', v_comp_record.shots,
          'value_per90', v_shots_90,
          'max', 5.0,
          'available', v_comp_record.shots > 0
        ),
        jsonb_build_object(
          'name', 'shots_on_target_90',
          'stat_key', 'shots_on_target',
          'stat_label', 'Finalizações no Gol',
          'category', 'attacking',
          'direction', 'higher_is_better',
          'weight', 16,
          'value', v_shots_on_target_90,
          'value_raw', v_comp_record.shots_on_target,
          'value_per90', v_shots_on_target_90,
          'max', 3.0,
          'available', v_comp_record.shots_on_target > 0
        ),
        jsonb_build_object(
          'name', 'chances_created_90',
          'stat_key', 'chances_created',
          'stat_label', 'Chances Criadas',
          'category', 'passing',
          'direction', 'higher_is_better',
          'weight', 10,
          'value', v_chances_created_90,
          'value_raw', v_comp_record.chances_created,
          'value_per90', v_chances_created_90,
          'max', 2.0,
          'available', v_comp_record.chances_created > 0
        ),
        jsonb_build_object(
          'name', 'discipline',
          'stat_key', 'cards',
          'stat_label', 'Cartões (por 90)',
          'category', 'discipline',
          'direction', 'lower_is_better',
          'weight', 4,
          'value', GREATEST(0, 100 - (v_cards_90 * 100)),
          'value_raw', (v_comp_record.yellow_cards + 3 * v_comp_record.red_cards),
          'value_per90', v_cards_90,
          'max', 100.0,
          'available', true,
          'is_score', true
        ),
        jsonb_build_object(
          'name', 'minutes_games',
          'stat_key', 'minutes',
          'stat_label', 'Minutos',
          'category', 'general',
          'direction', 'higher_is_better',
          'weight', 10,
          'value', LEAST(100, (v_comp_record.minutes / 1800.0) * 100),
          'value_raw', v_comp_record.minutes,
          'value_per90', NULL,
          'max', 100.0,
          'available', true,
          'is_score', true
        )
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
    
    -- Build stat breakdown for details (now includes canonical keys + metadata)
    SELECT jsonb_agg(
      jsonb_build_object(
        -- Required new fields
        'stat_key', s->>'stat_key',
        'stat_label', s->>'stat_label',
        'category', s->>'category',
        'direction', s->>'direction',
        'value_raw', ROUND(COALESCE((s->>'value_raw')::NUMERIC, 0), 2),
        'value_per90', CASE 
          WHEN (s ? 'value_per90') AND (s->>'value_per90') IS NOT NULL THEN ROUND((s->>'value_per90')::NUMERIC, 2)
          ELSE NULL
        END,
        'subscore_100', CASE 
          WHEN NOT (s->>'available')::BOOLEAN THEN 0
          WHEN (s->>'is_score')::BOOLEAN = true THEN ROUND((s->>'value')::NUMERIC, 1)
          ELSE ROUND(LEAST(100, (s->>'value')::NUMERIC / (s->>'max')::NUMERIC * 100), 1)
        END,
        'weight_pct', CASE WHEN (s->>'available')::BOOLEAN THEN 
          ROUND(((s->>'weight')::NUMERIC / v_total_weight) * 100, 1) ELSE 0 END,

        -- Legacy fields (for backwards compatibility)
        'name', s->>'name',
        'label', s->>'stat_label',
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
    
    -- Accumulate weighted scores using V2 year-based weights
    IF v_final_weight > 0 THEN
      v_sum_weighted_scores := v_sum_weighted_scores + (v_final_comp_score * v_final_weight);
      v_sum_weights := v_sum_weights + v_final_weight;
    END IF;
    
    -- Build competition data for details with V2 fields
    v_comp_data := jsonb_build_object(
      'competition_id', v_comp_record.competition_id,
      'competition_name', v_comp_record.competition_name,
      'season_year', v_comp_record.season_year,
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
      -- V2 year-based weighting fields
      'year_weight', ROUND(v_year_weight, 3),
      'in_year_weight', ROUND(v_in_year_weight, 3),
      'final_weight', ROUND(v_final_weight, 3),
      -- Legacy compatibility
      'recency_weight', ROUND(v_year_weight, 3),
      'minutes_factor', ROUND(v_in_year_weight, 3),
      'combined_weight', ROUND(v_final_weight, 3),
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
  
  -- Build final details JSON (V2 format with year-based weighting)
  v_details := jsonb_build_object(
    'version', 'v2',
    'calculated_at', NOW(),
    'year1', v_year1,
    'year2', v_year2,
    'year1_weight', v_year1_weight,
    'year2_weight', v_year2_weight,
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