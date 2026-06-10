-- calculate_player_attribute_scores v7
-- Fix: usa exatamente as mesmas 2 fontes que o hook useAttributeUnifiedStats da UI:
--   1. player_stats       (stats agregados, manuais ou scraping)
--   2. match_player_stats via match_players (eventos ao vivo, status='applied')
-- Remove manual_player_stats (src_mps) que a UI nao usa.
-- Corrige calculo de minutos do src_live com GREATEST(0,...) para evitar negativo.
-- Benchmarks: identicos ao v6 (ja estavam corretos).

CREATE OR REPLACE FUNCTION public.calculate_player_attribute_scores(
  p_player_id      uuid,
  p_competition_id uuid,
  p_season_year    integer
) RETURNS jsonb AS $$
DECLARE
  v_stats    RECORD;
  v_minutes  numeric;
  v_matches  numeric;
  v_confidence numeric;

  v_goals_p90               numeric;
  v_shots_on_target_p90     numeric;
  v_penalties_won_p90       numeric;
  v_offsides_p90            numeric;
  v_assists_p90             numeric;
  v_key_passes_p90          numeric;
  v_chances_created_p90     numeric;
  v_accurate_passes_p90      numeric;
  v_long_passes_accurate_p90 numeric;
  v_crosses_success_p90      numeric;
  v_successful_dribbles_p90  numeric;
  v_possession_lost_p90      numeric;
  v_dribbles_failed_p90      numeric;
  v_passes_failed_p90        numeric;
  v_steals_p90               numeric;
  v_tackles_p90              numeric;
  v_interceptions_p90        numeric;
  v_clearances_p90           numeric;
  v_blocked_shots_p90        numeric;
  v_times_dribbled_past_p90  numeric;
  v_recoveries_p90           numeric;
  v_ground_duels_won_p90     numeric;
  v_aerial_duels_won_p90     numeric;
  v_fouls_drawn_p90          numeric;
  v_fouls_committed_p90      numeric;
  v_yellow_p90               numeric;
  v_red_p90                  numeric;

  v_s_goals                numeric;
  v_s_shots_on_target      numeric;
  v_s_penalties_won        numeric;
  v_s_assists              numeric;
  v_s_key_passes           numeric;
  v_s_chances_created      numeric;
  v_s_accurate_passes      numeric;
  v_s_long_passes_accurate numeric;
  v_s_crosses_success      numeric;
  v_s_successful_dribbles  numeric;
  v_s_steals               numeric;
  v_s_tackles              numeric;
  v_s_interceptions        numeric;
  v_s_clearances           numeric;
  v_s_blocked_shots        numeric;
  v_s_recoveries           numeric;
  v_s_ground_duels_won     numeric;
  v_s_aerial_duels_won     numeric;
  v_s_fouls_drawn          numeric;

  v_pen_offsides           numeric;
  v_pen_possession_lost    numeric;
  v_pen_dribbles_failed    numeric;
  v_pen_passes_failed      numeric;
  v_pen_times_dribbled     numeric;
  v_pen_fouls_committed    numeric;
  v_pen_yellow             numeric;
  v_pen_red                numeric;

  v_ata numeric;
  v_cri numeric;
  v_tec numeric;
  v_def numeric;
  v_tat numeric;

  v_per90        jsonb;
  v_final_scores jsonb;
BEGIN
  -- ============================================================
  -- PASSO 0: Agregar as 2 fontes via UNION ALL + SUM
  -- Fonte 1: player_stats (stats manuais/scraping agregados)
  -- Fonte 2: match_player_stats via match_players (jogos ao vivo aplicados)
  -- ============================================================
  WITH
  src_ps AS (
    SELECT
      ps.matches::numeric                           AS matches,
      ps.minutes::numeric                           AS minutes,
      COALESCE(ps.goals,                0)::numeric AS goals,
      COALESCE(ps.shots_on_target,      0)::numeric AS shots_on_target,
      COALESCE(ps.penalties_won,        0)::numeric AS penalties_won,
      COALESCE(ps.offsides,             0)::numeric AS offsides,
      COALESCE(ps.assists,              0)::numeric AS assists,
      COALESCE(ps.key_passes,           0)::numeric AS key_passes,
      COALESCE(ps.chances_created,      0)::numeric AS chances_created,
      COALESCE(ps.accurate_passes,      0)::numeric AS accurate_passes,
      COALESCE(ps.total_passes,         0)::numeric AS total_passes,
      COALESCE(ps.long_passes_accurate, 0)::numeric AS long_passes_accurate,
      COALESCE(ps.crosses_success,      0)::numeric AS crosses_success,
      COALESCE(ps.successful_dribbles,  0)::numeric AS successful_dribbles,
      COALESCE(ps.total_dribbles,       0)::numeric AS total_dribbles,
      COALESCE(ps.possession_lost,      0)::numeric AS possession_lost,
      COALESCE(ps.steals,               0)::numeric AS steals,
      COALESCE(ps.tackles,              0)::numeric AS tackles,
      COALESCE(ps.interceptions,        0)::numeric AS interceptions,
      COALESCE(ps.clearances,           0)::numeric AS clearances,
      COALESCE(ps.blocked_shots,        0)::numeric AS blocked_shots,
      COALESCE(ps.times_dribbled_past,  0)::numeric AS times_dribbled_past,
      COALESCE(ps.recoveries,           0)::numeric AS recoveries,
      COALESCE(ps.ground_duels_won,     0)::numeric AS ground_duels_won,
      COALESCE(ps.aerial_duels_won,     0)::numeric AS aerial_duels_won,
      COALESCE(ps.fouls_drawn,          0)::numeric AS fouls_drawn,
      COALESCE(ps.fouls_committed,      0)::numeric AS fouls_committed,
      COALESCE(ps.yellow_cards,         0)::numeric AS yellow_cards,
      COALESCE(ps.red_cards,            0)::numeric AS red_cards
    FROM public.player_stats ps
    WHERE ps.player_id      = p_player_id
      AND ps.competition_id = p_competition_id
      AND ps.season_year    = p_season_year
      AND ps.minutes > 0
      AND COALESCE(ps.is_archived, false) = false
  ),
  src_live AS (
    -- Minutos: preferencia a player_field_presence (exato), fallback a match_players.minutes_played
    -- GREATEST(0,...) protege contra valores negativos em ambos os caminhos.
    SELECT
      COUNT(DISTINCT mp.match_id)::numeric AS matches,
      GREATEST(0,
        COALESCE(
          (SELECT SUM(
              GREATEST(0,
                LEAST(COALESCE(pfp.exited_at_seconds, 2700), 2700)
                - LEAST(pfp.entered_at_seconds, 2700)
              )
            )::numeric / 60.0
           FROM public.player_field_presence pfp
           JOIN public.matches pfpm ON pfpm.id = pfp.match_id
           WHERE pfp.player_id       = p_player_id
             AND pfpm.competition_id = p_competition_id
             AND pfpm.season_year    = p_season_year
             AND pfpm.status         = 'applied'),
          SUM(GREATEST(0, LEAST(COALESCE(mp.minutes_played, 0), 90)))::numeric
        )
      ) AS minutes,
      -- match_player_stats: LEFT JOIN para nao perder partidas sem estatisticas
      SUM(COALESCE(mps.goals,            0))::numeric AS goals,
      SUM(COALESCE(mps.shots_on_target,  0))::numeric AS shots_on_target,
      SUM(COALESCE(mps.penalties_won,    0))::numeric AS penalties_won,
      SUM(COALESCE(mps.offsides,         0))::numeric AS offsides,
      SUM(COALESCE(mps.assists,          0))::numeric AS assists,
      SUM(COALESCE(mps.key_passes,       0))::numeric AS key_passes,
      SUM(COALESCE(mps.chances_created,  0))::numeric AS chances_created,
      -- passes_completed = passes certos; passes_total = passes errados (nomeacao historica)
      SUM(COALESCE(mps.passes_completed, 0))::numeric AS accurate_passes,
      SUM(COALESCE(mps.passes_completed, 0) + COALESCE(mps.passes_total, 0))::numeric AS total_passes,
      0::numeric                                      AS long_passes_accurate,
      SUM(COALESCE(mps.crosses_success,  0))::numeric AS crosses_success,
      -- dribbles_total = dribbles errados (nomeacao historica)
      SUM(COALESCE(mps.dribbles_success, 0))::numeric AS successful_dribbles,
      SUM(COALESCE(mps.dribbles_success, 0) + COALESCE(mps.dribbles_total, 0))::numeric AS total_dribbles,
      SUM(COALESCE(mps.possession_lost,  0))::numeric AS possession_lost,
      SUM(COALESCE(mps.steals,           0))::numeric AS steals,
      SUM(COALESCE(mps.tackles,          0))::numeric AS tackles,
      SUM(COALESCE(mps.interceptions,    0))::numeric AS interceptions,
      SUM(COALESCE(mps.clearances,       0))::numeric AS clearances,
      SUM(COALESCE(mps.blocked_shots,    0))::numeric AS blocked_shots,
      SUM(COALESCE(mps.was_dribbled,     0))::numeric AS times_dribbled_past,
      SUM(COALESCE(mps.recoveries,       0))::numeric AS recoveries,
      SUM(COALESCE(mps.duels_won,        0))::numeric AS ground_duels_won,
      SUM(COALESCE(mps.aerial_duels_won, 0))::numeric AS aerial_duels_won,
      SUM(COALESCE(mps.fouls_suffered,   0))::numeric AS fouls_drawn,
      SUM(COALESCE(mps.fouls_committed,  0))::numeric AS fouls_committed,
      SUM(COALESCE(mps.yellow_cards,     0))::numeric AS yellow_cards,
      SUM(COALESCE(mps.red_cards,        0))::numeric AS red_cards
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    LEFT JOIN public.match_player_stats mps
           ON mps.match_id  = mp.match_id
          AND mps.player_id = mp.player_id
    WHERE mp.player_id                   = p_player_id
      AND m.competition_id               = p_competition_id
      AND m.season_year                  = p_season_year
      AND m.status                       = 'applied'
      AND COALESCE(mp.is_removed, false) = false
    HAVING COUNT(DISTINCT mp.match_id) > 0
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
    SUM(penalties_won)        AS penalties_won,
    SUM(offsides)             AS offsides,
    SUM(assists)              AS assists,
    SUM(key_passes)           AS key_passes,
    SUM(chances_created)      AS chances_created,
    SUM(accurate_passes)      AS accurate_passes,
    SUM(total_passes)         AS total_passes,
    SUM(long_passes_accurate) AS long_passes_accurate,
    SUM(crosses_success)      AS crosses_success,
    SUM(successful_dribbles)  AS successful_dribbles,
    SUM(total_dribbles)       AS total_dribbles,
    SUM(possession_lost)      AS possession_lost,
    SUM(steals)               AS steals,
    SUM(tackles)              AS tackles,
    SUM(interceptions)        AS interceptions,
    SUM(clearances)           AS clearances,
    SUM(blocked_shots)        AS blocked_shots,
    SUM(times_dribbled_past)  AS times_dribbled_past,
    SUM(recoveries)           AS recoveries,
    SUM(ground_duels_won)     AS ground_duels_won,
    SUM(aerial_duels_won)     AS aerial_duels_won,
    SUM(fouls_drawn)          AS fouls_drawn,
    SUM(fouls_committed)      AS fouls_committed,
    SUM(yellow_cards)         AS yellow_cards,
    SUM(red_cards)            AS red_cards
  INTO v_stats
  FROM all_sources;

  v_minutes := COALESCE(v_stats.minutes, 0)::numeric;
  v_matches := COALESCE(v_stats.matches, 0)::numeric;

  IF v_minutes <= 0 THEN
    RETURN jsonb_build_object('error', 'No minutes played');
  END IF;

  -- Confianca: 1.0 a partir de 900 minutos (~10 jogos completos)
  v_confidence := LEAST(1.0, v_minutes / 900.0);

  -- ============================================================
  -- PASSO 1: Per-90
  -- ============================================================
  v_goals_p90           := (COALESCE(v_stats.goals,           0) * 90.0) / v_minutes;
  v_shots_on_target_p90 := (COALESCE(v_stats.shots_on_target, 0) * 90.0) / v_minutes;
  v_penalties_won_p90   := (COALESCE(v_stats.penalties_won,   0) * 90.0) / v_minutes;
  v_offsides_p90        := (COALESCE(v_stats.offsides,        0) * 90.0) / v_minutes;

  v_assists_p90         := (COALESCE(v_stats.assists,         0) * 90.0) / v_minutes;
  v_key_passes_p90      := (COALESCE(v_stats.key_passes,      0) * 90.0) / v_minutes;
  v_chances_created_p90 := (COALESCE(v_stats.chances_created, 0) * 90.0) / v_minutes;

  v_accurate_passes_p90      := (COALESCE(v_stats.accurate_passes,      0) * 90.0) / v_minutes;
  v_long_passes_accurate_p90 := (COALESCE(v_stats.long_passes_accurate, 0) * 90.0) / v_minutes;
  v_crosses_success_p90      := (COALESCE(v_stats.crosses_success,      0) * 90.0) / v_minutes;
  v_successful_dribbles_p90  := (COALESCE(v_stats.successful_dribbles,  0) * 90.0) / v_minutes;

  v_possession_lost_p90 := (COALESCE(v_stats.possession_lost, 0) * 90.0) / v_minutes;
  v_dribbles_failed_p90 := (GREATEST(0, COALESCE(v_stats.total_dribbles, 0) - COALESCE(v_stats.successful_dribbles, 0)) * 90.0) / v_minutes;
  v_passes_failed_p90   := (GREATEST(0, COALESCE(v_stats.total_passes,   0) - COALESCE(v_stats.accurate_passes,    0)) * 90.0) / v_minutes;

  v_steals_p90              := (COALESCE(v_stats.steals,           0) * 90.0) / v_minutes;
  v_tackles_p90             := (COALESCE(v_stats.tackles,          0) * 90.0) / v_minutes;
  v_interceptions_p90       := (COALESCE(v_stats.interceptions,    0) * 90.0) / v_minutes;
  v_clearances_p90          := (COALESCE(v_stats.clearances,       0) * 90.0) / v_minutes;
  v_blocked_shots_p90       := (COALESCE(v_stats.blocked_shots,    0) * 90.0) / v_minutes;
  v_times_dribbled_past_p90 := (COALESCE(v_stats.times_dribbled_past, 0) * 90.0) / v_minutes;

  v_recoveries_p90       := (COALESCE(v_stats.recoveries,       0) * 90.0) / v_minutes;
  v_ground_duels_won_p90 := (COALESCE(v_stats.ground_duels_won, 0) * 90.0) / v_minutes;
  v_aerial_duels_won_p90 := (COALESCE(v_stats.aerial_duels_won, 0) * 90.0) / v_minutes;
  v_fouls_drawn_p90      := (COALESCE(v_stats.fouls_drawn,      0) * 90.0) / v_minutes;

  v_fouls_committed_p90 := (COALESCE(v_stats.fouls_committed, 0) * 90.0) / v_minutes;
  v_yellow_p90          := (COALESCE(v_stats.yellow_cards,    0) * 90.0) / v_minutes;
  v_red_p90             := (COALESCE(v_stats.red_cards,       0) * 90.0) / v_minutes;

  -- ============================================================
  -- PASSO 2: Sub-scores 0-100 (benchmarks v6/v7)
  -- ============================================================
  -- ATAQUE
  v_s_goals           := GREATEST(0, LEAST(100.0, (v_goals_p90           / 0.55) * 100.0));
  v_s_shots_on_target := GREATEST(0, LEAST(100.0, (v_shots_on_target_p90 / 1.80) * 100.0));
  v_s_penalties_won   := GREATEST(0, LEAST(100.0, (v_penalties_won_p90   / 0.25) * 100.0));

  -- CRIACAO
  v_s_assists         := GREATEST(0, LEAST(100.0, (v_assists_p90         / 0.45) * 100.0));
  v_s_key_passes      := GREATEST(0, LEAST(100.0, (v_key_passes_p90      / 2.20) * 100.0));
  v_s_chances_created := GREATEST(0, LEAST(100.0, (v_chances_created_p90 / 3.50) * 100.0));

  -- TECNICA
  v_s_accurate_passes      := GREATEST(0, LEAST(100.0, (v_accurate_passes_p90      / 40.0) * 100.0));
  v_s_long_passes_accurate := GREATEST(0, LEAST(100.0, (v_long_passes_accurate_p90 /  6.0) * 100.0));
  v_s_crosses_success      := GREATEST(0, LEAST(100.0, (v_crosses_success_p90      /  3.0) * 100.0));
  v_s_successful_dribbles  := GREATEST(0, LEAST(100.0, (v_successful_dribbles_p90  /  3.5) * 100.0));

  -- DEFESA (tetos reduzidos 30% vs baseline original)
  v_s_steals        := GREATEST(0, LEAST(100.0, (v_steals_p90        / 2.80) * 100.0));
  v_s_tackles       := GREATEST(0, LEAST(100.0, (v_tackles_p90       / 3.15) * 100.0));
  v_s_interceptions := GREATEST(0, LEAST(100.0, (v_interceptions_p90 / 2.45) * 100.0));
  v_s_clearances    := GREATEST(0, LEAST(100.0, (v_clearances_p90    / 4.20) * 100.0));
  v_s_blocked_shots := GREATEST(0, LEAST(100.0, (v_blocked_shots_p90 / 1.05) * 100.0));

  -- TATICA (tetos reduzidos 25% vs baseline original)
  v_s_recoveries       := GREATEST(0, LEAST(100.0, (v_recoveries_p90       / 9.00) * 100.0));
  v_s_ground_duels_won := GREATEST(0, LEAST(100.0, (v_ground_duels_won_p90 / 3.75) * 100.0));
  v_s_aerial_duels_won := GREATEST(0, LEAST(100.0, (v_aerial_duels_won_p90 / 2.25) * 100.0));
  v_s_fouls_drawn      := GREATEST(0, LEAST(100.0, (v_fouls_drawn_p90      / 2.60) * 100.0));

  -- ============================================================
  -- PASSO 3: Penalidades
  -- ============================================================
  v_pen_offsides        := LEAST(15.0, (v_offsides_p90            /  2.0)   * 15.0);
  v_pen_possession_lost := LEAST(15.0, (v_possession_lost_p90     / 15.0)   * 15.0);
  v_pen_dribbles_failed := LEAST( 8.0, (v_dribbles_failed_p90     /  4.0)   *  8.0);
  v_pen_passes_failed   := LEAST( 7.0, (v_passes_failed_p90       / 15.0)   *  7.0);
  v_pen_times_dribbled  := LEAST(20.0, (v_times_dribbled_past_p90 /  2.80)  * 20.0);
  v_pen_fouls_committed := LEAST(20.0, (v_fouls_committed_p90     /  3.0)   * 20.0);
  v_pen_yellow          := LEAST(20.0, (v_yellow_p90              /  0.30)  * 20.0);
  v_pen_red             := LEAST(30.0, (v_red_p90                 /  0.075) * 30.0);

  -- ============================================================
  -- PASSO 4: Scores dos 5 eixos
  -- ============================================================
  v_ata := (v_s_goals * 0.46) + (v_s_shots_on_target * 0.31) + (v_s_penalties_won * 0.23)
           - v_pen_offsides;
  v_cri := (v_s_assists * 0.35) + (v_s_key_passes * 0.35) + (v_s_chances_created * 0.30);
  v_tec := (v_s_accurate_passes * 0.30) + (v_s_long_passes_accurate * 0.15)
           + (v_s_crosses_success * 0.20) + (v_s_successful_dribbles * 0.35)
           - v_pen_possession_lost - v_pen_dribbles_failed - v_pen_passes_failed;
  v_def := (v_s_steals * 0.25) + (v_s_tackles * 0.25) + (v_s_interceptions * 0.20)
           + (v_s_clearances * 0.20) + (v_s_blocked_shots * 0.10)
           - v_pen_times_dribbled;
  v_tat := (v_s_recoveries * 0.30) + (v_s_ground_duels_won * 0.25)
           + (v_s_aerial_duels_won * 0.25) + (v_s_fouls_drawn * 0.20)
           - v_pen_fouls_committed - v_pen_yellow - v_pen_red;

  -- Clamp 0-100 antes de aplicar confianca
  v_ata := GREATEST(0.0, LEAST(100.0, v_ata));
  v_cri := GREATEST(0.0, LEAST(100.0, v_cri));
  v_tec := GREATEST(0.0, LEAST(100.0, v_tec));
  v_def := GREATEST(0.0, LEAST(100.0, v_def));
  v_tat := GREATEST(0.0, LEAST(100.0, v_tat));

  -- Aplicar fator de confianca (1.0 >= 900 min)
  v_ata := v_ata * v_confidence;
  v_cri := v_cri * v_confidence;
  v_tec := v_tec * v_confidence;
  v_def := v_def * v_confidence;
  v_tat := v_tat * v_confidence;

  -- Arredondar para inteiro final
  v_ata := GREATEST(0, LEAST(100, ROUND(v_ata)));
  v_cri := GREATEST(0, LEAST(100, ROUND(v_cri)));
  v_tec := GREATEST(0, LEAST(100, ROUND(v_tec)));
  v_def := GREATEST(0, LEAST(100, ROUND(v_def)));
  v_tat := GREATEST(0, LEAST(100, ROUND(v_tat)));

  -- ============================================================
  -- PASSO 5: Montar JSONs de detalhes
  -- ============================================================
  v_per90 := jsonb_build_object(
    'goals',               v_goals_p90,
    'shots_on_target',     v_shots_on_target_p90,
    'penalties_won',       v_penalties_won_p90,
    'offsides',            v_offsides_p90,
    'assists',             v_assists_p90,
    'key_passes',          v_key_passes_p90,
    'chances_created',     v_chances_created_p90,
    'accurate_passes',     v_accurate_passes_p90,
    'long_passes_accurate',v_long_passes_accurate_p90,
    'crosses_success',     v_crosses_success_p90,
    'successful_dribbles', v_successful_dribbles_p90,
    'possession_lost',     v_possession_lost_p90,
    'dribbles_failed',     v_dribbles_failed_p90,
    'passes_failed',       v_passes_failed_p90,
    'steals',              v_steals_p90,
    'tackles',             v_tackles_p90,
    'interceptions',       v_interceptions_p90,
    'clearances',          v_clearances_p90,
    'blocked_shots',       v_blocked_shots_p90,
    'times_dribbled_past', v_times_dribbled_past_p90,
    'recoveries',          v_recoveries_p90,
    'ground_duels_won',    v_ground_duels_won_p90,
    'aerial_duels_won',    v_aerial_duels_won_p90,
    'fouls_drawn',         v_fouls_drawn_p90,
    'fouls_committed',     v_fouls_committed_p90,
    'yellow_cards',        v_yellow_p90,
    'red_cards',           v_red_p90
  );

  v_final_scores := jsonb_build_object(
    'ata', v_ata, 'cri', v_cri, 'tec', v_tec, 'def', v_def, 'tat', v_tat
  );

  -- ============================================================
  -- PASSO 6: Persistir em player_attribute_scores (UPSERT)
  -- ============================================================
  INSERT INTO public.player_attribute_scores (
    player_id, competition_id, season_year,
    ata_score_100, tec_score_100, def_score_100, tat_score_100, cri_score_100,
    attr_confidence, details, updated_at
  ) VALUES (
    p_player_id, p_competition_id, p_season_year,
    v_ata, v_tec, v_def, v_tat, v_cri,
    v_confidence,
    jsonb_build_object(
      'minutes',      v_minutes,
      'matches',      v_matches,
      'per90',        v_per90,
      'final_scores', v_final_scores,
      'benchmarks', jsonb_build_object(
        'engine_version', 'v7',
        'data_sources',   'player_stats + match_player_stats',
        'ata', jsonb_build_object('goals_cap', 0.55, 'shots_on_target_cap', 1.80, 'penalties_won_cap', 0.25),
        'cri', jsonb_build_object('assists_cap', 0.45, 'key_passes_cap', 2.20, 'chances_created_cap', 3.50),
        'tec', jsonb_build_object('accurate_passes_cap', 40, 'successful_dribbles_cap', 3.5),
        'def', jsonb_build_object('steals_cap', 2.80, 'tackles_cap', 3.15, 'interceptions_cap', 2.45),
        'tat', jsonb_build_object('recoveries_cap', 9.0, 'aerial_duels_won_cap', 2.25)
      )
    ),
    now()
  )
  ON CONFLICT (player_id, competition_id, season_year)
  DO UPDATE SET
    ata_score_100   = EXCLUDED.ata_score_100,
    tec_score_100   = EXCLUDED.tec_score_100,
    def_score_100   = EXCLUDED.def_score_100,
    tat_score_100   = EXCLUDED.tat_score_100,
    cri_score_100   = EXCLUDED.cri_score_100,
    attr_confidence = EXCLUDED.attr_confidence,
    details         = EXCLUDED.details,
    updated_at      = now();

  RETURN jsonb_build_object(
    'success', true,
    'ata', v_ata, 'cri', v_cri, 'tec', v_tec, 'def', v_def, 'tat', v_tat,
    'confidence', v_confidence,
    'minutes', v_minutes,
    'matches', v_matches
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Orquestrador por jogador: itera todos os buckets (competition+season)
-- nas 2 fontes e recalcula cada um.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_player_all_attributes(p_player_id uuid)
RETURNS TABLE(competition_id uuid, season_year integer, result jsonb) AS $$
BEGIN
  RETURN QUERY
  WITH all_buckets AS (
    SELECT DISTINCT ps.competition_id, ps.season_year
    FROM public.player_stats ps
    WHERE ps.player_id      = p_player_id
      AND ps.competition_id IS NOT NULL
      AND ps.minutes        > 0
      AND COALESCE(ps.is_archived, false) = false
    UNION
    SELECT DISTINCT m.competition_id, m.season_year
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id                   = p_player_id
      AND m.competition_id               IS NOT NULL
      AND m.status                       = 'applied'
      AND COALESCE(mp.is_removed, false) = false
  )
  SELECT
    ab.competition_id,
    ab.season_year,
    public.calculate_player_attribute_scores(p_player_id, ab.competition_id, ab.season_year) AS result
  FROM all_buckets ab;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Orquestrador global: percorre todos os jogadores com dados
-- em qualquer das 2 fontes e dispara recalculo completo.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_all_attribute_scores()
RETURNS TABLE(player_id uuid, player_name text, rows_processed integer) AS $$
DECLARE
  v_player RECORD;
  v_count  integer;
BEGIN
  FOR v_player IN
    SELECT DISTINCT p.id, p.full_name
    FROM public.players p
    WHERE p.id IN (
      SELECT DISTINCT ps2.player_id
      FROM public.player_stats ps2
      WHERE ps2.minutes        > 0
        AND ps2.competition_id IS NOT NULL
        AND COALESCE(ps2.is_archived, false) = false
      UNION
      SELECT DISTINCT mp2.player_id
      FROM public.match_players mp2
      JOIN public.matches m2 ON m2.id = mp2.match_id
      WHERE m2.status         = 'applied'
        AND m2.competition_id IS NOT NULL
        AND COALESCE(mp2.is_removed, false) = false
    )
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.recalculate_player_all_attributes(v_player.id);
    RETURN QUERY SELECT v_player.id, v_player.full_name, v_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara recalculo completo imediatamente
SELECT * FROM public.recalculate_all_attribute_scores();
