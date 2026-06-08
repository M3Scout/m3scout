
-- 1. Columns
ALTER TABLE public.player_stats ADD COLUMN IF NOT EXISTS steals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.match_player_stats ADD COLUMN IF NOT EXISTS steals INTEGER NOT NULL DEFAULT 0;

-- 2. Enum
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'steal';

-- 3. Function
CREATE OR REPLACE FUNCTION public.apply_event_stats(p_delta integer, p_event_type text, p_match_id uuid, p_player_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_column_name text;
BEGIN
  v_column_name := CASE p_event_type
    WHEN 'goal' THEN 'goals'
    WHEN 'shot' THEN 'shots'
    WHEN 'shot_on_target' THEN 'shots_on_target'
    WHEN 'offside' THEN 'offsides'
    WHEN 'shot_blocked' THEN 'shots_blocked'
    WHEN 'assist' THEN 'assists'
    WHEN 'key_pass' THEN 'key_passes'
    WHEN 'chance_created' THEN 'chances_created'
    WHEN 'pass_success' THEN 'passes_completed'
    WHEN 'pass_total' THEN 'passes_total'
    WHEN 'cross_success' THEN 'crosses_success'
    WHEN 'cross_failed' THEN 'crosses_failed'
    WHEN 'dribble_success' THEN 'dribbles_success'
    WHEN 'dribble_attempt' THEN 'dribbles_total'
    WHEN 'foul_suffered' THEN 'fouls_suffered'
    WHEN 'possession_lost' THEN 'possession_lost'
    WHEN 'ball_action' THEN 'ball_actions'
    WHEN 'tackle' THEN 'tackles'
    WHEN 'interception' THEN 'interceptions'
    WHEN 'recovery' THEN 'recoveries'
    WHEN 'steal' THEN 'steals'
    WHEN 'clearance' THEN 'clearances'
    WHEN 'duel_won' THEN 'duels_won'
    WHEN 'duel_total' THEN 'duels_total'
    WHEN 'aerial_duel_won' THEN 'aerial_duels_won'
    WHEN 'aerial_duel_total' THEN 'aerial_duels_total'
    WHEN 'ground_duel_won' THEN 'duels_won'
    WHEN 'ground_duel_total' THEN 'duels_total'
    WHEN 'foul_committed' THEN 'fouls_committed'
    WHEN 'was_dribbled' THEN 'was_dribbled'
    WHEN 'blocked_shot' THEN 'blocked_shots'
    WHEN 'yellow' THEN 'yellow_cards'
    WHEN 'red' THEN 'red_cards'
    WHEN 'save' THEN 'saves'
    WHEN 'goal_conceded' THEN 'goals_conceded'
    ELSE NULL
  END;

  IF v_column_name IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.match_player_stats (match_id, player_id)
  VALUES (p_match_id, p_player_id)
  ON CONFLICT (match_id, player_id) DO NOTHING;

  EXECUTE format(
    'UPDATE public.match_player_stats SET %I = GREATEST(0, %I + $1) WHERE match_id = $2 AND player_id = $3',
    v_column_name,
    v_column_name
  ) USING p_delta, p_match_id, p_player_id;
END;
$function$;

-- 4. Recreate view (drop + create since column ordering changes)
DROP VIEW IF EXISTS public.unified_player_season_stats;

CREATE VIEW public.unified_player_season_stats AS
WITH presence_minutes AS (
  SELECT pfp.player_id,
    m_1.season_year,
    m_1.competition_id,
    count(DISTINCT pfp.match_id) AS matches_count,
    sum(LEAST(COALESCE(pfp.exited_at_seconds, 2700) - pfp.entered_at_seconds, 2700))::numeric / 60.0 AS total_minutes
  FROM player_field_presence pfp
    JOIN matches m_1 ON m_1.id = pfp.match_id
  WHERE m_1.status = 'applied'::match_status AND m_1.competition_id IS NOT NULL
  GROUP BY pfp.player_id, m_1.season_year, m_1.competition_id
), live_stats AS (
  SELECT mp.player_id,
    m_1.season_year,
    m_1.competition_id,
    c.final_coefficient,
    c.name AS competition_name,
    count(DISTINCT mp.match_id) AS matches,
    COALESCE(pm.total_minutes::bigint, sum(LEAST(COALESCE(mp.minutes_played, 0), 90))) AS minutes,
    sum(COALESCE(mps.goals, 0)) AS goals,
    sum(COALESCE(mps.assists, 0)) AS assists,
    sum(COALESCE(mps.yellow_cards, 0)) AS yellow_cards,
    sum(COALESCE(mps.red_cards, 0)) AS red_cards,
    sum(COALESCE(mps.tackles, 0)) AS tackles,
    sum(COALESCE(mps.interceptions, 0)) AS interceptions,
    sum(COALESCE(mps.recoveries, 0)) AS recoveries,
    sum(COALESCE(mps.steals, 0)) AS steals,
    sum(COALESCE(mps.saves, 0)) AS saves,
    sum(COALESCE(mps.goals_conceded, 0)) AS goals_conceded,
    0 AS clean_sheets,
    0 AS penalties_saved,
    0 AS errors_leading_to_goal,
    sum(COALESCE(mps.aerial_duels_won, 0)) AS aerial_duels_won,
    sum(COALESCE(mps.aerial_duels_total, 0)) AS aerial_duels_total,
    sum(COALESCE(mps.passes_completed, 0)) AS passes_completed,
    sum(COALESCE(mps.passes_completed, 0) + COALESCE(mps.passes_total, 0)) AS passes_attempted,
    sum(COALESCE(mps.duels_won, 0)) AS duels_won,
    sum(COALESCE(mps.duels_total, 0)) AS total_duels,
    sum(COALESCE(mps.chances_created, 0)) AS chances_created,
    sum(COALESCE(mps.key_passes, 0)) AS key_passes,
    sum(COALESCE(mps.shots, 0) + COALESCE(mps.shots_on_target, 0) + COALESCE(mps.shots_blocked, 0)) AS shots,
    sum(COALESCE(mps.shots_on_target, 0)) AS shots_on_target,
    sum(COALESCE(mps.fouls_committed, 0)) AS fouls_committed,
    sum(COALESCE(mps.fouls_suffered, 0)) AS fouls_drawn,
    sum(COALESCE(mps.dribbles_success, 0)) AS dribbles_completed,
    sum(COALESCE(mps.dribbles_success, 0) + COALESCE(mps.dribbles_total, 0)) AS dribbles_attempted,
    0 AS ground_duels_won,
    0 AS ground_duels_total,
    'live'::text AS data_source
  FROM match_players mp
    JOIN matches m_1 ON m_1.id = mp.match_id
    LEFT JOIN match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
    LEFT JOIN competitions c ON c.id = m_1.competition_id
    LEFT JOIN presence_minutes pm ON pm.player_id = mp.player_id AND pm.season_year = m_1.season_year AND pm.competition_id = m_1.competition_id
  WHERE m_1.status = 'applied'::match_status AND COALESCE(mp.is_removed, false) = false AND m_1.competition_id IS NOT NULL
  GROUP BY mp.player_id, m_1.season_year, m_1.competition_id, c.final_coefficient, c.name, pm.total_minutes
), manual_stats AS (
  SELECT ps.player_id,
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
    ps.steals,
    ps.saves,
    ps.goals_conceded,
    ps.clean_sheets,
    ps.penalties_saved,
    ps.errors_leading_to_goal,
    ps.aerial_duels_won,
    ps.aerial_duels_total,
    ps.accurate_passes AS passes_completed,
    ps.accurate_passes + ps.total_passes AS passes_attempted,
    ps.duels_won,
    ps.total_duels,
    ps.chances_created,
    ps.key_passes,
    ps.shots,
    ps.shots_on_target,
    ps.fouls_committed,
    ps.fouls_drawn,
    ps.successful_dribbles AS dribbles_completed,
    ps.successful_dribbles + ps.total_dribbles AS dribbles_attempted,
    ps.ground_duels_won,
    ps.ground_duels_total,
    'manual'::text AS data_source
  FROM player_stats ps
    LEFT JOIN competitions c ON c.id = ps.competition_id
  WHERE COALESCE(ps.is_archived, false) = false AND ps.matches > 0
)
SELECT COALESCE(l.player_id, m.player_id) AS player_id,
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
  COALESCE(l.steals, m.steals::bigint) AS steals,
  COALESCE(l.saves, m.saves::bigint) AS saves,
  COALESCE(l.goals_conceded, m.goals_conceded::bigint) AS goals_conceded,
  COALESCE(l.clean_sheets, m.clean_sheets) AS clean_sheets,
  COALESCE(l.penalties_saved, m.penalties_saved) AS penalties_saved,
  COALESCE(l.errors_leading_to_goal, m.errors_leading_to_goal) AS errors_leading_to_goal,
  COALESCE(l.aerial_duels_won, m.aerial_duels_won::bigint) AS aerial_duels_won,
  COALESCE(l.aerial_duels_total, m.aerial_duels_total::bigint) AS aerial_duels_total,
  COALESCE(l.passes_completed, m.passes_completed::bigint) AS passes_completed,
  COALESCE(l.passes_attempted, m.passes_attempted::bigint) AS passes_attempted,
  COALESCE(l.passes_completed, m.passes_completed::bigint) AS accurate_passes,
  COALESCE(l.passes_attempted, m.passes_attempted::bigint) AS total_passes,
  COALESCE(l.duels_won, m.duels_won::bigint) AS duels_won,
  COALESCE(l.total_duels, m.total_duels::bigint) AS total_duels,
  COALESCE(l.chances_created, m.chances_created::bigint) AS chances_created,
  COALESCE(l.key_passes, m.key_passes::bigint) AS key_passes,
  COALESCE(l.shots, m.shots::bigint) AS shots,
  COALESCE(l.shots_on_target, m.shots_on_target::bigint) AS shots_on_target,
  COALESCE(l.fouls_committed, m.fouls_committed::bigint) AS fouls_committed,
  COALESCE(l.fouls_drawn, m.fouls_drawn::bigint) AS fouls_drawn,
  COALESCE(l.dribbles_completed, m.dribbles_completed::bigint) AS dribbles_completed,
  COALESCE(l.dribbles_attempted, m.dribbles_attempted::bigint) AS dribbles_attempted,
  COALESCE(l.dribbles_completed, m.dribbles_completed::bigint) AS successful_dribbles,
  COALESCE(l.dribbles_attempted, m.dribbles_attempted::bigint) AS total_dribbles,
  COALESCE(l.ground_duels_won, m.ground_duels_won) AS ground_duels_won,
  COALESCE(l.ground_duels_total, m.ground_duels_total) AS ground_duels_total,
  CASE
    WHEN l.player_id IS NOT NULL AND m.player_id IS NOT NULL THEN 'both'::text
    WHEN l.player_id IS NOT NULL THEN 'live'::text
    ELSE 'manual'::text
  END AS data_source
FROM live_stats l
  FULL JOIN manual_stats m ON l.player_id = m.player_id AND l.season_year = m.season_year AND l.competition_id = m.competition_id;

GRANT SELECT ON public.unified_player_season_stats TO authenticated, anon, service_role;
