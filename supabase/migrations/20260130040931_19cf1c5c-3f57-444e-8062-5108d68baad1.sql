
-- Fix unified_player_season_stats to:
-- 1. Use player_field_presence for accurate minutes (when available)
-- 2. Calculate shots correctly as total finalizações

DROP VIEW IF EXISTS public.unified_player_season_stats;

CREATE VIEW public.unified_player_season_stats AS
WITH 
-- Calculate minutes from player_field_presence (accurate source)
presence_minutes AS (
  SELECT 
    pfp.player_id,
    m.season_year,
    m.competition_id,
    COUNT(DISTINCT pfp.match_id) as matches_count,
    SUM(
      LEAST(
        COALESCE(pfp.exited_at_seconds, 2700) - pfp.entered_at_seconds,
        2700  -- cap each period at 45 min
      )
    ) / 60.0 as total_minutes
  FROM player_field_presence pfp
  JOIN matches m ON m.id = pfp.match_id
  WHERE m.status IN ('finished', 'applied')
    AND m.competition_id IS NOT NULL
  GROUP BY pfp.player_id, m.season_year, m.competition_id
),
live_stats AS (
  SELECT 
    mp.player_id,
    m.season_year,
    m.competition_id,
    c.final_coefficient,
    c.name AS competition_name,
    count(DISTINCT mp.match_id) AS matches,
    -- Use presence minutes when available, fallback to match_players.minutes_played
    COALESCE(
      pm.total_minutes::bigint,
      sum(LEAST(COALESCE(mp.minutes_played, 0), 90))
    ) AS minutes,
    sum(COALESCE(mps.goals, 0)) AS goals,
    sum(COALESCE(mps.assists, 0)) AS assists,
    sum(COALESCE(mps.yellow_cards, 0)) AS yellow_cards,
    sum(COALESCE(mps.red_cards, 0)) AS red_cards,
    sum(COALESCE(mps.tackles, 0)) AS tackles,
    sum(COALESCE(mps.interceptions, 0)) AS interceptions,
    sum(COALESCE(mps.recoveries, 0)) AS recoveries,
    sum(COALESCE(mps.saves, 0)) AS saves,
    sum(COALESCE(mps.goals_conceded, 0)) AS goals_conceded,
    0::integer AS clean_sheets,
    0::integer AS penalties_saved,
    0::integer AS errors_leading_to_goal,
    sum(COALESCE(mps.aerial_duels_won, 0)) AS aerial_duels_won,
    sum(COALESCE(mps.aerial_duels_total, 0)) AS aerial_duels_total,
    sum(COALESCE(mps.passes_completed, 0)) AS accurate_passes,
    sum(COALESCE(mps.passes_total, 0)) AS total_passes,
    sum(COALESCE(mps.duels_won, 0)) AS duels_won,
    sum(COALESCE(mps.duels_total, 0)) AS total_duels,
    sum(COALESCE(mps.chances_created, 0)) AS chances_created,
    sum(COALESCE(mps.key_passes, 0)) AS key_passes,
    -- Total shots = shots (off-target) + shots_on_target + shots_blocked
    sum(COALESCE(mps.shots, 0) + COALESCE(mps.shots_on_target, 0) + COALESCE(mps.shots_blocked, 0)) AS shots,
    sum(COALESCE(mps.shots_on_target, 0)) AS shots_on_target,
    sum(COALESCE(mps.fouls_committed, 0)) AS fouls_committed,
    sum(COALESCE(mps.fouls_suffered, 0)) AS fouls_drawn,
    sum(COALESCE(mps.dribbles_success, 0)) AS successful_dribbles,
    sum(COALESCE(mps.dribbles_total, 0)) AS total_dribbles,
    0::integer AS ground_duels_won,
    0::integer AS ground_duels_total,
    'live'::text AS data_source
  FROM match_players mp
  JOIN matches m ON m.id = mp.match_id
  LEFT JOIN match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
  LEFT JOIN competitions c ON c.id = m.competition_id
  LEFT JOIN presence_minutes pm ON pm.player_id = mp.player_id 
    AND pm.season_year = m.season_year 
    AND pm.competition_id = m.competition_id
  WHERE m.status IN ('finished', 'applied')
    AND COALESCE(mp.is_removed, false) = false
    AND m.competition_id IS NOT NULL
  GROUP BY mp.player_id, m.season_year, m.competition_id, c.final_coefficient, c.name, pm.total_minutes
),
manual_stats AS (
  SELECT 
    ps.player_id,
    ps.season_year,
    ps.competition_id,
    c.final_coefficient,
    c.name AS competition_name,
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
    'manual'::text AS data_source
  FROM player_stats ps
  LEFT JOIN competitions c ON c.id = ps.competition_id
  WHERE COALESCE(ps.is_archived, false) = false
    AND ps.matches > 0
)
SELECT 
  COALESCE(l.player_id, m.player_id) AS player_id,
  COALESCE(l.season_year, m.season_year) AS season_year,
  COALESCE(l.competition_id, m.competition_id) AS competition_id,
  COALESCE(l.final_coefficient, m.final_coefficient) AS final_coefficient,
  COALESCE(l.competition_name, m.competition_name) AS competition_name,
  COALESCE(l.matches, m.matches::bigint) AS matches,
  COALESCE(l.minutes, m.minutes::bigint) AS minutes,
  COALESCE(l.goals, m.goals::bigint) AS goals,
  COALESCE(l.assists, m.assists::bigint) AS assists,
  COALESCE(l.yellow_cards, m.yellow_cards::bigint) AS yellow_cards,
  COALESCE(l.red_cards, m.red_cards::bigint) AS red_cards,
  COALESCE(l.tackles, m.tackles::bigint) AS tackles,
  COALESCE(l.interceptions, m.interceptions::bigint) AS interceptions,
  COALESCE(l.recoveries, m.recoveries::bigint) AS recoveries,
  COALESCE(l.saves, m.saves::bigint) AS saves,
  COALESCE(l.goals_conceded, m.goals_conceded::bigint) AS goals_conceded,
  COALESCE(l.clean_sheets, m.clean_sheets) AS clean_sheets,
  COALESCE(l.penalties_saved, m.penalties_saved) AS penalties_saved,
  COALESCE(l.errors_leading_to_goal, m.errors_leading_to_goal) AS errors_leading_to_goal,
  COALESCE(l.aerial_duels_won, m.aerial_duels_won::bigint) AS aerial_duels_won,
  COALESCE(l.aerial_duels_total, m.aerial_duels_total::bigint) AS aerial_duels_total,
  COALESCE(l.accurate_passes, m.accurate_passes::bigint) AS accurate_passes,
  COALESCE(l.total_passes, m.total_passes::bigint) AS total_passes,
  COALESCE(l.duels_won, m.duels_won::bigint) AS duels_won,
  COALESCE(l.total_duels, m.total_duels::bigint) AS total_duels,
  COALESCE(l.chances_created, m.chances_created::bigint) AS chances_created,
  COALESCE(l.key_passes, m.key_passes::bigint) AS key_passes,
  COALESCE(l.shots, m.shots::bigint) AS shots,
  COALESCE(l.shots_on_target, m.shots_on_target::bigint) AS shots_on_target,
  COALESCE(l.fouls_committed, m.fouls_committed::bigint) AS fouls_committed,
  COALESCE(l.fouls_drawn, m.fouls_drawn::bigint) AS fouls_drawn,
  COALESCE(l.successful_dribbles, m.successful_dribbles::bigint) AS successful_dribbles,
  COALESCE(l.total_dribbles, m.total_dribbles::bigint) AS total_dribbles,
  COALESCE(l.ground_duels_won, m.ground_duels_won) AS ground_duels_won,
  COALESCE(l.ground_duels_total, m.ground_duels_total) AS ground_duels_total,
  CASE
    WHEN l.player_id IS NOT NULL AND m.player_id IS NOT NULL THEN 'both'::text
    WHEN l.player_id IS NOT NULL THEN 'live'::text
    ELSE 'manual'::text
  END AS data_source
FROM live_stats l
FULL JOIN manual_stats m 
  ON l.player_id = m.player_id 
  AND l.season_year = m.season_year 
  AND l.competition_id = m.competition_id;
