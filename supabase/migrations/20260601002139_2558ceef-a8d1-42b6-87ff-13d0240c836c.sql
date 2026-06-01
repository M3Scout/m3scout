CREATE OR REPLACE FUNCTION public.get_competitions_usage(p_season_year integer)
RETURNS TABLE (
  id uuid,
  name text,
  tier text,
  final_coefficient numeric,
  usos bigint,
  jogadores bigint,
  ultimo_uso text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    year_start AS (SELECT make_date(p_season_year, 1, 1) AS d),
    next_year AS (SELECT make_date(p_season_year + 1, 1, 1) AS d),

    -- Scouting reports aggregated per competition (within season year)
    sr AS (
      SELECT
        competition_id,
        COUNT(*)::bigint AS cnt,
        MAX(match_date)::text AS last_date,
        array_agg(DISTINCT player_id) FILTER (WHERE player_id IS NOT NULL) AS player_ids
      FROM scouting_reports
      WHERE deleted_at IS NULL
        AND competition_id IS NOT NULL
        AND match_date >= (SELECT d FROM year_start)
        AND match_date <  (SELECT d FROM next_year)
      GROUP BY competition_id
    ),

    -- Matches (applied) aggregated per competition
    mt AS (
      SELECT
        competition_id,
        COUNT(*)::bigint AS cnt,
        MAX(match_date)::text AS last_date,
        array_agg(id) AS match_ids
      FROM matches
      WHERE status = 'applied'
        AND competition_id IS NOT NULL
        AND season_year = p_season_year
      GROUP BY competition_id
    ),

    -- Players that participated in matches per competition
    mp AS (
      SELECT
        m.competition_id,
        array_agg(DISTINCT mp.player_id) AS player_ids
      FROM match_players mp
      JOIN matches m ON m.id = mp.match_id
      WHERE m.status = 'applied'
        AND m.competition_id IS NOT NULL
        AND m.season_year = p_season_year
        AND COALESCE(mp.is_removed, false) = false
      GROUP BY m.competition_id
    ),

    -- Manual player stats per competition
    ms AS (
      SELECT
        competition_id,
        COUNT(*)::bigint AS cnt,
        array_agg(DISTINCT player_id) AS player_ids
      FROM manual_player_stats
      WHERE competition_id IS NOT NULL
        AND season_year = p_season_year
        AND games > 0
      GROUP BY competition_id
    ),

    -- Legacy player_stats per competition (additive entries)
    ps AS (
      SELECT
        competition_id,
        COUNT(*)::bigint AS cnt,
        array_agg(DISTINCT player_id) AS player_ids
      FROM player_stats
      WHERE competition_id IS NOT NULL
        AND season_year = p_season_year
        AND COALESCE(is_archived, false) = false
        AND matches > 0
      GROUP BY competition_id
    )

  SELECT
    c.id,
    COALESCE(c.display_name, c.name) AS name,
    c.tier,
    c.final_coefficient,
    (COALESCE(sr.cnt,0) + COALESCE(mt.cnt,0) + COALESCE(ms.cnt,0) + COALESCE(ps.cnt,0))::bigint AS usos,
    (
      SELECT COUNT(DISTINCT pid)::bigint
      FROM unnest(
        COALESCE(sr.player_ids, ARRAY[]::uuid[])
        || COALESCE(mp.player_ids, ARRAY[]::uuid[])
        || COALESCE(ms.player_ids, ARRAY[]::uuid[])
        || COALESCE(ps.player_ids, ARRAY[]::uuid[])
      ) AS t(pid)
      WHERE pid IS NOT NULL
    ) AS jogadores,
    GREATEST(COALESCE(sr.last_date, ''), COALESCE(mt.last_date, '')) AS ultimo_uso
  FROM competitions c
  LEFT JOIN sr ON sr.competition_id = c.id
  LEFT JOIN mt ON mt.competition_id = c.id
  LEFT JOIN mp ON mp.competition_id = c.id
  LEFT JOIN ms ON ms.competition_id = c.id
  LEFT JOIN ps ON ps.competition_id = c.id
  WHERE c.is_active = true
    AND (COALESCE(sr.cnt,0) + COALESCE(mt.cnt,0) + COALESCE(ms.cnt,0) + COALESCE(ps.cnt,0)) > 0
  ORDER BY ultimo_uso DESC NULLS LAST, usos DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_competitions_usage(integer) TO anon, authenticated, service_role;