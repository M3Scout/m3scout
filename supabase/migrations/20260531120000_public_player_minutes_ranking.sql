-- Public function to rank players by minutes in a season.
-- SECURITY DEFINER bypasses RLS; only returns data for public, non-archived players.
-- Granted to anon so the home page carousel can order without authentication.

CREATE OR REPLACE FUNCTION public.get_public_player_minutes_ranking(p_season_year integer)
RETURNS TABLE (
  player_id     uuid,
  total_minutes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
ps AS (
  SELECT player_id, competition_id, is_live_correction,
         COALESCE(matches, 0) AS matches,
         COALESCE(minutes, 0) AS minutes
  FROM public.player_stats
  WHERE season_year = p_season_year
),
ms AS (
  SELECT player_id, competition_id,
         COALESCE(games,   0) AS matches,
         COALESCE(minutes, 0) AS minutes
  FROM public.manual_player_stats
  WHERE season_year = p_season_year
),
corrected AS (
  SELECT player_id, competition_id
  FROM public.player_stats
  WHERE season_year = p_season_year AND is_live_correction = true
),
live AS (
  SELECT mp.player_id, m.competition_id,
         COUNT(DISTINCT mp.match_id)::integer         AS matches,
         SUM(COALESCE(mp.minutes_played, 0))::integer AS minutes
  FROM public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
  WHERE m.season_year = p_season_year
    AND m.status = 'applied'
    AND COALESCE(mp.is_removed, false) = false
    AND COALESCE(mp.minutes_played, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM corrected c
      WHERE c.player_id = mp.player_id AND c.competition_id = m.competition_id
    )
  GROUP BY mp.player_id, m.competition_id
),
all_data AS (
  SELECT player_id, matches, minutes FROM ps
  UNION ALL
  SELECT player_id, matches, minutes FROM ms
  UNION ALL
  SELECT player_id, matches, minutes FROM live
)
SELECT a.player_id,
       COALESCE(SUM(a.minutes), 0)::integer AS total_minutes
FROM all_data a
JOIN public.players p ON p.id = a.player_id
WHERE (p.is_archived IS NULL OR p.is_archived = false)
  AND p.is_public = true
GROUP BY a.player_id
HAVING SUM(a.matches) > 0
ORDER BY total_minutes DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_player_minutes_ranking(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_player_minutes_ranking(integer) TO authenticated;
