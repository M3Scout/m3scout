-- v23: correção da v22 — não bloqueia competição inteira
-- Regra: exclui do src_live apenas competições com is_live_correction=true
-- (live editado manualmente → player_stats já tem o agregado corrigido)
-- Competições com player_stats manual (is_live_correction=false) somam com live normalmente

CREATE OR REPLACE FUNCTION public.calculate_player_attribute_scores(
  p_player_id      uuid,
  p_competition_id uuid,
  p_season_year    integer
) RETURNS jsonb AS $$
DECLARE
  v_stats RECORD; v_minutes numeric; v_matches numeric; v_confidence numeric;

  v_goals_p90 numeric; v_shots_on_target_p90 numeric; v_shots_on_post_p90 numeric;
  v_shots_off_target_p90 numeric; v_shots_blocked_att_p90 numeric;
  v_penalties_won_p90 numeric; v_offsides_p90 numeric;
  v_key_passes_p90 numeric; v_chances_created_p90 numeric;
  v_crosses_success_p90 numeric; v_crosses_failed_p90 numeric;
  v_progressive_passes_p90 numeric; v_assists_p90 numeric;
  v_accurate_passes_p90 numeric; v_passes_failed_p90 numeric;
  v_long_passes_accurate_p90 numeric; v_long_passes_failed_p90 numeric;
  v_successful_dribbles_p90 numeric; v_dribbles_failed_p90 numeric;
  v_fouls_drawn_p90 numeric; v_possession_lost_p90 numeric;
  v_tackles_p90 numeric; v_interceptions_p90 numeric; v_clearances_p90 numeric;
  v_blocked_shots_p90 numeric; v_times_dribbled_past_p90 numeric;
  v_steals_p90 numeric; v_recoveries_p90 numeric;
  v_ground_duels_won_p90 numeric; v_ground_duels_lost_p90 numeric;
  v_aerial_duels_won_p90 numeric; v_aerial_duels_lost_p90 numeric;
  v_fouls_committed_p90 numeric; v_yellow_p90 numeric; v_red_p90 numeric;

  v_s_goals numeric; v_s_shots_on_target numeric; v_s_shots_on_post numeric;
  v_s_penalties_won numeric; v_s_offsides_neg numeric;
  v_s_key_passes numeric; v_s_chances_created numeric; v_s_crosses_success numeric;
  v_s_crosses_failed_neg numeric; v_s_progressive_passes numeric;
  v_s_assists numeric; v_s_accurate_passes numeric;
  v_s_long_passes_accurate numeric; v_s_long_passes_failed_neg numeric;
  v_s_successful_dribbles numeric; v_s_dribbles_failed_neg numeric;
  v_s_fouls_drawn numeric; v_s_passes_failed_neg numeric;
  v_s_possession_lost_neg numeric; v_s_progressive_passes_tec numeric;
  v_s_tackles numeric; v_s_steals numeric; v_s_recoveries numeric;
  v_s_interceptions numeric; v_s_clearances numeric; v_s_blocked_shots numeric;
  v_s_ground_duels_won numeric; v_s_aerial_duels_won numeric;
  v_s_ground_duels_lost_neg numeric; v_s_aerial_duels_lost_neg numeric;
  v_s_times_dribbled_neg numeric;
  v_s_fouls_committed_neg numeric; v_s_yellow_neg numeric; v_s_red_neg numeric;

  v_ata numeric; v_cri numeric; v_tec numeric; v_def numeric; v_tat numeric;
  v_per90 jsonb; v_final_scores jsonb;
BEGIN
  WITH
  -- Apenas competições onde o live foi editado manualmente
  -- (is_live_correction=true = player_stats já tem o agregado corrigido desses jogos)
  -- Para essas, src_live causaria double counting
  corrected_competitions AS (
    SELECT DISTINCT competition_id
    FROM public.player_stats
    WHERE player_id = p_player_id
      AND season_year = p_season_year
      AND competition_id IS NOT NULL
      AND is_live_correction = true
  ),

  -- Fonte 1: player_stats — manual + live corrigido
  src_ps AS (
    SELECT
      SUM(matches)::bigint              AS matches,
      SUM(minutes)::numeric             AS minutes,
      SUM(goals)::bigint                AS goals,
      SUM(shots_on_target)::bigint      AS shots_on_target,
      SUM(shots_on_post)::bigint        AS shots_on_post,
      SUM(shots_off_target)::bigint     AS shots_off_target,
      SUM(shots_blocked_att)::bigint    AS shots_blocked_att,
      SUM(penalties_won)::bigint        AS penalties_won,
      SUM(offsides)::bigint             AS offsides,
      SUM(key_passes)::bigint           AS key_passes,
      SUM(chances_created)::bigint      AS chances_created,
      SUM(crosses_success)::bigint      AS crosses_success,
      SUM(crosses_failed)::bigint       AS crosses_failed,
      SUM(progressive_passes)::bigint   AS progressive_passes,
      SUM(assists)::bigint              AS assists,
      SUM(accurate_passes)::bigint      AS accurate_passes,
      SUM(total_passes)::bigint         AS total_passes,
      SUM(long_passes_accurate)::bigint AS long_passes_accurate,
      SUM(long_passes_total)::bigint    AS long_passes_total,
      SUM(successful_dribbles)::bigint  AS successful_dribbles,
      SUM(total_dribbles)::bigint       AS total_dribbles,
      SUM(fouls_drawn)::bigint          AS fouls_drawn,
      SUM(possession_lost)::bigint      AS possession_lost,
      SUM(tackles)::bigint              AS tackles,
      SUM(interceptions)::bigint        AS interceptions,
      SUM(clearances)::bigint           AS clearances,
      SUM(shots_blocked)::bigint        AS blocked_shots,
      SUM(times_dribbled_past)::bigint  AS times_dribbled_past,
      SUM(steals)::bigint               AS steals,
      SUM(recoveries)::bigint           AS recoveries,
      SUM(ground_duels_won)::bigint     AS ground_duels_won,
      SUM(ground_duels_total)::bigint   AS ground_duels_total,
      SUM(aerial_duels_won)::bigint     AS aerial_duels_won,
      SUM(aerial_duels_total)::bigint   AS aerial_duels_total,
      SUM(fouls_committed)::bigint      AS fouls_committed,
      SUM(yellow_cards)::bigint         AS yellow_cards,
      SUM(red_cards)::bigint            AS red_cards
    FROM public.player_stats
    WHERE player_id = p_player_id AND season_year = p_season_year
  ),

  -- Fonte 2: match_player_stats — finished + applied
  -- Exclui APENAS competições com is_live_correction=true (já cobertas pelo src_ps)
  presence AS (
    SELECT match_id,
           SUM(exited_at_seconds - entered_at_seconds) / 60.0 AS presence_minutes
    FROM public.player_field_presence
    WHERE player_id = p_player_id
    GROUP BY match_id
  ),
  src_live AS (
    SELECT
      COUNT(DISTINCT mp.match_id)::bigint AS matches,
      SUM(COALESCE(pres.presence_minutes, mp.minutes_played::numeric))::numeric AS minutes,
      SUM(mps.goals)::bigint AS goals,
      SUM(mps.shots_on_target)::bigint AS shots_on_target,
      SUM(mps.shots_on_post)::bigint AS shots_on_post,
      0::bigint AS shots_off_target,
      0::bigint AS shots_blocked_att,
      SUM(mps.penalties_won)::bigint AS penalties_won,
      SUM(mps.offsides)::bigint AS offsides,
      SUM(mps.key_passes)::bigint AS key_passes,
      SUM(mps.chances_created)::bigint AS chances_created,
      SUM(mps.crosses_success)::bigint AS crosses_success,
      SUM(mps.crosses_failed)::bigint AS crosses_failed,
      SUM(mps.progressive_passes)::bigint AS progressive_passes,
      SUM(mps.assists)::bigint AS assists,
      SUM(mps.passes_completed)::bigint AS accurate_passes,
      SUM(mps.passes_completed + mps.passes_total)::bigint AS total_passes,
      NULL::bigint AS long_passes_accurate,
      NULL::bigint AS long_passes_total,
      SUM(mps.dribbles_success)::bigint AS successful_dribbles,
      SUM(mps.dribbles_success + mps.dribbles_total)::bigint AS total_dribbles,
      SUM(mps.fouls_suffered)::bigint AS fouls_drawn,
      SUM(mps.possession_lost)::bigint AS possession_lost,
      SUM(mps.tackles)::bigint AS tackles,
      SUM(mps.interceptions)::bigint AS interceptions,
      SUM(mps.clearances)::bigint AS clearances,
      SUM(mps.shots_blocked)::bigint AS blocked_shots,
      SUM(mps.was_dribbled)::bigint AS times_dribbled_past,
      SUM(mps.steals)::bigint AS steals,
      SUM(mps.recoveries)::bigint AS recoveries,
      SUM(mps.duels_won - mps.aerial_duels_won)::bigint AS ground_duels_won,
      SUM((mps.duels_won + mps.duels_total) - (mps.aerial_duels_won + mps.aerial_duels_total))::bigint AS ground_duels_total,
      SUM(mps.aerial_duels_won)::bigint AS aerial_duels_won,
      SUM(mps.aerial_duels_won + mps.aerial_duels_total)::bigint AS aerial_duels_total,
      SUM(mps.fouls_committed)::bigint AS fouls_committed,
      SUM(mps.yellow_cards)::bigint AS yellow_cards,
      SUM(mps.red_cards)::bigint AS red_cards
    FROM public.match_players mp
    JOIN public.match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
    JOIN public.matches m ON m.id = mp.match_id
    LEFT JOIN presence pres ON pres.match_id = mp.match_id
    WHERE mp.player_id = p_player_id
      AND EXTRACT(YEAR FROM m.match_date) = p_season_year
      AND m.status IN ('finished', 'applied')
      AND mp.is_removed IS NOT TRUE
      AND (
        -- Sem corrected_competitions: inclui tudo do live
        NOT EXISTS (SELECT 1 FROM corrected_competitions)
        OR
        -- Com corrected_competitions: exclui só as competições com is_live_correction=true
        m.competition_id NOT IN (SELECT competition_id FROM corrected_competitions)
      )
  ),

  all_sources AS (
    SELECT * FROM src_ps
    UNION ALL
    SELECT * FROM src_live WHERE minutes > 0
  )
  SELECT
    SUM(matches)              AS matches,
    SUM(minutes)              AS minutes,
    SUM(goals)                AS goals,
    SUM(shots_on_target)      AS shots_on_target,
    SUM(shots_on_post)        AS shots_on_post,
    SUM(shots_off_target)     AS shots_off_target,
    SUM(shots_blocked_att)    AS shots_blocked_att,
    SUM(penalties_won)        AS penalties_won,
    SUM(offsides)             AS offsides,
    SUM(key_passes)           AS key_passes,
    SUM(chances_created)      AS chances_created,
    SUM(crosses_success)      AS crosses_success,
    SUM(crosses_failed)       AS crosses_failed,
    SUM(progressive_passes)   AS progressive_passes,
    SUM(assists)              AS assists,
    SUM(accurate_passes)      AS accurate_passes,
    SUM(total_passes)         AS total_passes,
    SUM(long_passes_accurate) AS long_passes_accurate,
    SUM(long_passes_total)    AS long_passes_total,
    SUM(successful_dribbles)  AS successful_dribbles,
    SUM(total_dribbles)       AS total_dribbles,
    SUM(fouls_drawn)          AS fouls_drawn,
    SUM(possession_lost)      AS possession_lost,
    SUM(tackles)              AS tackles,
    SUM(interceptions)        AS interceptions,
    SUM(clearances)           AS clearances,
    SUM(blocked_shots)        AS blocked_shots,
    SUM(times_dribbled_past)  AS times_dribbled_past,
    SUM(steals)               AS steals,
    SUM(recoveries)           AS recoveries,
    SUM(ground_duels_won)     AS ground_duels_won,
    SUM(ground_duels_total)   AS ground_duels_total,
    SUM(aerial_duels_won)     AS aerial_duels_won,
    SUM(aerial_duels_total)   AS aerial_duels_total,
    SUM(fouls_committed)      AS fouls_committed,
    SUM(yellow_cards)         AS yellow_cards,
    SUM(red_cards)            AS red_cards
  INTO v_stats
  FROM all_sources;

  v_minutes := COALESCE(v_stats.minutes, 0);
  v_matches := COALESCE(v_stats.matches, 0);

  IF v_minutes <= 0 THEN
    RETURN jsonb_build_object('error', 'No minutes played');
  END IF;

  v_confidence := LEAST(1.0, v_minutes / 900.0);

  v_goals_p90              := (COALESCE(v_stats.goals,              0) * 90.0) / v_minutes;
  v_shots_on_target_p90    := (COALESCE(v_stats.shots_on_target,    0) * 90.0) / v_minutes;
  v_shots_on_post_p90      := (COALESCE(v_stats.shots_on_post,      0) * 90.0) / v_minutes;
  v_shots_off_target_p90   := (COALESCE(v_stats.shots_off_target,   0) * 90.0) / v_minutes;
  v_shots_blocked_att_p90  := (COALESCE(v_stats.shots_blocked_att,  0) * 90.0) / v_minutes;
  v_penalties_won_p90      := (COALESCE(v_stats.penalties_won,      0) * 90.0) / v_minutes;
  v_offsides_p90           := (COALESCE(v_stats.offsides,           0) * 90.0) / v_minutes;
  v_key_passes_p90         := (COALESCE(v_stats.key_passes,         0) * 90.0) / v_minutes;
  v_chances_created_p90    := (COALESCE(v_stats.chances_created,    0) * 90.0) / v_minutes;
  v_crosses_success_p90    := (COALESCE(v_stats.crosses_success,    0) * 90.0) / v_minutes;
  v_crosses_failed_p90     := (COALESCE(v_stats.crosses_failed,     0) * 90.0) / v_minutes;
  v_progressive_passes_p90 := (COALESCE(v_stats.progressive_passes, 0) * 90.0) / v_minutes;
  v_assists_p90            := (COALESCE(v_stats.assists,            0) * 90.0) / v_minutes;
  v_accurate_passes_p90    := (COALESCE(v_stats.accurate_passes,    0) * 90.0) / v_minutes;
  v_long_passes_accurate_p90 := (COALESCE(v_stats.long_passes_accurate, 0) * 90.0) / v_minutes;
  v_long_passes_failed_p90 := (GREATEST(0, COALESCE(v_stats.long_passes_total, 0) - COALESCE(v_stats.long_passes_accurate, 0)) * 90.0) / v_minutes;
  v_successful_dribbles_p90 := (COALESCE(v_stats.successful_dribbles, 0) * 90.0) / v_minutes;
  v_dribbles_failed_p90    := (GREATEST(0, COALESCE(v_stats.total_dribbles, 0) - COALESCE(v_stats.successful_dribbles, 0)) * 90.0) / v_minutes;
  v_fouls_drawn_p90        := (COALESCE(v_stats.fouls_drawn,        0) * 90.0) / v_minutes;
  v_passes_failed_p90      := (GREATEST(0, COALESCE(v_stats.total_passes, 0) - COALESCE(v_stats.accurate_passes, 0)) * 90.0) / v_minutes;
  v_possession_lost_p90    := (COALESCE(v_stats.possession_lost,    0) * 90.0) / v_minutes;
  v_tackles_p90            := (COALESCE(v_stats.tackles,            0) * 90.0) / v_minutes;
  v_interceptions_p90      := (COALESCE(v_stats.interceptions,      0) * 90.0) / v_minutes;
  v_clearances_p90         := (COALESCE(v_stats.clearances,         0) * 90.0) / v_minutes;
  v_blocked_shots_p90      := (COALESCE(v_stats.blocked_shots,      0) * 90.0) / v_minutes;
  v_times_dribbled_past_p90 := (COALESCE(v_stats.times_dribbled_past, 0) * 90.0) / v_minutes;
  v_steals_p90             := (COALESCE(v_stats.steals,             0) * 90.0) / v_minutes;
  v_recoveries_p90         := (COALESCE(v_stats.recoveries,         0) * 90.0) / v_minutes;
  v_ground_duels_won_p90   := (COALESCE(v_stats.ground_duels_won,   0) * 90.0) / v_minutes;
  v_ground_duels_lost_p90  := (GREATEST(0, COALESCE(v_stats.ground_duels_total, 0) - COALESCE(v_stats.ground_duels_won, 0)) * 90.0) / v_minutes;
  v_aerial_duels_won_p90   := (COALESCE(v_stats.aerial_duels_won,   0) * 90.0) / v_minutes;
  v_aerial_duels_lost_p90  := (GREATEST(0, COALESCE(v_stats.aerial_duels_total, 0) - COALESCE(v_stats.aerial_duels_won, 0)) * 90.0) / v_minutes;
  v_fouls_committed_p90    := (COALESCE(v_stats.fouls_committed,    0) * 90.0) / v_minutes;
  v_yellow_p90             := (COALESCE(v_stats.yellow_cards,       0) * 90.0) / v_minutes;
  v_red_p90                := (COALESCE(v_stats.red_cards,          0) * 90.0) / v_minutes;

  v_s_goals              := LEAST(100.0, (v_goals_p90              / 0.60) * 100.0);
  v_s_shots_on_target    := LEAST(100.0, (v_shots_on_target_p90    / 1.80) * 100.0);
  v_s_shots_on_post      := LEAST(100.0, (v_shots_on_post_p90      / 0.50) * 100.0);
  v_s_penalties_won      := LEAST(100.0, (v_penalties_won_p90      / 0.10) * 100.0);
  v_s_offsides_neg       := GREATEST(0.0, 100.0 - (v_offsides_p90          / 1.50) * 100.0);
  v_s_key_passes         := LEAST(100.0, (v_key_passes_p90         / 2.20) * 100.0);
  v_s_chances_created    := LEAST(100.0, (v_chances_created_p90    / 0.80) * 100.0);
  v_s_crosses_success    := LEAST(100.0, (v_crosses_success_p90    / 1.50) * 100.0);
  v_s_crosses_failed_neg := GREATEST(0.0, 100.0 - (v_crosses_failed_p90    / 4.00) * 100.0);
  v_s_progressive_passes := LEAST(100.0, (v_progressive_passes_p90 / 5.00) * 100.0);
  v_s_assists                := LEAST(100.0, (v_assists_p90                / 0.45) * 100.0);
  v_s_accurate_passes        := LEAST(100.0, (v_accurate_passes_p90        / 45.0) * 100.0);
  v_s_long_passes_accurate   := LEAST(100.0, (v_long_passes_accurate_p90   / 4.00) * 100.0);
  v_s_long_passes_failed_neg := GREATEST(0.0, 100.0 - (v_long_passes_failed_p90   / 6.00) * 100.0);
  v_s_successful_dribbles    := LEAST(100.0, (v_successful_dribbles_p90    / 3.00) * 100.0);
  v_s_dribbles_failed_neg    := GREATEST(0.0, 100.0 - (v_dribbles_failed_p90      / 2.50) * 100.0);
  v_s_fouls_drawn            := LEAST(100.0, (v_fouls_drawn_p90            / 2.60) * 100.0);
  v_s_passes_failed_neg      := GREATEST(0.0, 100.0 - (v_passes_failed_p90        / 12.0) * 100.0);
  v_s_possession_lost_neg    := GREATEST(0.0, 100.0 - (v_possession_lost_p90      / 15.0) * 100.0);
  v_s_progressive_passes_tec := LEAST(100.0, (v_progressive_passes_p90    / 5.00) * 100.0);
  v_s_tackles               := LEAST(100.0, (v_tackles_p90            / 4.00) * 100.0);
  v_s_steals                := LEAST(100.0, (v_steals_p90             / 3.00) * 100.0);
  v_s_recoveries            := LEAST(100.0, (v_recoveries_p90         / 9.00) * 100.0);
  v_s_interceptions         := LEAST(100.0, (v_interceptions_p90      / 2.45) * 100.0);
  v_s_clearances            := LEAST(100.0, (v_clearances_p90         / 4.20) * 100.0);
  v_s_blocked_shots         := LEAST(100.0, (v_blocked_shots_p90      / 1.50) * 100.0);
  v_s_ground_duels_won      := LEAST(100.0, (v_ground_duels_won_p90   / 3.75) * 100.0);
  v_s_aerial_duels_won      := LEAST(100.0, (v_aerial_duels_won_p90   / 2.25) * 100.0);
  v_s_ground_duels_lost_neg := GREATEST(0.0, 100.0 - (v_ground_duels_lost_p90  / 4.00) * 100.0);
  v_s_aerial_duels_lost_neg := GREATEST(0.0, 100.0 - (v_aerial_duels_lost_p90  / 3.00) * 100.0);
  v_s_times_dribbled_neg    := GREATEST(0.0, 100.0 - (v_times_dribbled_past_p90 / 2.80) * 100.0);
  v_s_fouls_committed_neg   := GREATEST(0.0, 100.0 - (v_fouls_committed_p90    / 3.00) * 100.0);
  v_s_yellow_neg            := GREATEST(0.0, 100.0 - (v_yellow_p90             / 0.30) * 100.0);
  v_s_red_neg               := GREATEST(0.0, 100.0 - (v_red_p90               / 0.05) * 100.0);

  v_ata :=
    (v_s_goals           * 0.45) +
    (v_s_shots_on_target * 0.30) +
    (v_s_shots_on_post   * 0.10) +
    (v_s_penalties_won   * 0.05) +
    (v_s_offsides_neg    * 0.10);

  v_cri :=
    (v_s_chances_created    * 0.35) +
    (v_s_key_passes         * 0.25) +
    (v_s_progressive_passes * 0.20) +
    (v_s_crosses_success    * 0.15) +
    (v_s_crosses_failed_neg * 0.05);

  v_tec :=
    (v_s_accurate_passes        * 0.20) +
    (v_s_assists                * 0.15) +
    (v_s_successful_dribbles    * 0.15) +
    (v_s_progressive_passes_tec * 0.15) +
    (v_s_long_passes_accurate   * 0.10) +
    (v_s_fouls_drawn            * 0.05) +
    (v_s_passes_failed_neg      * 0.05) +
    (v_s_long_passes_failed_neg * 0.05) +
    (v_s_dribbles_failed_neg    * 0.05) +
    (v_s_possession_lost_neg    * 0.05);

  v_tat :=
    (v_s_steals               * 0.12) +
    (v_s_progressive_passes   * 0.10) +
    (v_s_tackles              * 0.10) +
    (v_s_interceptions        * 0.10) +
    (v_s_recoveries           * 0.08) +
    (v_s_ground_duels_won     * 0.08) +
    (v_s_aerial_duels_won     * 0.08) +
    (v_s_ground_duels_lost_neg * 0.05) +
    (v_s_aerial_duels_lost_neg * 0.05) +
    (v_s_fouls_committed_neg  * 0.08) +
    (v_s_yellow_neg           * 0.06) +
    (v_s_red_neg              * 0.10);

  v_def :=
    (v_s_tackles              * 0.15) +
    (v_s_steals               * 0.12) +
    (v_s_recoveries           * 0.08) +
    (v_s_interceptions        * 0.15) +
    (v_s_clearances           * 0.10) +
    (v_s_blocked_shots        * 0.10) +
    (v_s_ground_duels_won     * 0.08) +
    (v_s_aerial_duels_won     * 0.08) +
    (v_s_ground_duels_lost_neg * 0.04) +
    (v_s_aerial_duels_lost_neg * 0.04) +
    (v_s_times_dribbled_neg   * 0.06);

  v_ata := ROUND(GREATEST(0.0, LEAST(100.0, v_ata)));
  v_cri := ROUND(GREATEST(0.0, LEAST(100.0, v_cri)));
  v_tec := ROUND(GREATEST(0.0, LEAST(100.0, v_tec)));
  v_def := ROUND(GREATEST(0.0, LEAST(100.0, v_def)));
  v_tat := ROUND(GREATEST(0.0, LEAST(100.0, v_tat)));

  v_per90 := jsonb_build_object(
    'goals',               v_goals_p90,
    'shots_on_target',     v_shots_on_target_p90,
    'shots_on_post',       v_shots_on_post_p90,
    'shots_off_target',    v_shots_off_target_p90,
    'shots_blocked_att',   v_shots_blocked_att_p90,
    'penalties_won',       v_penalties_won_p90,
    'offsides',            v_offsides_p90,
    'key_passes',          v_key_passes_p90,
    'chances_created',     v_chances_created_p90,
    'crosses_success',     v_crosses_success_p90,
    'crosses_failed',      v_crosses_failed_p90,
    'progressive_passes',  v_progressive_passes_p90,
    'assists',             v_assists_p90,
    'accurate_passes',     v_accurate_passes_p90,
    'long_passes_accurate', v_long_passes_accurate_p90,
    'long_passes_failed',  v_long_passes_failed_p90,
    'successful_dribbles', v_successful_dribbles_p90,
    'dribbles_failed',     v_dribbles_failed_p90,
    'fouls_drawn',         v_fouls_drawn_p90,
    'passes_failed',       v_passes_failed_p90,
    'possession_lost',     v_possession_lost_p90,
    'tackles',             v_tackles_p90,
    'interceptions',       v_interceptions_p90,
    'clearances',          v_clearances_p90,
    'blocked_shots',       v_blocked_shots_p90,
    'times_dribbled_past', v_times_dribbled_past_p90,
    'steals',              v_steals_p90,
    'recoveries',          v_recoveries_p90,
    'ground_duels_won',    v_ground_duels_won_p90,
    'ground_duels_lost',   v_ground_duels_lost_p90,
    'aerial_duels_won',    v_aerial_duels_won_p90,
    'aerial_duels_lost',   v_aerial_duels_lost_p90,
    'fouls_committed',     v_fouls_committed_p90,
    'yellow_cards',        v_yellow_p90,
    'red_cards',           v_red_p90
  );

  v_final_scores := jsonb_build_object(
    'ata', v_ata, 'cri', v_cri, 'tec', v_tec, 'def', v_def, 'tat', v_tat
  );

  DELETE FROM public.player_attribute_scores
  WHERE player_id = p_player_id AND season_year = p_season_year;

  INSERT INTO public.player_attribute_scores (
    player_id, competition_id, season_year,
    ata_score_100, tec_score_100, def_score_100, tat_score_100, cri_score_100,
    attr_confidence, details, updated_at
  ) VALUES (
    p_player_id, p_competition_id, p_season_year,
    v_ata, v_tec, v_def, v_tat, v_cri,
    v_confidence,
    jsonb_build_object(
      'minutes',        v_minutes,
      'matches',        v_matches,
      'per90',          v_per90,
      'final_scores',   v_final_scores,
      'engine_version', 'v23',
      'data_source',    'player_stats UNION ALL src_live; live excluído só onde is_live_correction=true'
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success',    true,
    'ata',        v_ata,
    'cri',        v_cri,
    'tec',        v_tec,
    'def',        v_def,
    'tat',        v_tat,
    'confidence', v_confidence,
    'minutes',    v_minutes,
    'matches',    v_matches
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT * FROM public.recalculate_all_attribute_scores();
