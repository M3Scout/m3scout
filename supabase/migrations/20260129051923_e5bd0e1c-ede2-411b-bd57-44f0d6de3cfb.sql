-- ============================================================
-- REBUILD MATCH RATINGS FUNCTION (Single Source of Truth)
-- ============================================================
-- This function recalculates and persists the official rating for 
-- ALL players in a match (or all matches if match_id is null).
-- 
-- The rating is calculated using the Professional Scouting Engine v2.0
-- weights directly in SQL to match the frontend logic exactly.
-- ============================================================

-- Create function to calculate minutes factor (matches frontend logic)
CREATE OR REPLACE FUNCTION public.calculate_minutes_factor(minutes_played integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Professional Scouting Model minutes factor
  IF minutes_played < 30 THEN RETURN 0.6;
  ELSIF minutes_played < 60 THEN RETURN 0.8;
  ELSIF minutes_played < 80 THEN RETURN 0.9;
  ELSE RETURN 1.0;
  END IF;
END;
$$;

-- Create function to rebuild ratings for a match (or all matches)
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
      -- Get minutes from match_players
      COALESCE(mp.minutes_played, 0) AS mins,
      -- Player position for GK detection
      LOWER(p.position) AS pos,
      -- All stats from match_player_stats
      mps.goals, mps.assists, mps.shots_on_target, mps.shots,
      mps.dribbles_success, mps.dribbles_total, -- dribbles_total = failed count
      mps.key_passes, mps.chances_created,
      mps.crosses_success, mps.crosses_failed,
      mps.passes_completed, mps.passes_total, -- passes_total = failed count
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
      -- Determine if goalkeeper
      (md.pos IN ('gk', 'goleiro', 'goalkeeper')) AS is_gk,
      -- === ATTACK CALCULATION ===
      (md.goals * 0.80) + 
      LEAST(md.shots_on_target * 0.08, 0.40) -- capped at 0.40
      AS attack_raw,
      -- === CREATION CALCULATION ===
      (md.assists * 0.60) +
      (md.key_passes * 0.12) +
      (md.chances_created * 0.10) +
      LEAST(md.dribbles_success * 0.06, 0.30) + -- capped at 0.30
      (md.dribbles_total * -0.07) + -- dribbles_total = failed
      (md.crosses_success * 0.06) +
      (md.crosses_failed * -0.04) +
      (md.fouls_suffered * 0.04) +
      (md.possession_lost * -0.05)
      AS creation_raw,
      -- === PASSING CALCULATION ===
      LEAST(md.passes_completed * 0.005, 0.20) + -- capped at 0.20
      (md.passes_total * -0.03) -- passes_total = failed
      AS passing_raw,
      -- === DEFENSE CALCULATION ===
      (md.tackles * 0.12) +
      (md.interceptions * 0.10) +
      (md.clearances * 0.08) +
      (md.blocked_shots * 0.10) +
      (md.recoveries * 0.05) +
      -- Ground duels: won/lost
      (md.duels_won * 0.06) +
      ((md.duels_total - md.duels_won) * -0.06) +
      -- Aerial duels: won/lost
      (md.aerial_duels_won * 0.07) +
      ((md.aerial_duels_total - md.aerial_duels_won) * -0.07) +
      (md.fouls_committed * -0.04) +
      (md.was_dribbled * -0.10)
      AS defense_raw,
      -- === DISCIPLINE ===
      (md.yellow_cards * -0.20) +
      (md.red_cards * -0.80)
      AS discipline_raw,
      -- === GOALKEEPER ===
      (md.saves * 0.18) +
      (md.goals_conceded * -0.35)
      AS gk_raw
    FROM match_data md
  ),
  with_caps AS (
    SELECT 
      c.*,
      -- Apply offensive cap (max +1.0 for attack + creation + passing)
      CASE WHEN NOT c.is_gk THEN
        LEAST(c.attack_raw + c.creation_raw + c.passing_raw, v_offensive_cap)
      ELSE 0 END AS offensive_capped,
      -- Check for impactful action
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
      wc.defense_raw,
      wc.discipline_raw,
      wc.gk_raw,
      wc.passing_raw,
      -- Calculate raw impact
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
      -- Calculate final rating
      CASE 
        WHEN fc.mins <= 0 THEN NULL -- No rating for 0 minutes
        ELSE
          ROUND(
            LEAST(10.0, GREATEST(0.0,
              CASE 
                -- Apply anti-inflation cap for no-impact players
                WHEN NOT fc.is_gk AND NOT fc.has_impact 
                THEN LEAST(v_base_rating + (fc.raw_impact * fc.m_factor), v_max_no_impact)
                ELSE v_base_rating + (fc.raw_impact * fc.m_factor)
              END
            ))::numeric,
            1 -- Round to 1 decimal
          )
      END AS computed_rating
    FROM final_calc fc
  )
  -- Update and return
  UPDATE match_player_stats mps
  SET 
    rating = rc.computed_rating,
    rating_minutes_played = rc.mins,
    rating_minutes_factor = rc.m_factor,
    rating_computed_at = NOW(),
    rating_engine_version = 'matchRatingEngine_v2_sql'
  FROM rating_computed rc
  WHERE mps.id = rc.id
  RETURNING 
    mps.id,
    mps.player_id,
    mps.match_id,
    rc.current_rating,
    mps.rating,
    mps.rating_minutes_played::integer,
    mps.rating_minutes_factor;
END;
$$;

-- Grant execute to authenticated users (will be restricted by RLS and admin check)
GRANT EXECUTE ON FUNCTION public.rebuild_match_ratings TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_minutes_factor TO authenticated;