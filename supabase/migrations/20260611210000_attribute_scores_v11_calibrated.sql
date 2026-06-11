-- calculate_player_attribute_scores v11
-- Calibra benchmarks (goals 0.60, assists 0.35, tackles 4.0, etc.)
-- Adiciona long_passes_accurate_p90 ao eixo TEC (peso 0.15)
-- Adiciona shots_blocked_p90 ao eixo DEF (peso 0.15)
-- TEC e DEF agora usam média ponderada (alinhado com attributeRadar.ts)

CREATE OR REPLACE FUNCTION public.calculate_player_attribute_scores(
  p_player_id      uuid,
  p_competition_id uuid,
  p_season_year    integer
) RETURNS jsonb AS $$
DECLARE
  v_stats      RECORD;
  v_minutes    numeric;
  v_matches    numeric;
  v_confidence numeric;

  -- Ratios
  v_pass_accuracy    numeric;
  v_duels_win_rate   numeric;

  -- Per-90
  v_goals_p90                 numeric;
  v_shots_on_target_p90       numeric;
  v_shots_on_post_p90         numeric;
  v_penalties_won_p90         numeric;
  v_offsides_p90              numeric;
  v_key_passes_p90            numeric;
  v_chances_created_p90       numeric;
  v_crosses_success_p90       numeric;
  v_crosses_failed_p90        numeric;
  v_progressive_passes_p90    numeric;
  v_assists_p90               numeric;
  v_accurate_passes_p90       numeric;
  v_long_passes_accurate_p90  numeric;
  v_long_passes_failed_p90    numeric;
  v_successful_dribbles_p90   numeric;
  v_dribbles_failed_p90       numeric;
  v_fouls_drawn_p90           numeric;
  v_passes_failed_p90         numeric;
  v_possession_lost_p90       numeric;
  v_tackles_p90               numeric;
  v_interceptions_p90         numeric;
  v_clearances_p90            numeric;
  v_blocked_shots_p90         numeric;
  v_times_dribbled_past_p90   numeric;
  v_recoveries_p90            numeric;
  v_ground_duels_won_p90      numeric;
  v_ground_duels_lost_p90     numeric;
  v_aerial_duels_won_p90      numeric;
  v_aerial_duels_lost_p90     numeric;
  v_fouls_committed_p90       numeric;
  v_yellow_p90                numeric;
  v_red_p90                   numeric;

  -- Sub-scores ATA
  v_s_goals                   numeric;
  v_s_shots_on_target         numeric;
  v_s_shots_on_post           numeric;
  v_s_penalties_won           numeric;
  v_s_offsides_neg            numeric;
  -- Sub-scores CRI
  v_s_key_passes              numeric;
  v_s_chances_created         numeric;
  v_s_crosses_success         numeric;
  v_s_crosses_failed_neg      numeric;
  v_s_progressive_passes      numeric;
  -- Sub-scores TEC (ponderado)
  v_s_pass_accuracy           numeric;
  v_s_accurate_passes         numeric;
  v_s_successful_dribbles     numeric;
  v_s_progressive_passes_tec  numeric;
  v_s_long_passes_accurate    numeric;
  -- Sub-scores DEF (ponderado)
  v_s_tackles                 numeric;
  v_s_interceptions           numeric;
  v_s_recoveries              numeric;
  v_s_duels_win_rate          numeric;
  v_s_clearances              numeric;
  v_s_blocked_shots           numeric;
  -- Sub-scores TAT
  v_s_ground_duels_won        numeric;
  v_s_ground_duels_lost_neg   numeric;
  v_s_aerial_duels_won        numeric;
  v_s_aerial_duels_lost_neg   numeric;
  v_s_fouls_committed_neg     numeric;
  v_s_yellow_neg              numeric;
  v_s_red_neg                 numeric;
  v_s_times_dribbled_neg      numeric;

  -- Axis scores
  v_ata  numeric;
  v_cri  numeric;
  v_tec  numeric;
  v_def  numeric;
  v_tat  numeric;

  v_per90        jsonb;
  v_final_scores jsonb;
BEGIN
  WITH src_ps AS (
    SELECT
      COUNT(*)                                                AS matches,
      SUM(minutes)                                            AS minutes,
      SUM(goals)                                              AS goals,
      SUM(shots_on_target)                                    AS shots_on_target,
      SUM(shots_on_post)                                      AS shots_on_post,
      SUM(penalties_won)                                      AS penalties_won,
      SUM(offsides)                                           AS offsides,
      SUM(key_passes)                                         AS key_passes,
      SUM(chances_created)                                    AS chances_created,
      SUM(crosses_success)                                    AS crosses_success,
      SUM(crosses_failed)                                     AS crosses_failed,
      SUM(progressive_passes)                                 AS progressive_passes,
      SUM(assists)                                            AS assists,
      SUM(accurate_passes)                                    AS accurate_passes,
      SUM(total_passes)                                       AS total_passes,
      SUM(long_passes_accurate)                               AS long_passes_accurate,
      SUM(long_passes_total)                                  AS long_passes_total,
      SUM(successful_dribbles)                                AS successful_dribbles,
      SUM(total_dribbles)                                     AS total_dribbles,
      SUM(fouls_drawn)                                        AS fouls_drawn,
      SUM(possession_lost)                                    AS possession_lost,
      SUM(tackles)                                            AS tackles,
      SUM(interceptions)                                      AS interceptions,
      SUM(clearances)                                         AS clearances,
      SUM(blocked_shots)                                      AS blocked_shots,
      SUM(times_dribbled_past)                                AS times_dribbled_past,
      SUM(recoveries)                                         AS recoveries,
      SUM(ground_duels_won)                                   AS ground_duels_won,
      SUM(ground_duels_total)                                 AS ground_duels_total,
      SUM(aerial_duels_won)                                   AS aerial_duels_won,
      SUM(aerial_duels_total)                                 AS aerial_duels_total,
      SUM(fouls_committed)                                    AS fouls_committed,
      SUM(yellow_cards)                                       AS yellow_cards,
      SUM(red_cards)                                          AS red_cards
    FROM public.player_stats
    WHERE player_id   = p_player_id
      AND season_year = p_season_year
  ),
  src_live AS (
    SELECT
      COUNT(DISTINCT mp.match_id)                             AS matches,
      SUM(mp.minutes_played)                                  AS minutes,
      SUM(mps.goals)                                          AS goals,
      SUM(mps.shots_on_target)                                AS shots_on_target,
      SUM(mps.shots_on_post)                                  AS shots_on_post,
      SUM(mps.penalties_won)                                  AS penalties_won,
      SUM(mps.offsides)                                       AS offsides,
      SUM(mps.key_passes)                                     AS key_passes,
      SUM(mps.chances_created)                                AS chances_created,
      SUM(mps.crosses_success)                                AS crosses_success,
      SUM(mps.crosses_failed)                                 AS crosses_failed,
      SUM(mps.progressive_passes)                             AS progressive_passes,
      SUM(mps.assists)                                        AS assists,
      SUM(mps.passes_completed)                               AS accurate_passes,
      SUM(mps.passes_completed + mps.passes_failed)           AS total_passes,
      SUM(mps.long_passes_accurate)                           AS long_passes_accurate,
      SUM(mps.long_passes_accurate + mps.long_passes_failed)  AS long_passes_total,
      SUM(mps.dribbles_success)                               AS successful_dribbles,
      SUM(mps.dribbles_success + mps.dribbles_failed)         AS total_dribbles,
      SUM(mps.fouls_suffered)                                 AS fouls_drawn,
      SUM(mps.possession_lost)                                AS possession_lost,
      SUM(mps.tackles)                                        AS tackles,
      SUM(mps.interceptions)                                  AS interceptions,
      SUM(mps.clearances)                                     AS clearances,
      SUM(mps.blocked_shots)                                  AS blocked_shots,
      SUM(mps.was_dribbled)                                   AS times_dribbled_past,
      SUM(mps.steals)                                         AS recoveries,
      SUM(mps.duels_won)                                      AS ground_duels_won,
      SUM(mps.duels_won + mps.duels_lost)                     AS ground_duels_total,
      SUM(mps.aerial_duels_won)                               AS aerial_duels_won,
      SUM(mps.aerial_duels_won + mps.aerial_duels_lost)       AS aerial_duels_total,
      SUM(mps.fouls_committed)                                AS fouls_committed,
      SUM(mps.yellow_cards)                                   AS yellow_cards,
      SUM(mps.red_cards)                                      AS red_cards
    FROM public.match_players mp
    JOIN public.match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
    JOIN public.matches m              ON m.id = mp.match_id
    WHERE mp.player_id           = p_player_id
      AND EXTRACT(YEAR FROM m.match_date) = p_season_year
      AND m.status IN ('finished', 'applied')
      AND mp.is_removed IS NOT TRUE
  ),
  all_sources AS (
    SELECT * FROM src_ps
    UNION ALL
    SELECT * FROM src_live
  )
  SELECT
    SUM(matches)              AS matches,
    SUM(minutes)              AS minutes,
    SUM(goals)                AS goals,
    SUM(shots_on_target)      AS shots_on_target,
    SUM(shots_on_post)        AS shots_on_post,
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

  -- Ratios (não são per-90)
  v_pass_accuracy := CASE
    WHEN COALESCE(v_stats.total_passes, 0) > 0
    THEN COALESCE(v_stats.accurate_passes, 0)::numeric / v_stats.total_passes
    ELSE 0
  END;

  v_duels_win_rate := CASE
    WHEN (COALESCE(v_stats.ground_duels_total, 0) + COALESCE(v_stats.aerial_duels_total, 0)) > 0
    THEN (COALESCE(v_stats.ground_duels_won, 0) + COALESCE(v_stats.aerial_duels_won, 0))::numeric
         / (v_stats.ground_duels_total + v_stats.aerial_duels_total)
    ELSE 0.5
  END;

  -- Per-90
  v_goals_p90                := (COALESCE(v_stats.goals,               0) * 90.0) / v_minutes;
  v_shots_on_target_p90      := (COALESCE(v_stats.shots_on_target,     0) * 90.0) / v_minutes;
  v_shots_on_post_p90        := (COALESCE(v_stats.shots_on_post,       0) * 90.0) / v_minutes;
  v_penalties_won_p90        := (COALESCE(v_stats.penalties_won,       0) * 90.0) / v_minutes;
  v_offsides_p90             := (COALESCE(v_stats.offsides,            0) * 90.0) / v_minutes;
  v_key_passes_p90           := (COALESCE(v_stats.key_passes,          0) * 90.0) / v_minutes;
  v_chances_created_p90      := (COALESCE(v_stats.chances_created,     0) * 90.0) / v_minutes;
  v_crosses_success_p90      := (COALESCE(v_stats.crosses_success,     0) * 90.0) / v_minutes;
  v_crosses_failed_p90       := (COALESCE(v_stats.crosses_failed,      0) * 90.0) / v_minutes;
  v_progressive_passes_p90   := (COALESCE(v_stats.progressive_passes,  0) * 90.0) / v_minutes;
  v_assists_p90              := (COALESCE(v_stats.assists,             0) * 90.0) / v_minutes;
  v_accurate_passes_p90      := (COALESCE(v_stats.accurate_passes,     0) * 90.0) / v_minutes;
  v_long_passes_accurate_p90 := (COALESCE(v_stats.long_passes_accurate, 0) * 90.0) / v_minutes;
  v_long_passes_failed_p90   := (GREATEST(0, COALESCE(v_stats.long_passes_total, 0) - COALESCE(v_stats.long_passes_accurate, 0)) * 90.0) / v_minutes;
  v_successful_dribbles_p90  := (COALESCE(v_stats.successful_dribbles, 0) * 90.0) / v_minutes;
  v_dribbles_failed_p90      := (GREATEST(0, COALESCE(v_stats.total_dribbles,   0) - COALESCE(v_stats.successful_dribbles, 0)) * 90.0) / v_minutes;
  v_fouls_drawn_p90          := (COALESCE(v_stats.fouls_drawn,         0) * 90.0) / v_minutes;
  v_passes_failed_p90        := (GREATEST(0, COALESCE(v_stats.total_passes,     0) - COALESCE(v_stats.accurate_passes,    0)) * 90.0) / v_minutes;
  v_possession_lost_p90      := (COALESCE(v_stats.possession_lost,     0) * 90.0) / v_minutes;
  v_tackles_p90              := (COALESCE(v_stats.tackles,             0) * 90.0) / v_minutes;
  v_interceptions_p90        := (COALESCE(v_stats.interceptions,       0) * 90.0) / v_minutes;
  v_clearances_p90           := (COALESCE(v_stats.clearances,          0) * 90.0) / v_minutes;
  v_blocked_shots_p90        := (COALESCE(v_stats.blocked_shots,       0) * 90.0) / v_minutes;
  v_times_dribbled_past_p90  := (COALESCE(v_stats.times_dribbled_past, 0) * 90.0) / v_minutes;
  v_recoveries_p90           := (COALESCE(v_stats.recoveries,          0) * 90.0) / v_minutes;
  v_ground_duels_won_p90     := (COALESCE(v_stats.ground_duels_won,    0) * 90.0) / v_minutes;
  v_ground_duels_lost_p90    := (GREATEST(0, COALESCE(v_stats.ground_duels_total, 0) - COALESCE(v_stats.ground_duels_won,  0)) * 90.0) / v_minutes;
  v_aerial_duels_won_p90     := (COALESCE(v_stats.aerial_duels_won,    0) * 90.0) / v_minutes;
  v_aerial_duels_lost_p90    := (GREATEST(0, COALESCE(v_stats.aerial_duels_total, 0) - COALESCE(v_stats.aerial_duels_won,  0)) * 90.0) / v_minutes;
  v_fouls_committed_p90      := (COALESCE(v_stats.fouls_committed,     0) * 90.0) / v_minutes;
  v_yellow_p90               := (COALESCE(v_stats.yellow_cards,        0) * 90.0) / v_minutes;
  v_red_p90                  := (COALESCE(v_stats.red_cards,           0) * 90.0) / v_minutes;

  -- ── Sub-scores ATAQUE ─────────────────────────────────────────────────────
  v_s_goals           := LEAST(100.0, (v_goals_p90           / 0.60) * 100.0);
  v_s_shots_on_target := LEAST(100.0, (v_shots_on_target_p90 / 1.80) * 100.0);
  v_s_shots_on_post   := LEAST(100.0, (v_shots_on_post_p90   / 0.50) * 100.0);
  v_s_penalties_won   := LEAST(100.0, (v_penalties_won_p90   / 0.10) * 100.0);
  v_s_offsides_neg    := GREATEST(0.0, 100.0 - (v_offsides_p90 / 1.50) * 100.0);

  v_ata := (v_s_goals + v_s_shots_on_target + v_s_shots_on_post + v_s_penalties_won + v_s_offsides_neg) / 5.0;

  -- ── Sub-scores CRIACAO ────────────────────────────────────────────────────
  v_s_key_passes         := LEAST(100.0, (v_key_passes_p90      / 2.20) * 100.0);
  v_s_chances_created    := LEAST(100.0, (v_chances_created_p90 / 0.80) * 100.0);
  v_s_crosses_success    := LEAST(100.0, (v_crosses_success_p90 / 1.50) * 100.0);
  v_s_crosses_failed_neg := GREATEST(0.0, 100.0 - (v_crosses_failed_p90 / 4.00) * 100.0);
  v_s_progressive_passes := LEAST(100.0, (v_progressive_passes_p90 / 5.00) * 100.0);

  v_cri := (v_s_key_passes + v_s_chances_created + v_s_crosses_success + v_s_crosses_failed_neg + v_s_progressive_passes) / 5.0;

  -- ── Sub-scores TECNICA (ponderado, alinhado com frontend) ────────────────
  -- pass_accuracy (0.30): floor=0.55 target=0.90
  v_s_pass_accuracy       := LEAST(100.0, GREATEST(0.0, (v_pass_accuracy - 0.55) / (0.90 - 0.55) * 100.0));
  -- passes_p90 (0.20): volume de passes precisos por 90, target=55
  v_s_accurate_passes     := LEAST(100.0, (v_accurate_passes_p90   / 45.0) * 100.0);
  -- ball_control (0.20): dribbles bem-sucedidos p90, target=3.0
  v_s_successful_dribbles := LEAST(100.0, (v_successful_dribbles_p90 / 3.00) * 100.0);
  -- progressive_passes_p90 (0.15): target=5.0
  v_s_progressive_passes_tec := LEAST(100.0, (v_progressive_passes_p90 / 5.00) * 100.0);
  -- long_passes_accurate_p90 (0.15): target=4.0
  v_s_long_passes_accurate := LEAST(100.0, (v_long_passes_accurate_p90 / 4.00) * 100.0);

  v_tec := v_s_pass_accuracy       * 0.30
         + v_s_accurate_passes      * 0.20
         + v_s_successful_dribbles  * 0.20
         + v_s_progressive_passes_tec * 0.15
         + v_s_long_passes_accurate * 0.15;

  -- ── Sub-scores DEFESA (ponderado, alinhado com frontend) ─────────────────
  -- tackles_p90 (0.20): target=4.0
  v_s_tackles        := LEAST(100.0, (v_tackles_p90         / 4.00) * 100.0);
  -- interceptions_p90 (0.20): target=2.45
  v_s_interceptions  := LEAST(100.0, (v_interceptions_p90   / 2.45) * 100.0);
  -- recoveries_p90 (0.15): target=9.0
  v_s_recoveries     := LEAST(100.0, (v_recoveries_p90      / 9.00) * 100.0);
  -- duels_win_rate (0.15): floor=0.30 target=0.70
  v_s_duels_win_rate := LEAST(100.0, GREATEST(0.0, (v_duels_win_rate - 0.30) / (0.70 - 0.30) * 100.0));
  -- clearances_p90 (0.15): target=4.20
  v_s_clearances     := LEAST(100.0, (v_clearances_p90      / 4.20) * 100.0);
  -- shots_blocked_p90 (0.15): target=1.50
  v_s_blocked_shots  := LEAST(100.0, (v_blocked_shots_p90   / 1.50) * 100.0);

  v_def := v_s_tackles        * 0.20
         + v_s_interceptions  * 0.20
         + v_s_recoveries     * 0.15
         + v_s_duels_win_rate * 0.15
         + v_s_clearances     * 0.15
         + v_s_blocked_shots  * 0.15;

  -- ── Sub-scores TATICA ─────────────────────────────────────────────────────
  v_s_times_dribbled_neg   := GREATEST(0.0, 100.0 - (v_times_dribbled_past_p90 / 2.80) * 100.0);
  v_s_ground_duels_won     := LEAST(100.0, (v_ground_duels_won_p90  / 3.75) * 100.0);
  v_s_ground_duels_lost_neg := GREATEST(0.0, 100.0 - (v_ground_duels_lost_p90  / 4.00) * 100.0);
  v_s_aerial_duels_won     := LEAST(100.0, (v_aerial_duels_won_p90  / 2.25) * 100.0);
  v_s_aerial_duels_lost_neg := GREATEST(0.0, 100.0 - (v_aerial_duels_lost_p90   / 3.00) * 100.0);
  v_s_fouls_committed_neg  := GREATEST(0.0, 100.0 - (v_fouls_committed_p90      / 3.00) * 100.0);
  v_s_yellow_neg           := GREATEST(0.0, 100.0 - (v_yellow_p90               / 0.30) * 100.0);
  v_s_red_neg              := GREATEST(0.0, 100.0 - (v_red_p90                  / 0.05) * 100.0);

  v_tat := (v_s_ground_duels_won + v_s_ground_duels_lost_neg
            + v_s_aerial_duels_won + v_s_aerial_duels_lost_neg
            + v_s_fouls_committed_neg + v_s_yellow_neg + v_s_red_neg
            + v_s_times_dribbled_neg) / 8.0;

  -- Clamp (sem multiplicador de confiança)
  v_ata := GREATEST(0, LEAST(100, ROUND(GREATEST(0.0, LEAST(100.0, v_ata)))));
  v_cri := GREATEST(0, LEAST(100, ROUND(GREATEST(0.0, LEAST(100.0, v_cri)))));
  v_tec := GREATEST(0, LEAST(100, ROUND(GREATEST(0.0, LEAST(100.0, v_tec)))));
  v_def := GREATEST(0, LEAST(100, ROUND(GREATEST(0.0, LEAST(100.0, v_def)))));
  v_tat := GREATEST(0, LEAST(100, ROUND(GREATEST(0.0, LEAST(100.0, v_tat)))));

  v_per90 := jsonb_build_object(
    'goals',               v_goals_p90,
    'shots_on_target',     v_shots_on_target_p90,
    'shots_on_post',       v_shots_on_post_p90,
    'penalties_won',       v_penalties_won_p90,
    'offsides',            v_offsides_p90,
    'key_passes',          v_key_passes_p90,
    'chances_created',     v_chances_created_p90,
    'crosses_success',     v_crosses_success_p90,
    'crosses_failed',      v_crosses_failed_p90,
    'progressive_passes',  v_progressive_passes_p90,
    'assists',             v_assists_p90,
    'accurate_passes',     v_accurate_passes_p90,
    'long_passes_accurate',v_long_passes_accurate_p90,
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
    'recoveries',          v_recoveries_p90,
    'ground_duels_won',    v_ground_duels_won_p90,
    'ground_duels_lost',   v_ground_duels_lost_p90,
    'aerial_duels_won',    v_aerial_duels_won_p90,
    'aerial_duels_lost',   v_aerial_duels_lost_p90,
    'fouls_committed',     v_fouls_committed_p90,
    'yellow_cards',        v_yellow_p90,
    'red_cards',           v_red_p90,
    'pass_accuracy',       v_pass_accuracy,
    'duels_win_rate',      v_duels_win_rate
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
      'engine_version', 'v11',
      'data_sources',   'player_stats + match_player_stats (all competitions in season)',
      'benchmarks', jsonb_build_object(
        'ata', jsonb_build_object(
          'goals', 0.60, 'shots_on_target', 1.80, 'shots_on_post', 0.50,
          'penalties_won', 0.10, 'offsides_neg', 1.50
        ),
        'cri', jsonb_build_object(
          'key_passes', 2.20, 'chances_created', 0.80, 'crosses_success', 1.50,
          'crosses_failed_neg', 4.00, 'progressive_passes', 5.00
        ),
        'tec', jsonb_build_object(
          'pass_accuracy_floor', 0.55, 'pass_accuracy_target', 0.90,
          'accurate_passes_p90', 45.0, 'successful_dribbles_p90', 3.00,
          'progressive_passes', 5.00, 'long_passes_accurate', 4.00,
          'weights', '0.30/0.20/0.20/0.15/0.15'
        ),
        'def', jsonb_build_object(
          'tackles', 4.00, 'interceptions', 2.45, 'recoveries', 9.00,
          'duels_win_rate_floor', 0.30, 'duels_win_rate_target', 0.70,
          'clearances', 4.20, 'blocked_shots', 1.50,
          'weights', '0.20/0.20/0.15/0.15/0.15/0.15'
        ),
        'tat', jsonb_build_object(
          'ground_duels_won', 3.75, 'aerial_duels_won', 2.25,
          'ground_duels_lost_neg', 4.00, 'aerial_duels_lost_neg', 3.00,
          'fouls_committed_neg', 3.00, 'yellow_neg', 0.30, 'red_neg', 0.05,
          'times_dribbled_neg', 2.80
        )
      )
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'ata', v_ata, 'cri', v_cri, 'tec', v_tec, 'def', v_def, 'tat', v_tat,
    'confidence', v_confidence,
    'minutes', v_minutes,
    'matches', v_matches
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcula todos os scores com o motor v11
SELECT * FROM public.recalculate_all_attribute_scores();
