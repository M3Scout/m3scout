-- Add auto_rating fields to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS auto_rating NUMERIC(3,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create function to calculate athlete auto rating (0.0 to 5.0)
CREATE OR REPLACE FUNCTION public.calculate_athlete_auto_rating(p_player_id UUID)
RETURNS NUMERIC(3,1)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(MAX(c.computed_coefficient), 1.0) AS max_competition_coef
  INTO v_stats
  FROM public.player_stats ps
  LEFT JOIN public.competitions c ON ps.competition_id = c.id
  WHERE ps.player_id = p_player_id
    AND ps.season_year = v_current_year;
  
  -- If no stats or no minutes, return NULL (no rating)
  IF v_stats IS NULL OR v_stats.total_minutes < 90 THEN
    RETURN NULL;
  END IF;
  
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
    -- Forwards: goals heavily weighted
    -- goals_90: 0->0, 0.3->40, 0.6->70, 0.9->90, 1.2->100
    v_production_score := (
      LEAST(100, (v_goals_90 / 1.2) * 100) * 0.70 +
      LEAST(100, (v_assists_90 / 0.6) * 100) * 0.30
    );
  ELSIF v_position_group = 'midfielder' THEN
    -- Midfielders: balanced
    v_production_score := (
      LEAST(100, (v_goals_90 / 0.6) * 100) * 0.40 +
      LEAST(100, (v_assists_90 / 0.8) * 100) * 0.60
    );
  ELSIF v_position_group = 'defender' THEN
    -- Defenders: assists matter more than goals
    v_production_score := (
      LEAST(100, (v_goals_90 / 0.2) * 100) * 0.20 +
      LEAST(100, (v_assists_90 / 0.4) * 100) * 0.80
    );
  ELSE
    -- Goalkeeper: minimal production expectation
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
  
  RETURN v_rating_05::NUMERIC(3,1);
END;
$$;

-- Create function to update player auto_rating
CREATE OR REPLACE FUNCTION public.update_player_auto_rating(p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_rating NUMERIC(3,1);
BEGIN
  v_new_rating := public.calculate_athlete_auto_rating(p_player_id);
  
  UPDATE public.players
  SET 
    auto_rating = v_new_rating,
    rating_updated_at = NOW()
  WHERE id = p_player_id;
END;
$$;

-- Create trigger function for players table
CREATE OR REPLACE FUNCTION public.trigger_update_player_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if relevant fields changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.age IS DISTINCT FROM NEW.age 
       OR OLD.position IS DISTINCT FROM NEW.position 
       OR OLD.current_club IS DISTINCT FROM NEW.current_club THEN
      PERFORM public.update_player_auto_rating(NEW.id);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.update_player_auto_rating(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger function for player_stats table
CREATE OR REPLACE FUNCTION public.trigger_update_rating_on_stats_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_player_auto_rating(OLD.player_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_player_auto_rating(NEW.player_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on players table
DROP TRIGGER IF EXISTS trg_update_player_rating ON public.players;
CREATE TRIGGER trg_update_player_rating
  AFTER INSERT OR UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_player_rating();

-- Create trigger on player_stats table
DROP TRIGGER IF EXISTS trg_update_rating_on_stats_change ON public.player_stats;
CREATE TRIGGER trg_update_rating_on_stats_change
  AFTER INSERT OR UPDATE OR DELETE ON public.player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_rating_on_stats_change();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_players_auto_rating ON public.players(auto_rating DESC NULLS LAST);