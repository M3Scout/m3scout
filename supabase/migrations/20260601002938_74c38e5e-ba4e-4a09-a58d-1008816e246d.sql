CREATE OR REPLACE FUNCTION public.get_public_player_minutes_ranking(p_season_year integer)
RETURNS TABLE(player_id uuid, total_minutes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.player_id, SUM(s.minutes)::bigint AS total_minutes
  FROM public.unified_player_season_stats s
  JOIN public.public_players_safe p ON p.id = s.player_id
  WHERE s.season_year = p_season_year
  GROUP BY s.player_id
  HAVING SUM(s.minutes) > 0
  ORDER BY total_minutes DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_player_minutes_ranking(integer) TO anon, authenticated, service_role;