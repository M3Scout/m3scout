CREATE OR REPLACE FUNCTION public.get_season_player_aggregates(target_year integer)
RETURNS TABLE (
  player_id uuid,
  season_year integer,
  competitions_count bigint,
  matches bigint,
  minutes bigint,
  goals bigint,
  assists bigint,
  yellow_cards bigint,
  red_cards bigint,
  tackles bigint,
  interceptions bigint,
  recoveries bigint,
  saves bigint,
  goals_conceded bigint,
  clean_sheets bigint,
  penalties_saved bigint,
  errors_leading_to_goal bigint,
  aerial_duels_won bigint,
  aerial_duels_total bigint,
  passes_completed bigint,
  passes_attempted bigint,
  accurate_passes bigint,
  total_passes bigint,
  duels_won bigint,
  total_duels bigint,
  chances_created bigint,
  key_passes bigint,
  shots bigint,
  shots_on_target bigint,
  fouls_committed bigint,
  fouls_drawn bigint,
  dribbles_completed bigint,
  dribbles_attempted bigint,
  successful_dribbles bigint,
  total_dribbles bigint,
  ground_duels_won bigint,
  ground_duels_total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.player_id,
    u.season_year,
    COUNT(DISTINCT u.competition_id) FILTER (WHERE u.competition_id IS NOT NULL) AS competitions_count,
    COALESCE(SUM(u.matches), 0)::bigint,
    COALESCE(SUM(u.minutes), 0)::bigint,
    COALESCE(SUM(u.goals), 0)::bigint,
    COALESCE(SUM(u.assists), 0)::bigint,
    COALESCE(SUM(u.yellow_cards), 0)::bigint,
    COALESCE(SUM(u.red_cards), 0)::bigint,
    COALESCE(SUM(u.tackles), 0)::bigint,
    COALESCE(SUM(u.interceptions), 0)::bigint,
    COALESCE(SUM(u.recoveries), 0)::bigint,
    COALESCE(SUM(u.saves), 0)::bigint,
    COALESCE(SUM(u.goals_conceded), 0)::bigint,
    COALESCE(SUM(u.clean_sheets), 0)::bigint,
    COALESCE(SUM(u.penalties_saved), 0)::bigint,
    COALESCE(SUM(u.errors_leading_to_goal), 0)::bigint,
    COALESCE(SUM(u.aerial_duels_won), 0)::bigint,
    COALESCE(SUM(u.aerial_duels_total), 0)::bigint,
    COALESCE(SUM(u.passes_completed), 0)::bigint,
    COALESCE(SUM(u.passes_attempted), 0)::bigint,
    COALESCE(SUM(u.accurate_passes), 0)::bigint,
    COALESCE(SUM(u.total_passes), 0)::bigint,
    COALESCE(SUM(u.duels_won), 0)::bigint,
    COALESCE(SUM(u.total_duels), 0)::bigint,
    COALESCE(SUM(u.chances_created), 0)::bigint,
    COALESCE(SUM(u.key_passes), 0)::bigint,
    COALESCE(SUM(u.shots), 0)::bigint,
    COALESCE(SUM(u.shots_on_target), 0)::bigint,
    COALESCE(SUM(u.fouls_committed), 0)::bigint,
    COALESCE(SUM(u.fouls_drawn), 0)::bigint,
    COALESCE(SUM(u.dribbles_completed), 0)::bigint,
    COALESCE(SUM(u.dribbles_attempted), 0)::bigint,
    COALESCE(SUM(u.successful_dribbles), 0)::bigint,
    COALESCE(SUM(u.total_dribbles), 0)::bigint,
    COALESCE(SUM(u.ground_duels_won), 0)::bigint,
    COALESCE(SUM(u.ground_duels_total), 0)::bigint
  FROM public.unified_player_season_stats u
  WHERE u.season_year = target_year
  GROUP BY u.player_id, u.season_year;
$$;

GRANT EXECUTE ON FUNCTION public.get_season_player_aggregates(integer) TO anon, authenticated;