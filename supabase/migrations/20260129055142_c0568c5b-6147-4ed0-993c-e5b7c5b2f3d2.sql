
-- Fix rebuild_match_ratings to derive minutes from started/entered/exited when minutes_played is NULL
-- Also adds rating_breakdown JSON column and persists detailed breakdown for EVERY player

-- 1. First, add rating_breakdown column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'match_player_stats' 
    AND column_name = 'rating_breakdown'
  ) THEN
    ALTER TABLE public.match_player_stats 
    ADD COLUMN rating_breakdown jsonb DEFAULT NULL;
  END IF;
END$$;

-- 2. Replace the rebuild function with proper minutes calculation
CREATE OR REPLACE FUNCTION public.rebuild_match_ratings(p_match_id uuid DEFAULT NULL)
RETURNS TABLE(
  match_player_stats_id uuid,
  player_id uuid,
  match_id uuid,
  old_rating numeric,
  new_rating numeric,
  minutes_played integer,
  minutes_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_rating CONSTANT numeric := 6.0;
  v_offensive_cap CONSTANT numeric := 1.0;
  v_max_no_impact CONSTANT numeric := 6.9;
BEGIN
  RETURN QUERY
  WITH match_data AS (
    SELECT 
      mps.id,
      mps.player_id,
      mps.match_id,
      mps.rating AS current_rating,
      -- CRITICAL FIX: Derive minutes from started/entered/exited if minutes_played is NULL
      CASE 
        WHEN mp.minutes_played IS NOT NULL AND mp.minutes_played > 0 THEN mp.minutes_played
        WHEN mp.started = true AND mp.exited_minute IS NOT NULL THEN mp.exited_minute
        WHEN mp.started = true AND mp.exited_minute IS NULL THEN 90 -- played full game
        WHEN mp.entered_minute IS NOT NULL AND mp.exited_minute IS NOT NULL THEN 
          GREATEST(mp.exited_minute - mp.entered_minute, 1)
        WHEN mp.entered_minute IS NOT NULL AND mp.exited_minute IS NULL THEN 
          GREATEST(90 - mp.entered_minute, 1)
        ELSE 0
      END AS mins,
      -- Player position for GK detection
      LOWER(p.position) AS pos,
      -- All stats from match_player_stats
      mps.goals, mps.assists, mps.shots_on_target, mps.shots,
      mps.dribbles_success, mps.dribbles_total,
      mps.key_passes, mps.chances_created,
      mps.crosses_success, mps.crosses_failed,
      mps.passes_completed, mps.passes_total,
      mps.interceptions, mps.recoveries, mps.clearances, mps.tackles,
      mps.blocked_shots, mps.was_dribbled,
      mps.duels_won, mps.duels_total,
      mps.aerial_duels_won, mps.aerial_duels_total,
      mps.fouls_committed, mps.fouls_suffered, mps.possession_lost,
      mps.yellow_cards, mps.red_cards,
      mps.saves, mps.goals_conceded
    FROM match_player_stats mps
    JOIN match_players mp ON mp.match_id = mps.match_id AND mp.player_id = mps.player_id
    JOIN players p ON p.id = mps.player_id
    WHERE (p_match_id IS NULL OR mps.match_id = p_match_id)
      AND COALESCE(mp.is_removed, false) = false
  ),
  calculated AS (
    SELECT 
      md.*,
      calculate_minutes_factor(md.mins) AS m_factor,
      (md.pos IN ('gk', 'goleiro', 'goalkeeper')) AS is_gk,
      -- ATTACK
      (md.goals * 0.80) + LEAST(md.shots_on_target * 0.08, 0.40) AS attack_raw,
      -- CREATION
      (md.assists * 0.60) +
      (md.key_passes * 0.12) +
      (md.chances_created * 0.10) +
      LEAST(md.dribbles_success * 0.06, 0.30) +
      (md.dribbles_total * -0.07) +
      (md.crosses_success * 0.06) +
      (md.crosses_failed * -0.04) +
      (md.fouls_suffered * 0.04) +
      (md.possession_lost * -0.05)
      AS creation_raw,
      -- PASSING
      LEAST(md.passes_completed * 0.005, 0.20) +
      (md.passes_total * -0.03)
      AS passing_raw,
      -- DEFENSE
      (md.tackles * 0.12) +
      (md.interceptions * 0.10) +
      (md.clearances * 0.08) +
      (md.blocked_shots * 0.10) +
      (md.recoveries * 0.05) +
      (md.duels_won * 0.06) +
      ((md.duels_total - md.duels_won) * -0.06) +
      (md.aerial_duels_won * 0.07) +
      ((md.aerial_duels_total - md.aerial_duels_won) * -0.07) +
      (md.fouls_committed * -0.04) +
      (md.was_dribbled * -0.10)
      AS defense_raw,
      -- DISCIPLINE
      (md.yellow_cards * -0.20) +
      (md.red_cards * -0.80)
      AS discipline_raw,
      -- GOALKEEPER
      (md.saves * 0.18) +
      (md.goals_conceded * -0.35)
      AS gk_raw
    FROM match_data md
  ),
  with_caps AS (
    SELECT 
      c.*,
      CASE WHEN NOT c.is_gk THEN
        LEAST(c.attack_raw + c.creation_raw + c.passing_raw, v_offensive_cap)
      ELSE 0 END AS offensive_capped,
      (c.goals > 0 OR c.assists > 0 OR 
       c.tackles > 2 OR c.interceptions > 2 OR c.recoveries > 3 OR c.clearances > 2) AS has_impact
    FROM calculated c
  ),
  final_calc AS (
    SELECT 
      wc.id,
      wc.player_id,
      wc.match_id,
      wc.current_rating,
      wc.mins,
      wc.m_factor,
      wc.is_gk,
      wc.has_impact,
      wc.offensive_capped,
      wc.attack_raw,
      wc.creation_raw,
      wc.passing_raw,
      wc.defense_raw,
      wc.discipline_raw,
      wc.gk_raw,
      CASE WHEN wc.is_gk THEN
        wc.gk_raw + wc.passing_raw + wc.discipline_raw
      ELSE
        wc.offensive_capped + wc.defense_raw + wc.discipline_raw
      END AS raw_impact
    FROM with_caps wc
  ),
  rating_computed AS (
    SELECT
      fc.id,
      fc.player_id,
      fc.match_id,
      fc.current_rating,
      fc.mins,
      fc.m_factor,
      fc.raw_impact,
      fc.is_gk,
      fc.has_impact,
      fc.attack_raw,
      fc.creation_raw,
      fc.passing_raw,
      fc.defense_raw,
      fc.discipline_raw,
      fc.gk_raw,
      fc.offensive_capped,
      CASE 
        WHEN fc.mins = 0 THEN NULL
        ELSE 
          ROUND(
            LEAST(
              GREATEST(
                CASE WHEN NOT fc.has_impact AND NOT fc.is_gk THEN
                  LEAST(v_base_rating + (fc.raw_impact * fc.m_factor), v_max_no_impact)
                ELSE
                  v_base_rating + (fc.raw_impact * fc.m_factor)
                END,
                4.0
              ),
              10.0
            ),
            1
          )
      END AS computed_rating
    FROM final_calc fc
  )
  UPDATE match_player_stats mps
  SET 
    rating = rc.computed_rating,
    rating_minutes_played = rc.mins,
    rating_minutes_factor = rc.m_factor,
    rating_computed_at = now(),
    rating_engine_version = 'v8-sql-rebuild',
    -- CRITICAL: Persist breakdown JSON for ALL players with rating
    rating_breakdown = CASE WHEN rc.computed_rating IS NOT NULL THEN
      jsonb_build_object(
        'baseRating', v_base_rating,
        'minutesPlayed', rc.mins,
        'minutesFactor', rc.m_factor,
        'rawImpact', rc.raw_impact,
        'isGoalkeeper', rc.is_gk,
        'hasImpact', rc.has_impact,
        'categories', jsonb_build_object(
          'attack', jsonb_build_object('value', rc.attack_raw, 'label', 'Ataque'),
          'creation', jsonb_build_object('value', rc.creation_raw, 'label', 'Criação'),
          'passing', jsonb_build_object('value', rc.passing_raw, 'label', 'Passes'),
          'defense', jsonb_build_object('value', rc.defense_raw, 'label', 'Defesa'),
          'discipline', jsonb_build_object('value', rc.discipline_raw, 'label', 'Disciplina'),
          'goalkeeper', jsonb_build_object('value', rc.gk_raw, 'label', 'Goleiro')
        ),
        'offensiveCapped', rc.offensive_capped,
        'computedAt', now()
      )
    ELSE NULL END
  FROM rating_computed rc
  WHERE mps.id = rc.id
  RETURNING 
    mps.id AS match_player_stats_id,
    mps.player_id,
    mps.match_id,
    rc.current_rating AS old_rating,
    rc.computed_rating AS new_rating,
    rc.mins AS minutes_played,
    rc.m_factor AS minutes_factor;
END;
$$;

-- 3. Rebuild ratings for the current match
SELECT * FROM rebuild_match_ratings('c1c90315-9b15-4c6a-b249-b54463cd4203');
