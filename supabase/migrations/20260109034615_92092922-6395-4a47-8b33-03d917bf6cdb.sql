-- Update the calculate_athlete_auto_rating function to also return and store details
CREATE OR REPLACE FUNCTION public.calculate_athlete_auto_rating(p_player_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_player RECORD;
  v_stats RECORD;
  v_competition_coef NUMERIC := 1.0;
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  
  -- Scores (0-100 scale)
  v_competition_score NUMERIC := 50;
  v_production_score NUMERIC := 0;
  v_defensive_score NUMERIC := 0;
  v_discipline_score NUMERIC := 100;
  v_age_score NUMERIC := 75;
  
  -- Per 90 metrics
  v_minutes_90 NUMERIC;
  v_goals_90 NUMERIC := 0;
  v_assists_90 NUMERIC := 0;
  v_tackles_90 NUMERIC := 0;
  v_interceptions_90 NUMERIC := 0;
  v_recoveries_90 NUMERIC := 0;
  v_cards_90 NUMERIC := 0;
  
  -- Position group: 'forward', 'midfielder', 'defender', 'goalkeeper'
  v_position_group TEXT := 'midfielder';
  
  -- Weights
  v_weight_competition NUMERIC := 0.30;
  v_weight_production NUMERIC := 0.35;
  v_weight_defensive NUMERIC := 0.20;
  v_weight_discipline NUMERIC := 0.10;
  v_weight_age NUMERIC := 0.05;
  
  -- Final calculations
  v_overall_100 NUMERIC;
  v_rating_05 NUMERIC;
  
  -- Details JSON
  v_details JSONB;
  v_competition_details JSONB := '[]'::JSONB;
  v_comp_record RECORD;
BEGIN
  -- Get player data
  SELECT id, position, age, current_club
  INTO v_player
  FROM public.players
  WHERE id = p_player_id;
  
  IF v_player IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Determine position group
  v_position_group := CASE 
    WHEN v_player.position IN ('Atacante', 'Centroavante', 'Ponta Direita', 'Ponta Esquerda', 'Segundo Atacante') THEN 'forward'
    WHEN v_player.position IN ('Meia', 'Meia Atacante', 'Meia Central', 'Volante', 'Meio-Campo') THEN 'midfielder'
    WHEN v_player.position IN ('Zagueiro', 'Lateral Direito', 'Lateral Esquerdo', 'Ala Direito', 'Ala Esquerdo') THEN 'defender'
    WHEN v_player.position = 'Goleiro' THEN 'goalkeeper'
    ELSE 'midfielder'
  END;
  
  -- Get aggregated stats for current year
  SELECT 
    COALESCE(SUM(matches), 0) AS total_matches,
    COALESCE(SUM(minutes), 0) AS total_minutes,
    COALESCE(SUM(goals), 0) AS total_goals,
    COALESCE(SUM(assists), 0) AS total_assists,
    COALESCE(SUM(yellow_cards), 0) AS total_yellow_cards,
    COALESCE(SUM(red_cards), 0) AS total_red_cards,
    COALESCE(SUM(tackles), 0) AS total_tackles,
    COALESCE(SUM(interceptions), 0) AS total_interceptions,
    COALESCE(SUM(recoveries), 0) AS total_recoveries,
    COALESCE(MAX(c.final_coefficient), 1.0) AS max_competition_coef
  INTO v_stats
  FROM public.player_stats ps
  LEFT JOIN public.competitions c ON ps.competition_id = c.id
  WHERE ps.player_id = p_player_id
    AND ps.season_year = v_current_year;
  
  -- If no stats or no minutes, return NULL (no rating)
  IF v_stats IS NULL OR v_stats.total_minutes < 90 THEN
    -- Clear details when no rating
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;
  
  -- Build per-competition details
  FOR v_comp_record IN 
    SELECT 
      c.id AS competition_id,
      c.name AS competition_name,
      c.final_coefficient,
      ps.matches,
      ps.minutes,
      ps.goals,
      ps.assists,
      ps.yellow_cards,
      ps.red_cards,
      ps.tackles,
      ps.interceptions,
      ps.recoveries
    FROM public.player_stats ps
    LEFT JOIN public.competitions c ON ps.competition_id = c.id
    WHERE ps.player_id = p_player_id AND ps.season_year = v_current_year
  LOOP
    v_competition_details := v_competition_details || jsonb_build_object(
      'competition_id', v_comp_record.competition_id,
      'competition_name', COALESCE(v_comp_record.competition_name, 'Sem competição'),
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
      'goals_per_90', CASE WHEN v_comp_record.minutes > 0 THEN ROUND((v_comp_record.goals::NUMERIC / (v_comp_record.minutes::NUMERIC / 90)), 2) ELSE 0 END,
      'assists_per_90', CASE WHEN v_comp_record.minutes > 0 THEN ROUND((v_comp_record.assists::NUMERIC / (v_comp_record.minutes::NUMERIC / 90)), 2) ELSE 0 END
    );
  END LOOP;
  
  v_competition_coef := COALESCE(v_stats.max_competition_coef, 1.0);
  v_minutes_90 := v_stats.total_minutes / 90.0;
  
  -- Calculate per 90 metrics
  v_goals_90 := v_stats.total_goals / v_minutes_90;
  v_assists_90 := v_stats.total_assists / v_minutes_90;
  v_tackles_90 := v_stats.total_tackles / v_minutes_90;
  v_interceptions_90 := v_stats.total_interceptions / v_minutes_90;
  v_recoveries_90 := v_stats.total_recoveries / v_minutes_90;
  v_cards_90 := (v_stats.total_yellow_cards + 3 * v_stats.total_red_cards) / v_minutes_90;
  
  -- ===========================================
  -- A) Competition Level Score (0-100)
  -- Normalize coefficient (range 0.55 to 1.25)
  -- ===========================================
  v_competition_score := LEAST(100, GREATEST(0, 
    ((v_competition_coef - 0.55) / (1.25 - 0.55)) * 100
  ));
  
  -- ===========================================
  -- B) Production Score (0-100) - Goals and Assists
  -- ===========================================
  IF v_position_group = 'forward' THEN
    v_production_score := (
      LEAST(100, (v_goals_90 / 1.2) * 100) * 0.70 +
      LEAST(100, (v_assists_90 / 0.6) * 100) * 0.30
    );
  ELSIF v_position_group = 'midfielder' THEN
    v_production_score := (
      LEAST(100, (v_goals_90 / 0.6) * 100) * 0.40 +
      LEAST(100, (v_assists_90 / 0.8) * 100) * 0.60
    );
  ELSIF v_position_group = 'defender' THEN
    v_production_score := (
      LEAST(100, (v_goals_90 / 0.2) * 100) * 0.20 +
      LEAST(100, (v_assists_90 / 0.4) * 100) * 0.80
    );
  ELSE
    v_production_score := 50;
  END IF;
  
  v_production_score := LEAST(100, GREATEST(0, v_production_score));
  
  -- ===========================================
  -- C) Defensive Actions Score (0-100)
  -- ===========================================
  IF v_position_group = 'forward' THEN
    v_defensive_score := (
      LEAST(100, (v_tackles_90 / 2.0) * 100) * 0.50 +
      LEAST(100, (v_interceptions_90 / 1.2) * 100) * 0.30 +
      LEAST(100, (v_recoveries_90 / 4.0) * 100) * 0.20
    );
  ELSIF v_position_group = 'midfielder' THEN
    v_defensive_score := (
      LEAST(100, (v_tackles_90 / 4.0) * 100) * 0.50 +
      LEAST(100, (v_interceptions_90 / 3.0) * 100) * 0.30 +
      LEAST(100, (v_recoveries_90 / 8.0) * 100) * 0.20
    );
  ELSIF v_position_group = 'defender' THEN
    v_defensive_score := (
      LEAST(100, (v_tackles_90 / 6.0) * 100) * 0.50 +
      LEAST(100, (v_interceptions_90 / 4.0) * 100) * 0.30 +
      LEAST(100, (v_recoveries_90 / 10.0) * 100) * 0.20
    );
  ELSE
    v_defensive_score := 50;
  END IF;
  
  v_defensive_score := LEAST(100, GREATEST(0, v_defensive_score));
  
  -- ===========================================
  -- D) Discipline Score (0-100) - Lower cards = higher score
  -- ===========================================
  v_discipline_score := CASE
    WHEN v_cards_90 <= 0.10 THEN 100
    WHEN v_cards_90 <= 0.20 THEN 80
    WHEN v_cards_90 <= 0.30 THEN 60
    WHEN v_cards_90 <= 0.45 THEN 40
    ELSE 20
  END;
  
  -- ===========================================
  -- E) Age Potential Score (0-100)
  -- Peak: 24-29, good development: 20-23, declining: 30+
  -- ===========================================
  IF v_player.age IS NOT NULL THEN
    v_age_score := CASE
      WHEN v_player.age BETWEEN 16 AND 19 THEN 90
      WHEN v_player.age BETWEEN 20 AND 22 THEN 95
      WHEN v_player.age BETWEEN 23 AND 25 THEN 85
      WHEN v_player.age BETWEEN 26 AND 28 THEN 75
      WHEN v_player.age BETWEEN 29 AND 31 THEN 65
      ELSE 55
    END;
  END IF;
  
  -- ===========================================
  -- Calculate Overall (0-100)
  -- ===========================================
  v_overall_100 := (
    v_competition_score * v_weight_competition +
    v_production_score * v_weight_production +
    v_defensive_score * v_weight_defensive +
    v_discipline_score * v_weight_discipline +
    v_age_score * v_weight_age
  );
  
  -- Convert to 0-5 scale and round to nearest 0.5
  v_rating_05 := ROUND((v_overall_100 / 100.0) * 5 * 2) / 2;
  
  -- Clamp between 0.0 and 5.0
  v_rating_05 := LEAST(5.0, GREATEST(0.0, v_rating_05));
  
  -- Build details JSON
  v_details := jsonb_build_object(
    'calculated_at', NOW(),
    'season_year', v_current_year,
    'position_group', v_position_group,
    'weights', jsonb_build_object(
      'competition', v_weight_competition,
      'production', v_weight_production,
      'defensive', v_weight_defensive,
      'discipline', v_weight_discipline,
      'age', v_weight_age
    ),
    'scores', jsonb_build_object(
      'competition_level', ROUND(v_competition_score, 1),
      'production', ROUND(v_production_score, 1),
      'defensive_actions', ROUND(v_defensive_score, 1),
      'discipline', ROUND(v_discipline_score, 1),
      'age_potential', ROUND(v_age_score, 1),
      'overall_0_100', ROUND(v_overall_100, 1),
      'rating_0_5', v_rating_05
    ),
    'metrics', jsonb_build_object(
      'total_matches', v_stats.total_matches,
      'total_minutes', v_stats.total_minutes,
      'max_competition_coefficient', v_competition_coef,
      'goals_per_90', ROUND(v_goals_90, 2),
      'assists_per_90', ROUND(v_assists_90, 2),
      'tackles_per_90', ROUND(v_tackles_90, 2),
      'interceptions_per_90', ROUND(v_interceptions_90, 2),
      'recoveries_per_90', ROUND(v_recoveries_90, 2),
      'cards_per_90', ROUND(v_cards_90, 2)
    ),
    'per_competition', v_competition_details,
    'reliability', CASE 
      WHEN v_stats.total_minutes < 450 OR v_stats.total_matches < 5 THEN 'low'
      WHEN v_stats.total_minutes <= 1200 OR v_stats.total_matches <= 12 THEN 'medium'
      ELSE 'high'
    END
  );
  
  -- Store details in player record (this is done here, update_player_auto_rating will update rating)
  UPDATE public.players SET auto_rating_details = v_details WHERE id = p_player_id;
  
  RETURN v_rating_05::NUMERIC(3,1);
END;
$function$;