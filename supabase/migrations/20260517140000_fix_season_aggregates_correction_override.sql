-- Fix get_season_player_aggregates: apply correct override semantics for is_live_correction.
--
-- Previous version included ALL player_stats rows (both correction rows AND regular
-- additive rows) for the same competition, which caused double-counting when both
-- a stale non-correction row and a is_live_correction row existed.
--
-- Correct logic (mirrors mergeSeasonRows on the frontend):
--   • (player, season, competition) has is_live_correction=true  →  use ONLY that row;
--     suppress other player_stats rows AND raw LIVE match data for that competition.
--   • No correction exists for that competition                  →  sum all player_stats
--     rows additively with LIVE match data.
--   • manual_player_stats are always additive (separate table, no correction concept).

CREATE OR REPLACE FUNCTION public.get_season_player_aggregates(p_season_year integer)
RETURNS TABLE (
  player_id              uuid,
  full_name              text,
  slug                   text,
  total_matches          integer,
  total_minutes          integer,
  total_accurate_passes  integer,
  total_failed_passes    integer,
  total_crosses_success  integer,
  total_crosses_failed   integer,
  total_dribbles_success integer,
  total_dribbles_failed  integer,
  total_ground_duels_won    integer,
  total_ground_duels_failed integer,
  total_aerial_duels_won    integer,
  total_aerial_duels_failed integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
-- Competitions that have a live-correction (governs override semantics below)
corrected AS (
  SELECT player_id, competition_id
  FROM public.player_stats
  WHERE season_year = p_season_year
    AND is_live_correction = true
),

-- 1. player_stats rows — override semantics:
--    • Corrected competition: keep ONLY the is_live_correction row.
--    • Other competitions:    keep all rows (additive with LIVE).
ps AS (
  SELECT
    player_id,
    competition_id,
    is_live_correction,
    COALESCE(matches,            0) AS matches,
    COALESCE(minutes,            0) AS minutes,
    COALESCE(accurate_passes,    0) AS accurate_passes,
    COALESCE(total_passes,       0) AS total_passes,
    COALESCE(crosses_success,    0) AS crosses_success,
    COALESCE(crosses_failed,     0) AS crosses_failed,
    COALESCE(successful_dribbles,0) AS successful_dribbles,
    COALESCE(total_dribbles,     0) AS total_dribbles,
    COALESCE(ground_duels_won,   0) AS ground_duels_won,
    COALESCE(ground_duels_total, 0) AS ground_duels_total,
    COALESCE(aerial_duels_won,   0) AS aerial_duels_won,
    COALESCE(aerial_duels_total, 0) AS aerial_duels_total
  FROM public.player_stats
  WHERE season_year = p_season_year
    AND (
      -- Always keep correction rows
      is_live_correction = true
      OR
      -- Keep non-correction rows only when no correction exists for this competition
      NOT EXISTS (
        SELECT 1 FROM corrected c
        WHERE c.player_id = player_stats.player_id
          AND c.competition_id = player_stats.competition_id
      )
    )
),

-- 2. manual_player_stats rows (external games — always additive)
ms AS (
  SELECT
    player_id,
    competition_id,
    COALESCE(games,  0)                                                    AS matches,
    COALESCE(minutes,0)                                                    AS minutes,
    COALESCE(passes_completed, 0)                                          AS accurate_passes,
    COALESCE(passes_failed,    0)                                          AS total_passes,
    0                                                                      AS crosses_success,
    0                                                                      AS crosses_failed,
    COALESCE(dribbles_success, 0)                                          AS successful_dribbles,
    COALESCE(dribbles_failed,  0)                                          AS total_dribbles,
    GREATEST(0, COALESCE(duels_won,0) - COALESCE(aerial_duels_won,0))     AS ground_duels_won,
    GREATEST(0, COALESCE(duels_won,0)  + COALESCE(duels_lost,0)
               - COALESCE(aerial_duels_won,0) - COALESCE(aerial_duels_lost,0))
                                                                           AS ground_duels_total,
    COALESCE(aerial_duels_won,  0)                                         AS aerial_duels_won,
    COALESCE(aerial_duels_won,0) + COALESCE(aerial_duels_lost,0)          AS aerial_duels_total
  FROM public.manual_player_stats
  WHERE season_year = p_season_year
),

-- 3. LIVE match data — suppressed for competitions that have a correction
live AS (
  SELECT
    mp.player_id,
    m.competition_id,
    COUNT(DISTINCT mp.match_id)::integer          AS matches,
    SUM(COALESCE(mp.minutes_played, 0))::integer  AS minutes,
    0 AS accurate_passes,   0 AS total_passes,
    0 AS crosses_success,   0 AS crosses_failed,
    0 AS successful_dribbles, 0 AS total_dribbles,
    0 AS ground_duels_won,  0 AS ground_duels_total,
    0 AS aerial_duels_won,  0 AS aerial_duels_total
  FROM public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
  WHERE m.season_year = p_season_year
    AND m.status = 'applied'
    AND COALESCE(mp.is_removed, false) = false
    AND COALESCE(mp.minutes_played, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM corrected c
      WHERE c.player_id = mp.player_id
        AND c.competition_id = m.competition_id
    )
  GROUP BY mp.player_id, m.competition_id
),

-- Union all sources
all_data AS (
  SELECT player_id, competition_id, matches, minutes,
         accurate_passes, total_passes, crosses_success, crosses_failed,
         successful_dribbles, total_dribbles,
         ground_duels_won, ground_duels_total, aerial_duels_won, aerial_duels_total
  FROM ps
  UNION ALL
  SELECT player_id, competition_id, matches, minutes,
         accurate_passes, total_passes, crosses_success, crosses_failed,
         successful_dribbles, total_dribbles,
         ground_duels_won, ground_duels_total, aerial_duels_won, aerial_duels_total
  FROM ms
  UNION ALL
  SELECT player_id, competition_id, matches, minutes,
         accurate_passes, total_passes, crosses_success, crosses_failed,
         successful_dribbles, total_dribbles,
         ground_duels_won, ground_duels_total, aerial_duels_won, aerial_duels_total
  FROM live
)

SELECT
  a.player_id,
  p.full_name,
  p.slug,
  COALESCE(SUM(a.matches),             0)::integer AS total_matches,
  COALESCE(SUM(a.minutes),             0)::integer AS total_minutes,
  COALESCE(SUM(a.accurate_passes),     0)::integer AS total_accurate_passes,
  COALESCE(SUM(a.total_passes),        0)::integer AS total_failed_passes,
  COALESCE(SUM(a.crosses_success),     0)::integer AS total_crosses_success,
  COALESCE(SUM(a.crosses_failed),      0)::integer AS total_crosses_failed,
  COALESCE(SUM(a.successful_dribbles), 0)::integer AS total_dribbles_success,
  COALESCE(SUM(a.total_dribbles),      0)::integer AS total_dribbles_failed,
  COALESCE(SUM(a.ground_duels_won),    0)::integer AS total_ground_duels_won,
  COALESCE(SUM(a.ground_duels_total),  0)::integer AS total_ground_duels_failed,
  COALESCE(SUM(a.aerial_duels_won),    0)::integer AS total_aerial_duels_won,
  COALESCE(SUM(a.aerial_duels_total),  0)::integer AS total_aerial_duels_failed
FROM all_data a
JOIN public.players p ON p.id = a.player_id
WHERE (p.is_archived IS NULL OR p.is_archived = false)
GROUP BY a.player_id, p.full_name, p.slug
HAVING SUM(a.matches) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_season_player_aggregates(integer) TO authenticated;
