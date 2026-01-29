-- Update calculate_athlete_auto_rating to use unified stats (manual + live)
-- This migration replaces the function to use unified_player_season_stats view

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
  
  -- V2: Find the 2 most recent years with stats from UNIFIED view (manual + live)
  SELECT 
    (array_agg(DISTINCT season_year ORDER BY season_year DESC))[1],
    (array_agg(DISTINCT season_year ORDER BY season_year DESC))[2]
  INTO v_year1, v_year2
  FROM public.unified_player_season_stats
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
  
  -- V2: Calculate total minutes per year from UNIFIED stats
  SELECT COALESCE(SUM(minutes), 0) INTO v_year1_total_minutes
  FROM public.unified_player_season_stats
  WHERE player_id = p_player_id AND season_year = v_year1;
  
  IF v_year2 IS NOT NULL THEN
    SELECT COALESCE(SUM(minutes), 0) INTO v_year2_total_minutes
    FROM public.unified_player_season_stats
    WHERE player_id = p_player_id AND season_year = v_year2;
  END IF;
  
  -- Process each competition from the 2 most recent years using UNIFIED stats
  FOR v_comp_record IN 
    SELECT 
      COALESCE(us.competition_id::text, 'no_comp') AS id,
      us.competition_id,
      us.competition_name,
      us.final_coefficient,
      us.season_year,
      us.matches::int,
      us.minutes::int,
      us.goals::int,
      us.assists::int,
      us.yellow_cards::int,
      us.red_cards::int,
      us.tackles::int,
      us.interceptions::int,
      us.recoveries::int,
      us.saves::int,
      us.goals_conceded::int,
      us.clean_sheets::int,
      us.penalties_saved::int,
      us.errors_leading_to_goal::int,
      us.aerial_duels_won::int,
      us.accurate_passes::int,
      us.total_passes::int,
      us.duels_won::int,
      us.total_duels::int,
      us.chances_created::int,
      us.key_passes::int,
      us.shots::int,
      us.shots_on_target::int,
      us.fouls_committed::int,
      us.fouls_drawn::int,
      us.successful_dribbles::int,
      us.total_dribbles::int,
      us.ground_duels_won::int,
      us.ground_duels_total::int,
      us.data_source
    FROM public.unified_player_season_stats us
    WHERE us.player_id = p_player_id
      AND us.season_year IN (v_year1, v_year2)
      AND us.minutes > 0
    ORDER BY us.season_year DESC, us.minutes DESC
  LOOP
    -- Calculate year weight
    IF v_comp_record.season_year = v_year1 THEN
      v_year_weight := v_year1_weight;
    ELSE
      v_year_weight := v_year2_weight;
    END IF;
    
    -- Calculate in-year weight based on minutes proportion
    IF v_comp_record.season_year = v_year1 AND v_year1_total_minutes > 0 THEN
      v_in_year_weight := LEAST(v_comp_record.minutes::NUMERIC / v_year1_total_minutes, 1.0);
    ELSIF v_comp_record.season_year = v_year2 AND v_year2_total_minutes > 0 THEN
      v_in_year_weight := LEAST(v_comp_record.minutes::NUMERIC / v_year2_total_minutes, 1.0);
    ELSE
      v_in_year_weight := 1.0;
    END IF;
    
    -- Final weight = year_weight * in_year_weight
    v_final_weight := v_year_weight * v_in_year_weight;
    
    -- Skip if weight is negligible
    IF v_final_weight < 0.01 THEN
      CONTINUE;
    END IF;
    
    -- Competition level score (0-100) based on coefficient
    v_competition_level_score := LEAST(v_comp_record.final_coefficient * 20, 100);
    
    -- Calculate per-90 metrics
    v_minutes_90 := GREATEST(v_comp_record.minutes::NUMERIC / 90.0, 0.01);
    
    v_goals_90 := v_comp_record.goals::NUMERIC / v_minutes_90;
    v_assists_90 := v_comp_record.assists::NUMERIC / v_minutes_90;
    v_ga_90 := (v_comp_record.goals + v_comp_record.assists)::NUMERIC / v_minutes_90;
    v_tackles_90 := v_comp_record.tackles::NUMERIC / v_minutes_90;
    v_interceptions_90 := v_comp_record.interceptions::NUMERIC / v_minutes_90;
    v_recoveries_90 := v_comp_record.recoveries::NUMERIC / v_minutes_90;
    v_saves_90 := v_comp_record.saves::NUMERIC / v_minutes_90;
    v_goals_conceded_90 := v_comp_record.goals_conceded::NUMERIC / v_minutes_90;
    v_aerial_duels_90 := v_comp_record.aerial_duels_won::NUMERIC / v_minutes_90;
    v_accurate_passes_90 := v_comp_record.accurate_passes::NUMERIC / v_minutes_90;
    v_chances_created_90 := v_comp_record.chances_created::NUMERIC / v_minutes_90;
    v_key_passes_90 := v_comp_record.key_passes::NUMERIC / v_minutes_90;
    v_shots_90 := v_comp_record.shots::NUMERIC / v_minutes_90;
    v_shots_on_target_90 := v_comp_record.shots_on_target::NUMERIC / v_minutes_90;
    v_cards_90 := (v_comp_record.yellow_cards + v_comp_record.red_cards * 2)::NUMERIC / v_minutes_90;
    
    -- Calculate percentages
    IF v_comp_record.total_duels > 0 THEN
      v_duels_won_pct := (v_comp_record.duels_won::NUMERIC / v_comp_record.total_duels::NUMERIC) * 100;
    ELSE
      v_duels_won_pct := 0;
    END IF;
    
    IF v_comp_record.total_passes > 0 THEN
      v_pass_accuracy := (v_comp_record.accurate_passes::NUMERIC / v_comp_record.total_passes::NUMERIC) * 100;
    ELSE
      v_pass_accuracy := 0;
    END IF;
    
    -- Calculate position-specific stats score
    v_stat_breakdown := '[]'::JSONB;
    v_total_weight := 0;
    v_weighted_score := 0;
    
    CASE v_position_group
      WHEN 'goalkeeper' THEN
        -- Goalkeeper stats
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key', 'saves_90', 'stat_label', 'Defesas/90', 'value_raw', v_saves_90, 'subscore_100', LEAST(v_saves_90 * 25, 100), 'weight_pct', 25),
          jsonb_build_object('stat_key', 'goals_conceded_90', 'stat_label', 'Gols Sofridos/90', 'value_raw', v_goals_conceded_90, 'subscore_100', GREATEST(100 - v_goals_conceded_90 * 40, 0), 'weight_pct', 25),
          jsonb_build_object('stat_key', 'clean_sheets', 'stat_label', 'Clean Sheets', 'value_raw', v_comp_record.clean_sheets, 'subscore_100', LEAST(v_comp_record.clean_sheets * 15, 100), 'weight_pct', 20),
          jsonb_build_object('stat_key', 'aerial_duels_90', 'stat_label', 'Duelos Aéreos/90', 'value_raw', v_aerial_duels_90, 'subscore_100', LEAST(v_aerial_duels_90 * 50, 100), 'weight_pct', 15),
          jsonb_build_object('stat_key', 'pass_accuracy', 'stat_label', 'Precisão Passes', 'value_raw', v_pass_accuracy, 'subscore_100', v_pass_accuracy, 'weight_pct', 15)
        );
        
      WHEN 'center_back' THEN
        -- Center back / lateral stats
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key', 'tackles_90', 'stat_label', 'Desarmes/90', 'value_raw', v_tackles_90, 'subscore_100', LEAST(v_tackles_90 * 25, 100), 'weight_pct', 20),
          jsonb_build_object('stat_key', 'interceptions_90', 'stat_label', 'Interceptações/90', 'value_raw', v_interceptions_90, 'subscore_100', LEAST(v_interceptions_90 * 30, 100), 'weight_pct', 20),
          jsonb_build_object('stat_key', 'duels_won_pct', 'stat_label', 'Duelos Vencidos (%)', 'value_raw', v_duels_won_pct, 'subscore_100', v_duels_won_pct, 'weight_pct', 20),
          jsonb_build_object('stat_key', 'pass_accuracy', 'stat_label', 'Precisão Passes', 'value_raw', v_pass_accuracy, 'subscore_100', v_pass_accuracy, 'weight_pct', 15),
          jsonb_build_object('stat_key', 'recoveries_90', 'stat_label', 'Recuperações/90', 'value_raw', v_recoveries_90, 'subscore_100', LEAST(v_recoveries_90 * 15, 100), 'weight_pct', 15),
          jsonb_build_object('stat_key', 'discipline', 'stat_label', 'Disciplina', 'value_raw', v_cards_90, 'subscore_100', GREATEST(100 - v_cards_90 * 30, 0), 'weight_pct', 10)
        );
        
      WHEN 'defensive_mid' THEN
        -- Volante stats
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key', 'tackles_90', 'stat_label', 'Desarmes/90', 'value_raw', v_tackles_90, 'subscore_100', LEAST(v_tackles_90 * 25, 100), 'weight_pct', 18),
          jsonb_build_object('stat_key', 'recoveries_90', 'stat_label', 'Recuperações/90', 'value_raw', v_recoveries_90, 'subscore_100', LEAST(v_recoveries_90 * 15, 100), 'weight_pct', 18),
          jsonb_build_object('stat_key', 'interceptions_90', 'stat_label', 'Interceptações/90', 'value_raw', v_interceptions_90, 'subscore_100', LEAST(v_interceptions_90 * 30, 100), 'weight_pct', 15),
          jsonb_build_object('stat_key', 'pass_accuracy', 'stat_label', 'Precisão Passes', 'value_raw', v_pass_accuracy, 'subscore_100', v_pass_accuracy, 'weight_pct', 15),
          jsonb_build_object('stat_key', 'duels_won_pct', 'stat_label', 'Duelos Vencidos (%)', 'value_raw', v_duels_won_pct, 'subscore_100', v_duels_won_pct, 'weight_pct', 15),
          jsonb_build_object('stat_key', 'key_passes_90', 'stat_label', 'Passes Decisivos/90', 'value_raw', v_key_passes_90, 'subscore_100', LEAST(v_key_passes_90 * 40, 100), 'weight_pct', 10),
          jsonb_build_object('stat_key', 'discipline', 'stat_label', 'Disciplina', 'value_raw', v_cards_90, 'subscore_100', GREATEST(100 - v_cards_90 * 30, 0), 'weight_pct', 9)
        );
        
      WHEN 'midfielder' THEN
        -- Midfielder stats
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key', 'key_passes_90', 'stat_label', 'Passes Decisivos/90', 'value_raw', v_key_passes_90, 'subscore_100', LEAST(v_key_passes_90 * 40, 100), 'weight_pct', 20),
          jsonb_build_object('stat_key', 'chances_created_90', 'stat_label', 'Chances Criadas/90', 'value_raw', v_chances_created_90, 'subscore_100', LEAST(v_chances_created_90 * 50, 100), 'weight_pct', 18),
          jsonb_build_object('stat_key', 'pass_accuracy', 'stat_label', 'Precisão Passes', 'value_raw', v_pass_accuracy, 'subscore_100', v_pass_accuracy, 'weight_pct', 15),
          jsonb_build_object('stat_key', 'ga_per_90', 'stat_label', 'G+A/90', 'value_raw', v_ga_90, 'subscore_100', LEAST(v_ga_90 * 100, 100), 'weight_pct', 15),
          jsonb_build_object('stat_key', 'recoveries_90', 'stat_label', 'Recuperações/90', 'value_raw', v_recoveries_90, 'subscore_100', LEAST(v_recoveries_90 * 15, 100), 'weight_pct', 12),
          jsonb_build_object('stat_key', 'tackles_90', 'stat_label', 'Desarmes/90', 'value_raw', v_tackles_90, 'subscore_100', LEAST(v_tackles_90 * 25, 100), 'weight_pct', 10),
          jsonb_build_object('stat_key', 'discipline', 'stat_label', 'Disciplina', 'value_raw', v_cards_90, 'subscore_100', GREATEST(100 - v_cards_90 * 30, 0), 'weight_pct', 10)
        );
        
      WHEN 'forward' THEN
        -- Forward stats
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key', 'goals_per_90', 'stat_label', 'Gols/90', 'value_raw', v_goals_90, 'subscore_100', LEAST(v_goals_90 * 150, 100), 'weight_pct', 30),
          jsonb_build_object('stat_key', 'ga_per_90', 'stat_label', 'G+A/90', 'value_raw', v_ga_90, 'subscore_100', LEAST(v_ga_90 * 100, 100), 'weight_pct', 20),
          jsonb_build_object('stat_key', 'shots_on_target_90', 'stat_label', 'Finalizações no Gol/90', 'value_raw', v_shots_on_target_90, 'subscore_100', LEAST(v_shots_on_target_90 * 35, 100), 'weight_pct', 15),
          jsonb_build_object('stat_key', 'chances_created_90', 'stat_label', 'Chances Criadas/90', 'value_raw', v_chances_created_90, 'subscore_100', LEAST(v_chances_created_90 * 50, 100), 'weight_pct', 15),
          jsonb_build_object('stat_key', 'key_passes_90', 'stat_label', 'Passes Decisivos/90', 'value_raw', v_key_passes_90, 'subscore_100', LEAST(v_key_passes_90 * 40, 100), 'weight_pct', 10),
          jsonb_build_object('stat_key', 'discipline', 'stat_label', 'Disciplina', 'value_raw', v_cards_90, 'subscore_100', GREATEST(100 - v_cards_90 * 30, 0), 'weight_pct', 10)
        );
    END CASE;
    
    -- Calculate weighted position stats score
    SELECT COALESCE(SUM((s->>'subscore_100')::NUMERIC * (s->>'weight_pct')::NUMERIC / 100), 0)
    INTO v_position_stats_score
    FROM jsonb_array_elements(v_stat_breakdown) AS s;
    
    -- Final competition score = 70% stats + 30% competition level
    v_final_comp_score := (v_position_stats_score * 0.70) + (v_competition_level_score * 0.30);
    
    -- Accumulate for weighted average
    v_sum_weighted_scores := v_sum_weighted_scores + (v_final_comp_score * v_final_weight);
    v_sum_weights := v_sum_weights + v_final_weight;
    v_total_minutes := v_total_minutes + v_comp_record.minutes;
    v_total_matches := v_total_matches + v_comp_record.matches;
    
    -- Add to competitions array
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
      'year_weight', v_year_weight,
      'in_year_weight', v_in_year_weight,
      'final_weight', v_final_weight,
      'competition_level_score', v_competition_level_score,
      'position_stats_score', v_position_stats_score,
      'final_score', v_final_comp_score,
      'stat_breakdown', v_stat_breakdown,
      'data_source', v_comp_record.data_source
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
  
  -- Convert to 0-5 rating (rounded to 0.5)
  v_rating_05 := ROUND((v_final_score_100 / 20) * 2) / 2;
  v_rating_05 := LEAST(GREATEST(v_rating_05, 1.0), 5.0);
  
  -- Determine reliability
  IF v_total_minutes >= 2000 THEN
    v_reliability := 'high';
  ELSIF v_total_minutes >= 900 THEN
    v_reliability := 'medium';
  ELSE
    v_reliability := 'low';
  END IF;
  
  -- Build details JSON
  v_details := jsonb_build_object(
    'version', 'v2',
    'calculated_at', NOW(),
    'position', v_player.position,
    'position_group', v_position_group,
    'age', v_player.age,
    'total_matches', v_total_matches,
    'total_minutes', v_total_minutes,
    'total_competitions', jsonb_array_length(v_competitions),
    'competitions', v_competitions,
    'scores', jsonb_build_object(
      'final_index_100', ROUND(v_final_score_100::NUMERIC, 1),
      'rating_0_5', v_rating_05
    ),
    'reliability', v_reliability
  );
  
  -- Update player
  UPDATE public.players
  SET auto_rating_details = v_details
  WHERE id = p_player_id;
  
  RETURN v_rating_05;
END;
$function$;