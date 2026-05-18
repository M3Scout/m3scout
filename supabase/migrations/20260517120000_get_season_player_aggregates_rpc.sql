-- RPC: get_season_player_aggregates
--
-- Returns one row per active player with all player_stats columns summed
-- across competitions for the requested season year.
-- Postgres does the GROUP BY aggregation; the frontend only applies
-- the insight threshold rules on the already-computed totals.

CREATE OR REPLACE FUNCTION public.get_season_player_aggregates(p_season_year integer)
RETURNS TABLE (
  player_id             uuid,
  full_name             text,
  slug                  text,
  total_matches         integer,
  total_minutes         integer,
  total_accurate_passes integer,
  total_failed_passes   integer,
  total_crosses_success integer,
  total_crosses_failed  integer,
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
  SELECT
    ps.player_id,
    p.full_name,
    p.slug,
    COALESCE(SUM(ps.matches),            0)::integer AS total_matches,
    COALESCE(SUM(ps.minutes),            0)::integer AS total_minutes,
    COALESCE(SUM(ps.accurate_passes),    0)::integer AS total_accurate_passes,
    COALESCE(SUM(ps.total_passes),       0)::integer AS total_failed_passes,
    COALESCE(SUM(ps.crosses_success),    0)::integer AS total_crosses_success,
    COALESCE(SUM(ps.crosses_failed),     0)::integer AS total_crosses_failed,
    COALESCE(SUM(ps.successful_dribbles),0)::integer AS total_dribbles_success,
    COALESCE(SUM(ps.total_dribbles),     0)::integer AS total_dribbles_failed,
    COALESCE(SUM(ps.ground_duels_won),   0)::integer AS total_ground_duels_won,
    COALESCE(SUM(ps.ground_duels_total), 0)::integer AS total_ground_duels_failed,
    COALESCE(SUM(ps.aerial_duels_won),   0)::integer AS total_aerial_duels_won,
    COALESCE(SUM(ps.aerial_duels_total), 0)::integer AS total_aerial_duels_failed
  FROM public.player_stats ps
  JOIN public.players p ON p.id = ps.player_id
  WHERE ps.season_year = p_season_year
    AND (p.is_archived IS NULL OR p.is_archived = false)
  GROUP BY ps.player_id, p.full_name, p.slug;
$$;

GRANT EXECUTE ON FUNCTION public.get_season_player_aggregates(integer) TO authenticated;
