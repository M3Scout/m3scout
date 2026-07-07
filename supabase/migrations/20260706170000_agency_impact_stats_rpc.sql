-- Agency-wide consolidated performance stats for the "Métricas Institucionais /
-- Impacto da Agência" panel on /dashboard/atletas.
--
-- IMPORTANT schema quirk (confirmed by direct data inspection, matching the
-- existing get_season_player_aggregates output naming "total_..._failed"):
-- player_stats.ground_duels_total and player_stats.aerial_duels_total (and
-- match_player_stats.aerial_duels_total) store the LOST count, not a true
-- attempted total — same convention as total_passes/total_dribbles (also
-- "failed" counts despite the name). True total = won + lost, derived here
-- explicitly instead of trusting the "_total" columns at face value.
--
-- Aggregates across the WHOLE roster (non-archived players only) instead of
-- grouping by player, and supports p_season_year = NULL to mean "all time".
-- All percentages are additionally clamped to [0, 100] as a safety net.

CREATE OR REPLACE FUNCTION public.get_agency_impact_stats(p_season_year integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
ps AS (
  SELECT
    player_id, competition_id, season_year,
    COALESCE(matches,             0) AS matches,
    COALESCE(minutes,             0) AS minutes,
    COALESCE(goals,               0) AS goals,
    COALESCE(assists,             0) AS assists,
    COALESCE(penalties_won,       0) AS penalties_won,
    COALESCE(accurate_passes,     0) AS accurate_passes,
    COALESCE(total_passes,        0) AS failed_passes,
    COALESCE(crosses_success,     0) AS crosses_success,
    COALESCE(crosses_failed,      0) AS crosses_failed,
    COALESCE(successful_dribbles, 0) AS successful_dribbles,
    COALESCE(total_dribbles,      0) AS failed_dribbles,
    COALESCE(ground_duels_won,    0) AS ground_duels_won,
    COALESCE(ground_duels_total,  0) AS ground_duels_lost,
    COALESCE(aerial_duels_won,    0) AS aerial_duels_won,
    COALESCE(aerial_duels_total,  0) AS aerial_duels_lost,
    COALESCE(shots,               0) AS shots,
    COALESCE(shots_on_target,     0) AS shots_on_target
  FROM public.player_stats
  WHERE p_season_year IS NULL OR season_year = p_season_year
),

ms AS (
  SELECT
    player_id, competition_id, season_year,
    COALESCE(games,            0) AS matches,
    COALESCE(minutes,          0) AS minutes,
    COALESCE(goals,            0) AS goals,
    COALESCE(assists,          0) AS assists,
    COALESCE(penalties_won,    0) AS penalties_won,
    COALESCE(passes_completed, 0) AS accurate_passes,
    COALESCE(passes_failed,    0) AS failed_passes,
    0 AS crosses_success,
    0 AS crosses_failed,
    COALESCE(dribbles_success, 0) AS successful_dribbles,
    COALESCE(dribbles_failed,  0) AS failed_dribbles,
    GREATEST(0, COALESCE(duels_won,0) - COALESCE(aerial_duels_won,0)) AS ground_duels_won,
    GREATEST(0, COALESCE(duels_lost,0) - COALESCE(aerial_duels_lost,0)) AS ground_duels_lost,
    COALESCE(aerial_duels_won,  0) AS aerial_duels_won,
    COALESCE(aerial_duels_lost, 0) AS aerial_duels_lost,
    COALESCE(shots,            0) AS shots,
    COALESCE(shots_on_target,  0) AS shots_on_target
  FROM public.manual_player_stats
  WHERE p_season_year IS NULL OR season_year = p_season_year
),

corrected AS (
  SELECT player_id, competition_id
  FROM public.player_stats
  WHERE (p_season_year IS NULL OR season_year = p_season_year)
    AND is_live_correction = true
),

live AS (
  SELECT
    mp.player_id, m.competition_id, m.season_year,
    COUNT(DISTINCT mp.match_id)::integer          AS matches,
    SUM(COALESCE(mp.minutes_played, 0))::integer  AS minutes,
    COALESCE(SUM(mps.goals),   0)::integer AS goals,
    COALESCE(SUM(mps.assists), 0)::integer AS assists,
    COALESCE(SUM(mps.penalties_won), 0)::integer AS penalties_won,
    COALESCE(SUM(mps.passes_completed), 0)::integer AS accurate_passes,
    COALESCE(SUM(mps.passes_total),     0)::integer AS failed_passes,
    0 AS crosses_success,
    0 AS crosses_failed,
    COALESCE(SUM(mps.dribbles_success), 0)::integer AS successful_dribbles,
    COALESCE(SUM(mps.dribbles_total),   0)::integer AS failed_dribbles,
    0 AS ground_duels_won,
    0 AS ground_duels_lost,
    COALESCE(SUM(mps.aerial_duels_won),   0)::integer AS aerial_duels_won,
    COALESCE(SUM(mps.aerial_duels_total), 0)::integer AS aerial_duels_lost,
    COALESCE(SUM(mps.shots),           0)::integer AS shots,
    COALESCE(SUM(mps.shots_on_target), 0)::integer AS shots_on_target
  FROM public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
  LEFT JOIN public.match_player_stats mps
    ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
  WHERE m.status = 'applied'
    AND COALESCE(mp.is_removed, false) = false
    AND COALESCE(mp.minutes_played, 0) > 0
    AND (p_season_year IS NULL OR m.season_year = p_season_year)
    AND NOT EXISTS (
      SELECT 1 FROM corrected c
      WHERE c.player_id = mp.player_id AND c.competition_id = m.competition_id
    )
  GROUP BY mp.player_id, m.competition_id, m.season_year
),

all_data AS (
  SELECT * FROM ps
  UNION ALL
  SELECT * FROM ms
  UNION ALL
  SELECT * FROM live
),

-- Only count stats belonging to players still active in the roster.
roster_filtered AS (
  SELECT ad.*
  FROM all_data ad
  JOIN public.players p ON p.id = ad.player_id
  WHERE (p.is_archived IS NULL OR p.is_archived = false)
),

totals AS (
  SELECT
    COUNT(DISTINCT player_id) FILTER (WHERE matches > 0) AS active_players,
    COALESCE(SUM(matches),             0)::bigint AS total_matches,
    COALESCE(SUM(minutes),             0)::bigint AS total_minutes,
    COALESCE(SUM(goals),               0)::bigint AS total_goals,
    COALESCE(SUM(assists),             0)::bigint AS total_assists,
    COALESCE(SUM(penalties_won),       0)::bigint AS total_penalties_won,
    COALESCE(SUM(accurate_passes),     0)::bigint AS sum_accurate_passes,
    COALESCE(SUM(failed_passes),       0)::bigint AS sum_failed_passes,
    COALESCE(SUM(crosses_success),     0)::bigint AS sum_crosses_success,
    COALESCE(SUM(crosses_failed),      0)::bigint AS sum_crosses_failed,
    COALESCE(SUM(successful_dribbles), 0)::bigint AS sum_dribbles_success,
    COALESCE(SUM(failed_dribbles),     0)::bigint AS sum_dribbles_failed,
    COALESCE(SUM(ground_duels_won),    0)::bigint AS sum_ground_duels_won,
    COALESCE(SUM(ground_duels_lost),   0)::bigint AS sum_ground_duels_lost,
    COALESCE(SUM(aerial_duels_won),    0)::bigint AS sum_aerial_duels_won,
    COALESCE(SUM(aerial_duels_lost),   0)::bigint AS sum_aerial_duels_lost,
    COALESCE(SUM(shots),               0)::bigint AS sum_shots,
    COALESCE(SUM(shots_on_target),     0)::bigint AS sum_shots_on_target
  FROM roster_filtered
),

tier_breakdown AS (
  SELECT
    COALESCE(c.tier, 'Sem Tier') AS tier,
    SUM(rf.minutes)::bigint      AS minutes
  FROM roster_filtered rf
  LEFT JOIN public.competitions c ON c.id = rf.competition_id
  GROUP BY COALESCE(c.tier, 'Sem Tier')
  HAVING SUM(rf.minutes) > 0
),

-- Unfiltered by p_season_year on purpose — the year-tab list must always show
-- every season that has data, regardless of which one is currently selected.
available_years AS (
  SELECT season_year FROM public.player_stats WHERE season_year IS NOT NULL
  UNION
  SELECT season_year FROM public.manual_player_stats WHERE season_year IS NOT NULL
  UNION
  SELECT season_year FROM public.matches WHERE season_year IS NOT NULL
)

SELECT jsonb_build_object(
  'season_year',              p_season_year,
  'active_players',            t.active_players,
  'total_matches',             t.total_matches,
  'total_minutes',             t.total_minutes,
  'total_goals',               t.total_goals,
  'total_assists',              t.total_assists,
  'total_goal_participations', t.total_goals + t.total_assists,
  'total_penalties_won',       t.total_penalties_won,
  'pass_accuracy_pct',
    CASE WHEN (t.sum_accurate_passes + t.sum_failed_passes) > 0
      THEN LEAST(100, GREATEST(0, ROUND(100.0 * t.sum_accurate_passes / (t.sum_accurate_passes + t.sum_failed_passes), 1)))
      ELSE NULL END,
  'cross_accuracy_pct',
    CASE WHEN (t.sum_crosses_success + t.sum_crosses_failed) > 0
      THEN LEAST(100, GREATEST(0, ROUND(100.0 * t.sum_crosses_success / (t.sum_crosses_success + t.sum_crosses_failed), 1)))
      ELSE NULL END,
  'dribble_success_pct',
    CASE WHEN (t.sum_dribbles_success + t.sum_dribbles_failed) > 0
      THEN LEAST(100, GREATEST(0, ROUND(100.0 * t.sum_dribbles_success / (t.sum_dribbles_success + t.sum_dribbles_failed), 1)))
      ELSE NULL END,
  'ground_duel_win_pct',
    CASE WHEN (t.sum_ground_duels_won + t.sum_ground_duels_lost) > 0
      THEN LEAST(100, GREATEST(0, ROUND(100.0 * t.sum_ground_duels_won / (t.sum_ground_duels_won + t.sum_ground_duels_lost), 1)))
      ELSE NULL END,
  'aerial_duel_win_pct',
    CASE WHEN (t.sum_aerial_duels_won + t.sum_aerial_duels_lost) > 0
      THEN LEAST(100, GREATEST(0, ROUND(100.0 * t.sum_aerial_duels_won / (t.sum_aerial_duels_won + t.sum_aerial_duels_lost), 1)))
      ELSE NULL END,
  'shot_accuracy_pct',
    CASE WHEN t.sum_shots > 0
      THEN LEAST(100, GREATEST(0, ROUND(100.0 * t.sum_shots_on_target / t.sum_shots, 1)))
      ELSE NULL END,
  'tier_breakdown',   (SELECT COALESCE(jsonb_agg(jsonb_build_object('tier', tier, 'minutes', minutes) ORDER BY minutes DESC), '[]'::jsonb) FROM tier_breakdown),
  'available_years',  (SELECT COALESCE(jsonb_agg(season_year ORDER BY season_year DESC), '[]'::jsonb) FROM available_years)
)
FROM totals t;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_impact_stats(integer) TO authenticated;
