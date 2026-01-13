-- Create table to store calculated attribute scores per player/competition/season
CREATE TABLE public.player_attribute_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  ata_score_100 numeric,
  tec_score_100 numeric,
  def_score_100 numeric,
  tat_score_100 numeric,
  cri_score_100 numeric,
  attr_confidence numeric,
  details jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, competition_id, season_year)
);

-- Enable RLS
ALTER TABLE public.player_attribute_scores ENABLE ROW LEVEL SECURITY;

-- Internal users can view all scores
CREATE POLICY "Internal users can view attribute scores"
ON public.player_attribute_scores
FOR SELECT
USING (is_internal_user(auth.uid()));

-- Public can view scores for public players
CREATE POLICY "Public can view attribute scores for public players"
ON public.player_attribute_scores
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM players
  WHERE players.id = player_attribute_scores.player_id
  AND players.is_public = true
  AND (players.is_archived = false OR players.is_archived IS NULL)
));

-- Scouts and admins can create/update scores
CREATE POLICY "Scouts and admins can create attribute scores"
ON public.player_attribute_scores
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

CREATE POLICY "Scouts and admins can update attribute scores"
ON public.player_attribute_scores
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

CREATE POLICY "Admins can delete attribute scores"
ON public.player_attribute_scores
FOR DELETE
USING (is_admin(auth.uid()));

-- Create index for fast lookups
CREATE INDEX idx_player_attribute_scores_player ON public.player_attribute_scores(player_id);
CREATE INDEX idx_player_attribute_scores_lookup ON public.player_attribute_scores(player_id, competition_id, season_year);

-- Create function to calculate and upsert attribute scores
CREATE OR REPLACE FUNCTION public.calculate_player_attribute_scores(
  p_player_id uuid,
  p_competition_id uuid,
  p_season_year integer
) RETURNS jsonb AS $$
DECLARE
  v_stats RECORD;
  v_minutes numeric;
  v_matches numeric;
  v_confidence numeric;
  v_per90 jsonb;
  v_ratios jsonb;
  v_raw_scores jsonb;
  v_final_scores jsonb;
  v_ata numeric;
  v_tec numeric;
  v_def numeric;
  v_tat numeric;
  v_cri numeric;
  -- Per90 metrics
  v_goals_p90 numeric;
  v_assists_p90 numeric;
  v_shots_p90 numeric;
  v_shots_on_target_p90 numeric;
  v_key_passes_p90 numeric;
  v_chances_created_p90 numeric;
  v_tackles_p90 numeric;
  v_interceptions_p90 numeric;
  v_recoveries_p90 numeric;
  v_clearances_p90 numeric;
  v_duels_won_p90 numeric;
  v_balls_lost_p90 numeric;
  v_fouls_committed_p90 numeric;
  v_fouls_drawn_p90 numeric;
  v_yellow_p90 numeric;
  v_red_p90 numeric;
  v_passes_p90 numeric;
  v_dribbles_p90 numeric;
  v_g_plus_a_p90 numeric;
  -- Ratios
  v_pass_accuracy numeric;
  v_dribble_success numeric;
  v_duel_success numeric;
  -- Normalized scores (0-100)
  v_s_goals numeric;
  v_s_assists numeric;
  v_s_shots numeric;
  v_s_shots_on_target numeric;
  v_s_key_passes numeric;
  v_s_chances_created numeric;
  v_s_tackles numeric;
  v_s_interceptions numeric;
  v_s_recoveries numeric;
  v_s_clearances numeric;
  v_s_duels_won numeric;
  v_s_balls_lost_inv numeric;
  v_s_fouls_comm_inv numeric;
  v_s_fouls_drawn numeric;
  v_s_yellow_inv numeric;
  v_s_red_inv numeric;
  v_s_passes numeric;
  v_s_dribbles numeric;
  v_s_pass_accuracy numeric;
  v_s_dribble_success numeric;
  v_s_duel_success numeric;
  v_s_g_plus_a numeric;
BEGIN
  -- Fetch stats
  SELECT * INTO v_stats FROM public.player_stats
  WHERE player_id = p_player_id
    AND competition_id = p_competition_id
    AND season_year = p_season_year
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No stats found');
  END IF;

  v_minutes := COALESCE(v_stats.minutes, 0)::numeric;
  v_matches := COALESCE(v_stats.matches, 0)::numeric;

  IF v_minutes <= 0 THEN
    RETURN jsonb_build_object('error', 'No minutes played');
  END IF;

  -- Calculate confidence (0 to 1)
  v_confidence := LEAST(1.0, v_minutes / 900.0);

  -- Calculate per90 metrics
  v_goals_p90 := (COALESCE(v_stats.goals, 0)::numeric * 90.0) / v_minutes;
  v_assists_p90 := (COALESCE(v_stats.assists, 0)::numeric * 90.0) / v_minutes;
  v_shots_p90 := (COALESCE(v_stats.shots, 0)::numeric * 90.0) / v_minutes;
  v_shots_on_target_p90 := (COALESCE(v_stats.shots_on_target, 0)::numeric * 90.0) / v_minutes;
  v_key_passes_p90 := (COALESCE(v_stats.key_passes, 0)::numeric * 90.0) / v_minutes;
  v_chances_created_p90 := (COALESCE(v_stats.chances_created, 0)::numeric * 90.0) / v_minutes;
  v_tackles_p90 := (COALESCE(v_stats.tackles, 0)::numeric * 90.0) / v_minutes;
  v_interceptions_p90 := (COALESCE(v_stats.interceptions, 0)::numeric * 90.0) / v_minutes;
  v_recoveries_p90 := (COALESCE(v_stats.recoveries, 0)::numeric * 90.0) / v_minutes;
  v_clearances_p90 := (COALESCE(v_stats.clearances, 0)::numeric * 90.0) / v_minutes;
  v_duels_won_p90 := (COALESCE(v_stats.duels_won, 0)::numeric * 90.0) / v_minutes;
  v_balls_lost_p90 := (COALESCE(v_stats.possession_lost, 0)::numeric * 90.0) / v_minutes;
  v_fouls_committed_p90 := (COALESCE(v_stats.fouls_committed, 0)::numeric * 90.0) / v_minutes;
  v_fouls_drawn_p90 := (COALESCE(v_stats.fouls_drawn, 0)::numeric * 90.0) / v_minutes;
  v_yellow_p90 := (COALESCE(v_stats.yellow_cards, 0)::numeric * 90.0) / v_minutes;
  v_red_p90 := (COALESCE(v_stats.red_cards, 0)::numeric * 90.0) / v_minutes;
  v_passes_p90 := (COALESCE(v_stats.total_passes, 0)::numeric * 90.0) / v_minutes;
  v_dribbles_p90 := (COALESCE(v_stats.total_dribbles, 0)::numeric * 90.0) / v_minutes;
  v_g_plus_a_p90 := ((COALESCE(v_stats.goals, 0) + COALESCE(v_stats.assists, 0))::numeric * 90.0) / v_minutes;

  -- Calculate ratios
  v_pass_accuracy := CASE WHEN COALESCE(v_stats.total_passes, 0) > 0
    THEN COALESCE(v_stats.accurate_passes, 0)::numeric / v_stats.total_passes::numeric
    ELSE 0 END;
  v_dribble_success := CASE WHEN COALESCE(v_stats.total_dribbles, 0) > 0
    THEN COALESCE(v_stats.successful_dribbles, 0)::numeric / v_stats.total_dribbles::numeric
    ELSE 0 END;
  v_duel_success := CASE WHEN COALESCE(v_stats.total_duels, 0) > 0
    THEN COALESCE(v_stats.duels_won, 0)::numeric / v_stats.total_duels::numeric
    ELSE 0 END;

  -- Normalize to 0-100 (score_from_per90: x/cap * 100, clamped)
  -- Caps defined as per spec
  v_s_goals := LEAST(100, (v_goals_p90 / 0.9) * 100);
  v_s_assists := LEAST(100, (v_assists_p90 / 0.6) * 100);
  v_s_shots := LEAST(100, (v_shots_p90 / 4.5) * 100);
  v_s_shots_on_target := LEAST(100, (v_shots_on_target_p90 / 2.0) * 100);
  v_s_key_passes := LEAST(100, (v_key_passes_p90 / 3.0) * 100);
  v_s_chances_created := LEAST(100, (v_chances_created_p90 / 2.5) * 100);
  v_s_tackles := LEAST(100, (v_tackles_p90 / 4.0) * 100);
  v_s_interceptions := LEAST(100, (v_interceptions_p90 / 3.0) * 100);
  v_s_recoveries := LEAST(100, (v_recoveries_p90 / 12.0) * 100);
  v_s_clearances := LEAST(100, (v_clearances_p90 / 6.0) * 100);
  v_s_duels_won := LEAST(100, (v_duels_won_p90 / 8.0) * 100);
  v_s_balls_lost_inv := 100 - LEAST(100, (v_balls_lost_p90 / 20.0) * 100);
  v_s_fouls_comm_inv := 100 - LEAST(100, (v_fouls_committed_p90 / 3.0) * 100);
  v_s_fouls_drawn := LEAST(100, (v_fouls_drawn_p90 / 3.0) * 100);
  v_s_yellow_inv := 100 - LEAST(100, (v_yellow_p90 / 0.35) * 100);
  v_s_red_inv := 100 - LEAST(100, (v_red_p90 / 0.08) * 100);
  v_s_passes := LEAST(100, (v_passes_p90 / 70.0) * 100);
  v_s_dribbles := LEAST(100, (v_dribbles_p90 / 6.0) * 100);
  v_s_pass_accuracy := v_pass_accuracy * 100;
  v_s_dribble_success := v_dribble_success * 100;
  v_s_duel_success := v_duel_success * 100;
  v_s_g_plus_a := LEAST(100, (v_g_plus_a_p90 / 1.2) * 100);

  -- Clamp all scores to 0-100
  v_s_goals := GREATEST(0, LEAST(100, v_s_goals));
  v_s_assists := GREATEST(0, LEAST(100, v_s_assists));
  v_s_shots := GREATEST(0, LEAST(100, v_s_shots));
  v_s_shots_on_target := GREATEST(0, LEAST(100, v_s_shots_on_target));
  v_s_key_passes := GREATEST(0, LEAST(100, v_s_key_passes));
  v_s_chances_created := GREATEST(0, LEAST(100, v_s_chances_created));
  v_s_tackles := GREATEST(0, LEAST(100, v_s_tackles));
  v_s_interceptions := GREATEST(0, LEAST(100, v_s_interceptions));
  v_s_recoveries := GREATEST(0, LEAST(100, v_s_recoveries));
  v_s_clearances := GREATEST(0, LEAST(100, v_s_clearances));
  v_s_duels_won := GREATEST(0, LEAST(100, v_s_duels_won));
  v_s_balls_lost_inv := GREATEST(0, LEAST(100, v_s_balls_lost_inv));
  v_s_fouls_comm_inv := GREATEST(0, LEAST(100, v_s_fouls_comm_inv));
  v_s_fouls_drawn := GREATEST(0, LEAST(100, v_s_fouls_drawn));
  v_s_yellow_inv := GREATEST(0, LEAST(100, v_s_yellow_inv));
  v_s_red_inv := GREATEST(0, LEAST(100, v_s_red_inv));
  v_s_passes := GREATEST(0, LEAST(100, v_s_passes));
  v_s_dribbles := GREATEST(0, LEAST(100, v_s_dribbles));
  v_s_pass_accuracy := GREATEST(0, LEAST(100, v_s_pass_accuracy));
  v_s_dribble_success := GREATEST(0, LEAST(100, v_s_dribble_success));
  v_s_duel_success := GREATEST(0, LEAST(100, v_s_duel_success));
  v_s_g_plus_a := GREATEST(0, LEAST(100, v_s_g_plus_a));

  -- Calculate raw attribute scores (weighted averages)
  -- ATA: goals(0.35) + assists(0.15) + shots(0.20) + shots_on_target(0.20) + g+a(0.10)
  v_ata := (v_s_goals * 0.35) + (v_s_assists * 0.15) + (v_s_shots * 0.20) + (v_s_shots_on_target * 0.20) + (v_s_g_plus_a * 0.10);

  -- CRI: key_passes(0.35) + chances_created(0.35) + dribble_success(0.20) + dribbles_p90(0.10)
  v_cri := (v_s_key_passes * 0.35) + (v_s_chances_created * 0.35) + (v_s_dribble_success * 0.20) + (v_s_dribbles * 0.10);

  -- DEF: tackles(0.25) + interceptions(0.20) + recoveries(0.20) + duel_success(0.20) + clearances(0.15)
  v_def := (v_s_tackles * 0.25) + (v_s_interceptions * 0.20) + (v_s_recoveries * 0.20) + (v_s_duel_success * 0.20) + (v_s_clearances * 0.15);

  -- TEC: pass_accuracy(0.35) + passes_p90(0.15) + balls_lost_inv(0.25) + dribble_success(0.15) + fouls_drawn(0.10)
  v_tec := (v_s_pass_accuracy * 0.35) + (v_s_passes * 0.15) + (v_s_balls_lost_inv * 0.25) + (v_s_dribble_success * 0.15) + (v_s_fouls_drawn * 0.10);

  -- TAT: yellow_inv(0.25) + red_inv(0.30) + fouls_comm_inv(0.25) + duel_success(0.10) + passes_p90(0.10)
  v_tat := (v_s_yellow_inv * 0.25) + (v_s_red_inv * 0.30) + (v_s_fouls_comm_inv * 0.25) + (v_s_duel_success * 0.10) + (v_s_passes * 0.10);

  -- Apply confidence shrink: final = confidence * raw + (1 - confidence) * 50
  v_ata := (v_confidence * v_ata) + ((1 - v_confidence) * 50);
  v_cri := (v_confidence * v_cri) + ((1 - v_confidence) * 50);
  v_def := (v_confidence * v_def) + ((1 - v_confidence) * 50);
  v_tec := (v_confidence * v_tec) + ((1 - v_confidence) * 50);
  v_tat := (v_confidence * v_tat) + ((1 - v_confidence) * 50);

  -- Clamp final scores
  v_ata := GREATEST(0, LEAST(100, v_ata));
  v_cri := GREATEST(0, LEAST(100, v_cri));
  v_def := GREATEST(0, LEAST(100, v_def));
  v_tec := GREATEST(0, LEAST(100, v_tec));
  v_tat := GREATEST(0, LEAST(100, v_tat));

  -- Build details JSON
  v_per90 := jsonb_build_object(
    'goals', v_goals_p90, 'assists', v_assists_p90, 'shots', v_shots_p90,
    'shots_on_target', v_shots_on_target_p90, 'key_passes', v_key_passes_p90,
    'chances_created', v_chances_created_p90, 'tackles', v_tackles_p90,
    'interceptions', v_interceptions_p90, 'recoveries', v_recoveries_p90,
    'clearances', v_clearances_p90, 'duels_won', v_duels_won_p90,
    'balls_lost', v_balls_lost_p90, 'fouls_committed', v_fouls_committed_p90,
    'fouls_drawn', v_fouls_drawn_p90, 'yellow_cards', v_yellow_p90,
    'red_cards', v_red_p90, 'passes', v_passes_p90, 'dribbles', v_dribbles_p90
  );

  v_ratios := jsonb_build_object(
    'pass_accuracy', v_pass_accuracy,
    'dribble_success', v_dribble_success,
    'duel_success', v_duel_success
  );

  v_raw_scores := jsonb_build_object(
    'goals', v_s_goals, 'assists', v_s_assists, 'shots', v_s_shots,
    'shots_on_target', v_s_shots_on_target, 'key_passes', v_s_key_passes,
    'chances_created', v_s_chances_created, 'tackles', v_s_tackles,
    'interceptions', v_s_interceptions, 'recoveries', v_s_recoveries,
    'clearances', v_s_clearances, 'duels_won', v_s_duels_won,
    'balls_lost_inv', v_s_balls_lost_inv, 'fouls_comm_inv', v_s_fouls_comm_inv,
    'fouls_drawn', v_s_fouls_drawn, 'yellow_inv', v_s_yellow_inv,
    'red_inv', v_s_red_inv, 'passes', v_s_passes, 'dribbles', v_s_dribbles,
    'pass_accuracy', v_s_pass_accuracy, 'dribble_success', v_s_dribble_success,
    'duel_success', v_s_duel_success
  );

  v_final_scores := jsonb_build_object(
    'ata', v_ata, 'tec', v_tec, 'def', v_def, 'tat', v_tat, 'cri', v_cri
  );

  -- Upsert into player_attribute_scores
  INSERT INTO public.player_attribute_scores (
    player_id, competition_id, season_year,
    ata_score_100, tec_score_100, def_score_100, tat_score_100, cri_score_100,
    attr_confidence, details, updated_at
  )
  VALUES (
    p_player_id, p_competition_id, p_season_year,
    v_ata, v_tec, v_def, v_tat, v_cri,
    v_confidence,
    jsonb_build_object(
      'minutes', v_minutes,
      'matches', v_matches,
      'per90', v_per90,
      'ratios', v_ratios,
      'raw_scores', v_raw_scores,
      'final_scores', v_final_scores,
      'caps', jsonb_build_object(
        'goals_p90', 0.9, 'assists_p90', 0.6, 'shots_p90', 4.5,
        'shots_on_target_p90', 2.0, 'key_passes_p90', 3.0, 'chances_created_p90', 2.5,
        'tackles_p90', 4.0, 'interceptions_p90', 3.0, 'recoveries_p90', 12.0,
        'clearances_p90', 6.0, 'duels_won_p90', 8.0, 'balls_lost_p90', 20.0,
        'fouls_committed_p90', 3.0, 'yellow_cards_p90', 0.35, 'red_cards_p90', 0.08,
        'passes_p90', 70, 'dribbles_p90', 6.0
      )
    ),
    now()
  )
  ON CONFLICT (player_id, competition_id, season_year)
  DO UPDATE SET
    ata_score_100 = EXCLUDED.ata_score_100,
    tec_score_100 = EXCLUDED.tec_score_100,
    def_score_100 = EXCLUDED.def_score_100,
    tat_score_100 = EXCLUDED.tat_score_100,
    cri_score_100 = EXCLUDED.cri_score_100,
    attr_confidence = EXCLUDED.attr_confidence,
    details = EXCLUDED.details,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'ata', v_ata, 'tec', v_tec, 'def', v_def, 'tat', v_tat, 'cri', v_cri,
    'confidence', v_confidence,
    'minutes', v_minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate all attribute scores for a player
CREATE OR REPLACE FUNCTION public.recalculate_player_all_attributes(p_player_id uuid)
RETURNS TABLE(competition_id uuid, season_year integer, result jsonb) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.competition_id,
    ps.season_year,
    public.calculate_player_attribute_scores(ps.player_id, ps.competition_id, ps.season_year) as result
  FROM public.player_stats ps
  WHERE ps.player_id = p_player_id
    AND ps.competition_id IS NOT NULL
    AND ps.minutes > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate all players' attribute scores
CREATE OR REPLACE FUNCTION public.recalculate_all_attribute_scores()
RETURNS TABLE(player_id uuid, player_name text, rows_processed integer) AS $$
DECLARE
  v_player RECORD;
  v_count integer;
BEGIN
  FOR v_player IN SELECT DISTINCT p.id, p.full_name FROM players p
    JOIN player_stats ps ON ps.player_id = p.id
    WHERE ps.minutes > 0 AND ps.competition_id IS NOT NULL
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.recalculate_player_all_attributes(v_player.id);
    
    RETURN QUERY SELECT v_player.id, v_player.full_name, v_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;