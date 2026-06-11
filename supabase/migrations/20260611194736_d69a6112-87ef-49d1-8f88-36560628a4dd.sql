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
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_rating CONSTANT numeric := 6.5;
  v_min_rating  CONSTANT numeric := 3.0;
  v_max_rating  CONSTANT numeric := 10.0;
  v_min_minutes CONSTANT integer := 15;
  v_gk_saves_cap CONSTANT numeric := 1.50;
BEGIN
  RETURN QUERY
  WITH match_data AS (
    SELECT
      mps.id,
      mps.player_id,
      mps.match_id,
      mps.rating AS current_rating,
      CASE
        WHEN mp.minutes_played IS NOT NULL AND mp.minutes_played > 0 THEN LEAST(mp.minutes_played, 90)
        WHEN mp.started = true AND mp.exited_minute IS NOT NULL THEN LEAST(mp.exited_minute, 90)
        WHEN mp.started = true AND mp.exited_minute IS NULL THEN 90
        WHEN mp.entered_minute IS NOT NULL AND mp.exited_minute IS NOT NULL THEN LEAST(GREATEST(mp.exited_minute - mp.entered_minute, 1), 90)
        WHEN mp.entered_minute IS NOT NULL AND mp.exited_minute IS NULL THEN LEAST(GREATEST(90 - mp.entered_minute, 1), 90)
        ELSE 0
      END AS mins,
      LOWER(COALESCE(p.position, '')) AS pos,
      COALESCE(mps.goals, 0)::numeric AS goals,
      COALESCE(mps.assists, 0)::numeric AS assists,
      COALESCE(mps.penalties_won, 0)::numeric AS penalties_won,
      COALESCE(mps.chances_created, 0)::numeric AS chances_created,
      COALESCE(mps.shots_on_post, 0)::numeric AS shots_on_post,
      COALESCE(mps.shots_on_target, 0)::numeric AS shots_on_target,
      COALESCE(mps.shots, 0)::numeric AS shots,
      COALESCE(mps.key_passes, 0)::numeric AS key_passes,
      COALESCE(mps.dribbles_success, 0)::numeric AS dribbles_success,
      COALESCE(mps.dribbles_total, 0)::numeric AS dribbles_total,
      COALESCE(mps.fouls_suffered, 0)::numeric AS fouls_suffered,
      COALESCE(mps.crosses_success, 0)::numeric AS crosses_success,
      COALESCE(mps.crosses_failed, 0)::numeric AS crosses_failed,
      COALESCE(mps.possession_lost, 0)::numeric AS possession_lost,
      COALESCE(mps.passes_completed, 0)::numeric AS passes_completed,
      COALESCE(mps.passes_total, 0)::numeric AS passes_total,
      COALESCE(mps.progressive_passes, 0)::numeric AS progressive_passes,
      COALESCE(mps.tackles, 0)::numeric AS tackles,
      COALESCE(mps.interceptions, 0)::numeric AS interceptions,
      COALESCE(mps.clearances, 0)::numeric AS clearances,
      COALESCE(mps.shots_blocked, 0)::numeric AS shots_blocked,
      COALESCE(mps.steals, 0)::numeric AS steals,
      COALESCE(mps.duels_won, 0)::numeric AS duels_won,
      COALESCE(mps.duels_total, 0)::numeric AS duels_total,
      COALESCE(mps.aerial_duels_won, 0)::numeric AS aerial_duels_won,
      COALESCE(mps.aerial_duels_total, 0)::numeric AS aerial_duels_total,
      COALESCE(mps.fouls_committed, 0)::numeric AS fouls_committed,
      COALESCE(mps.was_dribbled, 0)::numeric AS was_dribbled,
      COALESCE(mps.yellow_cards, 0)::numeric AS yellow_cards,
      COALESCE(mps.red_cards, 0)::numeric AS red_cards,
      COALESCE(mps.saves, 0)::numeric AS saves,
      COALESCE(mps.goals_conceded, 0)::numeric AS goals_conceded
    FROM public.match_player_stats mps
    JOIN public.match_players mp ON mp.match_id = mps.match_id AND mp.player_id = mps.player_id
    JOIN public.players p ON p.id = mps.player_id
    JOIN public.matches m ON m.id = mps.match_id
    WHERE (p_match_id IS NULL OR mps.match_id = p_match_id)
      AND (p_match_id IS NOT NULL OR m.status IN ('applied', 'finished'))
      AND COALESCE(mp.is_removed, false) = false
  ),
  calculated AS (
    SELECT
      md.*,
      (md.pos IN ('gk', 'goleiro', 'goalkeeper')) AS is_gk,
      (md.goals > 0 OR md.assists > 0 OR md.red_cards > 0 OR md.penalties_won > 0) AS has_high_impact,
      (md.goals * 1.20) +
      (md.assists * 0.80) +
      (md.penalties_won * 0.50) +
      (md.chances_created * 0.50) +
      (md.shots_on_post * 0.20) +
      (md.shots_on_target * 0.10) +
      (md.shots * -0.05) AS attack_raw,
      (md.key_passes * 0.15) +
      (md.dribbles_success * 0.10) +
      (md.fouls_suffered * 0.05) +
      (md.crosses_success * 0.02) +
      (md.possession_lost * -0.05) +
      (md.dribbles_total * -0.05) +
      (md.crosses_failed * -0.02) AS creation_raw,
      (md.passes_completed * 0.02) +
      (md.passes_total * -0.02) +
      (md.progressive_passes * 0.05) AS passing_raw,
      (md.tackles * 0.10) +
      (md.interceptions * 0.08) +
      (md.clearances * 0.04) +
      (md.shots_blocked * 0.08) +
      (md.steals * 0.12) +
      (GREATEST(0, md.duels_won - md.aerial_duels_won) * 0.05) +
      (GREATEST(0, (md.duels_total - md.duels_won) - (md.aerial_duels_total - md.aerial_duels_won)) * -0.05) +
      (md.aerial_duels_won * 0.05) +
      (GREATEST(0, md.aerial_duels_total - md.aerial_duels_won) * -0.05) +
      (md.fouls_committed * -0.05) +
      (md.was_dribbled * -0.15) AS defense_raw,
      (md.yellow_cards * -0.40) +
      (md.red_cards * -1.50) AS discipline_raw,
      LEAST((md.saves * 0.18), v_gk_saves_cap) +
      (md.goals_conceded * -0.35) AS gk_raw
    FROM match_data md
  ),
  rating_computed AS (
    SELECT
      c.*,
      CASE WHEN c.is_gk THEN
        c.gk_raw + c.passing_raw + c.discipline_raw
      ELSE
        c.attack_raw + c.creation_raw + c.passing_raw + c.defense_raw + c.discipline_raw
      END AS raw_impact,
      CASE
        WHEN c.mins <= 0 THEN NULL::numeric
        WHEN c.mins < v_min_minutes AND NOT c.has_high_impact THEN NULL::numeric
        ELSE ROUND(
          LEAST(
            GREATEST(
              v_base_rating + CASE WHEN c.is_gk THEN
                c.gk_raw + c.passing_raw + c.discipline_raw
              ELSE
                c.attack_raw + c.creation_raw + c.passing_raw + c.defense_raw + c.discipline_raw
              END,
              v_min_rating
            ),
            v_max_rating
          ),
          1
        )
      END AS computed_rating
    FROM calculated c
  )
  UPDATE public.match_player_stats mps
  SET
    rating = rc.computed_rating,
    rating_minutes_played = rc.mins,
    rating_minutes_factor = 1.0,
    rating_computed_at = now(),
    rating_engine_version = 'v3.0-sql-rebuild',
    rating_breakdown = CASE WHEN rc.computed_rating IS NOT NULL THEN
      jsonb_build_object(
        'engineVersion', 'v3.0-sql-rebuild',
        'baseRating', v_base_rating,
        'minutesPlayed', rc.mins,
        'minutesFactor', 1.0,
        'rawImpact', ROUND(rc.raw_impact, 2),
        'impactAfterMinutes', ROUND(rc.raw_impact, 2),
        'isGoalkeeper', rc.is_gk,
        'hasImpact', rc.has_high_impact,
        'hasImpactfulAction', rc.has_high_impact,
        'antiInflationApplied', false,
        'categories', jsonb_build_object(
          'attack', jsonb_build_object('value', ROUND(rc.attack_raw, 2), 'label', 'Ataque'),
          'creation', jsonb_build_object('value', ROUND(rc.creation_raw, 2), 'label', 'Criação/Dribles'),
          'passing', jsonb_build_object('value', ROUND(rc.passing_raw, 2), 'label', 'Passes'),
          'defense', jsonb_build_object('value', ROUND(rc.defense_raw, 2), 'label', 'Defesa'),
          'discipline', jsonb_build_object('value', ROUND(rc.discipline_raw, 2), 'label', 'Disciplina'),
          'goalkeeper', jsonb_build_object('value', ROUND(rc.gk_raw, 2), 'label', 'Goleiro')
        ),
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
    1.0::numeric AS minutes_factor;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rebuild_match_ratings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_match_ratings(uuid) TO service_role;

DO $$
BEGIN
  PERFORM * FROM public.rebuild_match_ratings(NULL);
END $$;