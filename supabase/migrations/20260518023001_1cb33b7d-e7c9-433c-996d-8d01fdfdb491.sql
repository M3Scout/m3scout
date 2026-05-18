DROP FUNCTION IF EXISTS public.get_season_player_aggregates(integer);

CREATE OR REPLACE FUNCTION public.get_season_player_aggregates(p_season_year integer)
RETURNS TABLE (
  player_id                 uuid,
  full_name                 text,
  slug                      text,
  total_matches             bigint,
  total_minutes             bigint,
  total_accurate_passes     bigint,
  total_failed_passes       bigint,
  total_crosses_success     bigint,
  total_crosses_failed      bigint,
  total_dribbles_success    bigint,
  total_dribbles_failed     bigint,
  total_ground_duels_won    bigint,
  total_ground_duels_failed bigint,
  total_aerial_duels_won    bigint,
  total_aerial_duels_failed bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  -- LIVE per (player, competition) for the season, excluding competitions that
  -- have a live_correction override row (the override replaces LIVE totals).
  live AS (
    SELECT
      mp.player_id,
      m.competition_id,
      COUNT(DISTINCT m.id)                              AS matches,
      COALESCE(SUM(mp.minutes_played), 0)               AS minutes,
      COALESCE(SUM(mps.passes_completed), 0)            AS accurate_passes,
      COALESCE(SUM(GREATEST(mps.passes_total - mps.passes_completed, 0)), 0) AS failed_passes,
      COALESCE(SUM(mps.crosses_success), 0)             AS crosses_success,
      COALESCE(SUM(mps.crosses_failed), 0)              AS crosses_failed,
      COALESCE(SUM(mps.dribbles_success), 0)            AS dribbles_success,
      COALESCE(SUM(GREATEST(mps.dribbles_total - mps.dribbles_success, 0)), 0) AS dribbles_failed,
      COALESCE(SUM(GREATEST(mps.duels_won - mps.aerial_duels_won, 0)), 0) AS ground_duels_won,
      COALESCE(SUM(GREATEST(
        (mps.duels_total - mps.aerial_duels_total) -
        (mps.duels_won   - mps.aerial_duels_won), 0)), 0) AS ground_duels_failed,
      COALESCE(SUM(mps.aerial_duels_won), 0)            AS aerial_duels_won,
      COALESCE(SUM(GREATEST(mps.aerial_duels_total - mps.aerial_duels_won, 0)), 0) AS aerial_duels_failed
    FROM public.matches m
    JOIN public.match_players mp
      ON mp.match_id = m.id AND COALESCE(mp.is_removed, false) = false
    LEFT JOIN public.match_player_stats mps
      ON mps.match_id = m.id AND mps.player_id = mp.player_id
    WHERE m.season_year = p_season_year
      AND NOT EXISTS (
        SELECT 1 FROM public.player_stats ps
        WHERE ps.player_id     = mp.player_id
          AND ps.season_year   = p_season_year
          AND ps.competition_id IS NOT DISTINCT FROM m.competition_id
          AND ps.is_live_correction = true
          AND COALESCE(ps.is_archived, false) = false
      )
    GROUP BY mp.player_id, m.competition_id
  ),
  -- Manual entries (additive)
  manual AS (
    SELECT
      mps.player_id,
      mps.competition_id,
      COALESCE(SUM(mps.games), 0)                AS matches,
      COALESCE(SUM(mps.minutes), 0)              AS minutes,
      COALESCE(SUM(mps.passes_completed), 0)     AS accurate_passes,
      COALESCE(SUM(mps.passes_failed), 0)        AS failed_passes,
      0::bigint                                   AS crosses_success,
      0::bigint                                   AS crosses_failed,
      COALESCE(SUM(mps.dribbles_success), 0)     AS dribbles_success,
      COALESCE(SUM(mps.dribbles_failed), 0)      AS dribbles_failed,
      COALESCE(SUM(GREATEST(mps.duels_won - mps.aerial_duels_won, 0)), 0) AS ground_duels_won,
      COALESCE(SUM(GREATEST(mps.duels_lost - mps.aerial_duels_lost, 0)), 0) AS ground_duels_failed,
      COALESCE(SUM(mps.aerial_duels_won), 0)     AS aerial_duels_won,
      COALESCE(SUM(mps.aerial_duels_lost), 0)    AS aerial_duels_failed
    FROM public.manual_player_stats mps
    WHERE mps.season_year = p_season_year
    GROUP BY mps.player_id, mps.competition_id
  ),
  -- player_stats rows (both live_correction overrides and additive manual entries).
  -- For overrides: they replace LIVE for that (player, comp) — included once.
  -- For non-corrections: additive on top.
  pstats AS (
    SELECT
      ps.player_id,
      ps.competition_id,
      COALESCE(SUM(ps.matches), 0)              AS matches,
      COALESCE(SUM(ps.minutes), 0)              AS minutes,
      COALESCE(SUM(ps.accurate_passes), 0)      AS accurate_passes,
      COALESCE(SUM(GREATEST(ps.total_passes - ps.accurate_passes, 0)), 0) AS failed_passes,
      COALESCE(SUM(ps.crosses_success), 0)      AS crosses_success,
      COALESCE(SUM(ps.crosses_failed), 0)       AS crosses_failed,
      COALESCE(SUM(ps.successful_dribbles), 0)  AS dribbles_success,
      COALESCE(SUM(GREATEST(ps.total_dribbles - ps.successful_dribbles, 0)), 0) AS dribbles_failed,
      COALESCE(SUM(ps.ground_duels_won), 0)     AS ground_duels_won,
      COALESCE(SUM(GREATEST(ps.ground_duels_total - ps.ground_duels_won, 0)), 0) AS ground_duels_failed,
      COALESCE(SUM(ps.aerial_duels_won), 0)     AS aerial_duels_won,
      COALESCE(SUM(GREATEST(ps.aerial_duels_total - ps.aerial_duels_won, 0)), 0) AS aerial_duels_failed
    FROM public.player_stats ps
    WHERE ps.season_year = p_season_year
      AND COALESCE(ps.is_archived, false) = false
    GROUP BY ps.player_id, ps.competition_id
  ),
  combined AS (
    SELECT * FROM live
    UNION ALL SELECT * FROM manual
    UNION ALL SELECT * FROM pstats
  ),
  totals AS (
    SELECT
      c.player_id,
      SUM(c.matches)::bigint              AS total_matches,
      SUM(c.minutes)::bigint              AS total_minutes,
      SUM(c.accurate_passes)::bigint      AS total_accurate_passes,
      SUM(c.failed_passes)::bigint        AS total_failed_passes,
      SUM(c.crosses_success)::bigint      AS total_crosses_success,
      SUM(c.crosses_failed)::bigint       AS total_crosses_failed,
      SUM(c.dribbles_success)::bigint     AS total_dribbles_success,
      SUM(c.dribbles_failed)::bigint      AS total_dribbles_failed,
      SUM(c.ground_duels_won)::bigint     AS total_ground_duels_won,
      SUM(c.ground_duels_failed)::bigint  AS total_ground_duels_failed,
      SUM(c.aerial_duels_won)::bigint     AS total_aerial_duels_won,
      SUM(c.aerial_duels_failed)::bigint  AS total_aerial_duels_failed
    FROM combined c
    GROUP BY c.player_id
  )
  SELECT
    p.id                                AS player_id,
    p.full_name,
    p.slug,
    t.total_matches,
    t.total_minutes,
    t.total_accurate_passes,
    t.total_failed_passes,
    t.total_crosses_success,
    t.total_crosses_failed,
    t.total_dribbles_success,
    t.total_dribbles_failed,
    t.total_ground_duels_won,
    t.total_ground_duels_failed,
    t.total_aerial_duels_won,
    t.total_aerial_duels_failed
  FROM totals t
  JOIN public.players p ON p.id = t.player_id
  WHERE COALESCE(p.is_archived, false) = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_season_player_aggregates(integer) TO anon, authenticated;