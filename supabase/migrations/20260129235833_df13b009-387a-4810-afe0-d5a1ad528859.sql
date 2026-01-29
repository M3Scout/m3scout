-- Update unified_player_season_stats view to exclude archived records from player_stats
-- This ensures archived ghost records don't appear in profile aggregations

DROP VIEW IF EXISTS public.unified_player_season_stats;

CREATE OR REPLACE VIEW public.unified_player_season_stats
WITH (security_invoker = true)
AS
WITH live_stats AS (
  SELECT
    mp.player_id,
    m.season_year,
    m.competition_id,
    c.final_coefficient,
    c.name AS competition_name,
    COUNT(DISTINCT mp.match_id) AS matches,
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
    0 AS clean_sheets,
    0 AS penalties_saved,
    0 AS errors_leading_to_goal,
    SUM(COALESCE(mps.aerial_duels_won, 0)) AS aerial_duels_won,
    SUM(COALESCE(mps.aerial_duels_total, 0)) AS aerial_duels_total,
    SUM(COALESCE(mps.passes_completed, 0)) AS accurate_passes,
    SUM(COALESCE(mps.passes_completed, 0) + COALESCE(mps.passes_total, 0)) AS total_passes,
    SUM(COALESCE(mps.duels_won, 0)) AS duels_won,
    SUM(COALESCE(mps.duels_total, 0) + COALESCE(mps.duels_won, 0)) AS total_duels,
    SUM(COALESCE(mps.chances_created, 0)) AS chances_created,
    SUM(COALESCE(mps.key_passes, 0)) AS key_passes,
    SUM(COALESCE(mps.shots, 0)) AS shots,
    SUM(COALESCE(mps.shots_on_target, 0)) AS shots_on_target,
    SUM(COALESCE(mps.fouls_committed, 0)) AS fouls_committed,
    SUM(COALESCE(mps.fouls_suffered, 0)) AS fouls_drawn,
    SUM(COALESCE(mps.dribbles_success, 0)) AS successful_dribbles,
    SUM(COALESCE(mps.dribbles_total, 0) + COALESCE(mps.dribbles_success, 0)) AS total_dribbles,
    0 AS ground_duels_won,
    0 AS ground_duels_total,
    'live' AS data_source
  FROM match_players mp
  INNER JOIN matches m ON m.id = mp.match_id
  LEFT JOIN match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
  LEFT JOIN competitions c ON c.id = m.competition_id
  WHERE m.status IN ('finished', 'applied')
    AND COALESCE(mp.is_removed, false) = false
    AND m.competition_id IS NOT NULL
  GROUP BY mp.player_id, m.season_year, m.competition_id, c.final_coefficient, c.name
),
manual_stats AS (
  SELECT
    mps.player_id,
    mps.season_year,
    mps.competition_id,
    c.final_coefficient,
    c.name AS competition_name,
    mps.games AS matches,
    mps.minutes,
    mps.goals,
    mps.assists,
    mps.yellow_cards,
    mps.red_cards,
    mps.tackles,
    mps.interceptions,
    mps.recoveries,
    mps.saves,
    mps.goals_conceded,
    mps.clean_sheets,
    mps.penalties_saved,
    0 AS errors_leading_to_goal,
    mps.aerial_duels_won,
    mps.aerial_duels_won + mps.aerial_duels_lost AS aerial_duels_total,
    mps.passes_completed AS accurate_passes,
    mps.passes_completed + mps.passes_failed AS total_passes,
    mps.duels_won,
    mps.duels_won + mps.duels_lost AS total_duels,
    mps.chances_created,
    mps.key_passes,
    mps.shots,
    mps.shots_on_target,
    mps.fouls_committed,
    mps.fouls_suffered AS fouls_drawn,
    mps.dribbles_success AS successful_dribbles,
    mps.dribbles_success + mps.dribbles_failed AS total_dribbles,
    0 AS ground_duels_won,
    0 AS ground_duels_total,
    'manual' AS data_source
  FROM manual_player_stats mps
  LEFT JOIN competitions c ON c.id = mps.competition_id
  WHERE mps.competition_id IS NOT NULL
    AND mps.games > 0
)
SELECT
  COALESCE(l.player_id, m.player_id) AS player_id,
  COALESCE(l.season_year, m.season_year) AS season_year,
  COALESCE(l.competition_id, m.competition_id) AS competition_id,
  COALESCE(l.final_coefficient, m.final_coefficient) AS final_coefficient,
  COALESCE(l.competition_name, m.competition_name) AS competition_name,
  COALESCE(l.matches, m.matches) AS matches,
  COALESCE(l.minutes, m.minutes) AS minutes,
  COALESCE(l.goals, m.goals) AS goals,
  COALESCE(l.assists, m.assists) AS assists,
  COALESCE(l.yellow_cards, m.yellow_cards) AS yellow_cards,
  COALESCE(l.red_cards, m.red_cards) AS red_cards,
  COALESCE(l.tackles, m.tackles) AS tackles,
  COALESCE(l.interceptions, m.interceptions) AS interceptions,
  COALESCE(l.recoveries, m.recoveries) AS recoveries,
  COALESCE(l.saves, m.saves) AS saves,
  COALESCE(l.goals_conceded, m.goals_conceded) AS goals_conceded,
  COALESCE(l.clean_sheets, m.clean_sheets) AS clean_sheets,
  COALESCE(l.penalties_saved, m.penalties_saved)::integer AS penalties_saved,
  COALESCE(l.errors_leading_to_goal, m.errors_leading_to_goal)::integer AS errors_leading_to_goal,
  COALESCE(l.aerial_duels_won, m.aerial_duels_won) AS aerial_duels_won,
  COALESCE(l.aerial_duels_total, m.aerial_duels_total) AS aerial_duels_total,
  COALESCE(l.accurate_passes, m.accurate_passes) AS accurate_passes,
  COALESCE(l.total_passes, m.total_passes) AS total_passes,
  COALESCE(l.duels_won, m.duels_won) AS duels_won,
  COALESCE(l.total_duels, m.total_duels) AS total_duels,
  COALESCE(l.chances_created, m.chances_created) AS chances_created,
  COALESCE(l.key_passes, m.key_passes) AS key_passes,
  COALESCE(l.shots, m.shots) AS shots,
  COALESCE(l.shots_on_target, m.shots_on_target) AS shots_on_target,
  COALESCE(l.fouls_committed, m.fouls_committed) AS fouls_committed,
  COALESCE(l.fouls_drawn, m.fouls_drawn) AS fouls_drawn,
  COALESCE(l.successful_dribbles, m.successful_dribbles) AS successful_dribbles,
  COALESCE(l.total_dribbles, m.total_dribbles) AS total_dribbles,
  COALESCE(l.ground_duels_won, m.ground_duels_won) AS ground_duels_won,
  COALESCE(l.ground_duels_total, m.ground_duels_total) AS ground_duels_total,
  CASE 
    WHEN l.player_id IS NOT NULL AND m.player_id IS NOT NULL THEN 'both'
    WHEN l.player_id IS NOT NULL THEN 'live'
    ELSE 'manual'
  END AS data_source
FROM live_stats l
FULL OUTER JOIN manual_stats m 
  ON l.player_id = m.player_id 
  AND l.season_year = m.season_year 
  AND l.competition_id = m.competition_id;