-- Fix security definer view issue by explicitly setting SECURITY INVOKER
-- Drop and recreate with proper security setting
DROP VIEW IF EXISTS public.unified_player_season_stats;

CREATE VIEW public.unified_player_season_stats 
WITH (security_invoker = true)
AS
WITH 
-- Manual stats from player_stats table
manual_stats AS (
  SELECT 
    ps.player_id,
    ps.season_year,
    ps.competition_id,
    c.name AS competition_name,
    c.display_name AS competition_display_name,
    COALESCE(c.final_coefficient, 1.0) AS final_coefficient,
    ps.matches,
    ps.minutes,
    ps.goals,
    ps.assists,
    ps.yellow_cards,
    ps.red_cards,
    ps.tackles,
    ps.interceptions,
    ps.recoveries,
    ps.saves,
    ps.goals_conceded,
    ps.clean_sheets,
    ps.penalties_saved,
    ps.errors_leading_to_goal,
    ps.aerial_duels_won,
    ps.aerial_duels_total,
    ps.accurate_passes,
    ps.total_passes,
    ps.duels_won,
    ps.total_duels,
    ps.chances_created,
    ps.key_passes,
    ps.shots,
    ps.shots_on_target,
    ps.fouls_committed,
    ps.fouls_drawn,
    ps.successful_dribbles,
    ps.total_dribbles,
    ps.ground_duels_won,
    ps.ground_duels_total,
    'manual' AS data_source
  FROM public.player_stats ps
  LEFT JOIN public.competitions c ON c.id = ps.competition_id
  WHERE ps.minutes > 0
),

-- Live match stats aggregated from match_player_stats
live_stats AS (
  SELECT 
    mp.player_id,
    m.season_year,
    m.competition_id,
    c.name AS competition_name,
    c.display_name AS competition_display_name,
    COALESCE(c.final_coefficient, 1.0) AS final_coefficient,
    COUNT(DISTINCT m.id) AS matches,
    SUM(LEAST(COALESCE(mp.minutes_played, 0), 90)) AS minutes,
    SUM(COALESCE(mps.goals, 0)) AS goals,
    SUM(COALESCE(mps.assists, 0)) AS assists,
    SUM(COALESCE(mps.yellow_cards, 0)) AS yellow_cards,
    SUM(COALESCE(mps.red_cards, 0)) AS red_cards,
    SUM(COALESCE(mps.tackles, 0)) AS tackles,
    SUM(COALESCE(mps.interceptions, 0)) AS interceptions,
    SUM(COALESCE(mps.recoveries, 0)) AS recoveries,
    SUM(COALESCE(mps.saves, 0)) AS saves,
    SUM(COALESCE(mps.goals_conceded, 0)) AS goals_conceded,
    SUM(CASE WHEN COALESCE(mps.goals_conceded, 0) = 0 THEN 1 ELSE 0 END) AS clean_sheets,
    0 AS penalties_saved,
    0 AS errors_leading_to_goal,
    SUM(COALESCE(mps.aerial_duels_won, 0)) AS aerial_duels_won,
    SUM(COALESCE(mps.aerial_duels_total, 0)) AS aerial_duels_total,
    SUM(COALESCE(mps.passes_completed, 0)) AS accurate_passes,
    SUM(COALESCE(mps.passes_completed, 0) + COALESCE(mps.passes_total, 0)) AS total_passes,
    SUM(COALESCE(mps.duels_won, 0)) AS duels_won,
    SUM(COALESCE(mps.duels_total, 0)) AS total_duels,
    SUM(COALESCE(mps.chances_created, 0)) AS chances_created,
    SUM(COALESCE(mps.key_passes, 0)) AS key_passes,
    SUM(COALESCE(mps.shots, 0)) AS shots,
    SUM(COALESCE(mps.shots_on_target, 0)) AS shots_on_target,
    SUM(COALESCE(mps.fouls_committed, 0)) AS fouls_committed,
    SUM(COALESCE(mps.fouls_suffered, 0)) AS fouls_drawn,
    SUM(COALESCE(mps.dribbles_success, 0)) AS successful_dribbles,
    SUM(COALESCE(mps.dribbles_success, 0) + COALESCE(mps.dribbles_total, 0)) AS total_dribbles,
    SUM(COALESCE(mps.duels_won, 0) - COALESCE(mps.aerial_duels_won, 0)) AS ground_duels_won,
    SUM(COALESCE(mps.duels_total, 0) - COALESCE(mps.aerial_duels_total, 0)) AS ground_duels_total,
    'live' AS data_source
  FROM public.match_players mp
  INNER JOIN public.matches m ON m.id = mp.match_id
  LEFT JOIN public.match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
  LEFT JOIN public.competitions c ON c.id = m.competition_id
  WHERE mp.is_removed IS NOT TRUE
    AND m.status IN ('finished', 'applied')
    AND m.competition_id IS NOT NULL
    AND COALESCE(mp.minutes_played, 0) > 0
  GROUP BY 
    mp.player_id, 
    m.season_year, 
    m.competition_id,
    c.name,
    c.display_name,
    c.final_coefficient
),

-- Combine both sources, summing where overlap exists
combined AS (
  SELECT 
    COALESCE(m.player_id, l.player_id) AS player_id,
    COALESCE(m.season_year, l.season_year) AS season_year,
    COALESCE(m.competition_id, l.competition_id) AS competition_id,
    COALESCE(m.competition_display_name, m.competition_name, l.competition_display_name, l.competition_name, 'Sem competição') AS competition_name,
    COALESCE(m.final_coefficient, l.final_coefficient, 1.0) AS final_coefficient,
    COALESCE(m.matches, 0) + COALESCE(l.matches, 0) AS matches,
    COALESCE(m.minutes, 0) + COALESCE(l.minutes, 0) AS minutes,
    COALESCE(m.goals, 0) + COALESCE(l.goals, 0) AS goals,
    COALESCE(m.assists, 0) + COALESCE(l.assists, 0) AS assists,
    COALESCE(m.yellow_cards, 0) + COALESCE(l.yellow_cards, 0) AS yellow_cards,
    COALESCE(m.red_cards, 0) + COALESCE(l.red_cards, 0) AS red_cards,
    COALESCE(m.tackles, 0) + COALESCE(l.tackles, 0) AS tackles,
    COALESCE(m.interceptions, 0) + COALESCE(l.interceptions, 0) AS interceptions,
    COALESCE(m.recoveries, 0) + COALESCE(l.recoveries, 0) AS recoveries,
    COALESCE(m.saves, 0) + COALESCE(l.saves, 0) AS saves,
    COALESCE(m.goals_conceded, 0) + COALESCE(l.goals_conceded, 0) AS goals_conceded,
    COALESCE(m.clean_sheets, 0) + COALESCE(l.clean_sheets, 0) AS clean_sheets,
    COALESCE(m.penalties_saved, 0) + COALESCE(l.penalties_saved, 0) AS penalties_saved,
    COALESCE(m.errors_leading_to_goal, 0) + COALESCE(l.errors_leading_to_goal, 0) AS errors_leading_to_goal,
    COALESCE(m.aerial_duels_won, 0) + COALESCE(l.aerial_duels_won, 0) AS aerial_duels_won,
    COALESCE(m.aerial_duels_total, 0) + COALESCE(l.aerial_duels_total, 0) AS aerial_duels_total,
    COALESCE(m.accurate_passes, 0) + COALESCE(l.accurate_passes, 0) AS accurate_passes,
    COALESCE(m.total_passes, 0) + COALESCE(l.total_passes, 0) AS total_passes,
    COALESCE(m.duels_won, 0) + COALESCE(l.duels_won, 0) AS duels_won,
    COALESCE(m.total_duels, 0) + COALESCE(l.total_duels, 0) AS total_duels,
    COALESCE(m.chances_created, 0) + COALESCE(l.chances_created, 0) AS chances_created,
    COALESCE(m.key_passes, 0) + COALESCE(l.key_passes, 0) AS key_passes,
    COALESCE(m.shots, 0) + COALESCE(l.shots, 0) AS shots,
    COALESCE(m.shots_on_target, 0) + COALESCE(l.shots_on_target, 0) AS shots_on_target,
    COALESCE(m.fouls_committed, 0) + COALESCE(l.fouls_committed, 0) AS fouls_committed,
    COALESCE(m.fouls_drawn, 0) + COALESCE(l.fouls_drawn, 0) AS fouls_drawn,
    COALESCE(m.successful_dribbles, 0) + COALESCE(l.successful_dribbles, 0) AS successful_dribbles,
    COALESCE(m.total_dribbles, 0) + COALESCE(l.total_dribbles, 0) AS total_dribbles,
    COALESCE(m.ground_duels_won, 0) + COALESCE(l.ground_duels_won, 0) AS ground_duels_won,
    COALESCE(m.ground_duels_total, 0) + COALESCE(l.ground_duels_total, 0) AS ground_duels_total,
    CASE 
      WHEN m.data_source IS NOT NULL AND l.data_source IS NOT NULL THEN 'both'
      WHEN m.data_source IS NOT NULL THEN 'manual'
      ELSE 'live'
    END AS data_source
  FROM manual_stats m
  FULL OUTER JOIN live_stats l 
    ON m.player_id = l.player_id 
    AND m.season_year = l.season_year 
    AND m.competition_id = l.competition_id
)
SELECT * FROM combined;

-- Grant public read access to the view
GRANT SELECT ON public.unified_player_season_stats TO authenticated;
GRANT SELECT ON public.unified_player_season_stats TO anon;