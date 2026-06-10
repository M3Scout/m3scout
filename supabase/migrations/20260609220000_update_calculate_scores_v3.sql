-- calculate_player_attribute_scores v3
--
-- Mudanças em relação à v2:
--   ATA: inclui penalties_won com peso 3× relativo
--        Pesos relativos [goals=6, shots_on_target=4, penalties_won=3] → normalizados para somar 1.0:
--        goals=0.46 | shots_on_target=0.31 | penalties_won=0.23
--        Benchmark penalties_won: 0.25 pênaltis/90 = nível elite
--   DEF: usa player_stats.blocked_shots diretamente (sem subquery em match_player_stats)
--        Peso mantido em 0.10

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

  -- Per-90 variables
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

  -- Sub-scores normalizados 0-100 por stat
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

  -- Penalidades (pontos deduzidos do eixo)
  v_pen_offsides           numeric;
  v_pen_possession_lost    numeric;
  v_pen_dribbles_failed    numeric;
  v_pen_passes_failed      numeric;
  v_pen_times_dribbled     numeric;
  v_pen_fouls_committed    numeric;
  v_pen_yellow             numeric;
  v_pen_red                numeric;

  -- Scores finais dos 5 eixos
  v_ata numeric;
  v_cri numeric;
  v_tec numeric;
  v_def numeric;
  v_tat numeric;

  v_per90        jsonb;
  v_final_scores jsonb;
BEGIN
  SELECT * INTO v_stats
  FROM public.player_stats
  WHERE player_id      = p_player_id
    AND competition_id = p_competition_id
    AND season_year    = p_season_year
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No stats found');
  END IF;

  v_minutes := COALESCE(v_stats.minutes, 0)::numeric;
  v_matches := COALESCE(v_stats.matches, 0)::numeric;

  IF v_minutes <= 0 THEN
    RETURN jsonb_build_object('error', 'No minutes played');
  END IF;

  -- Confiança: 100% a partir de 900 min (≈10 jogos completos)
  v_confidence := LEAST(1.0, v_minutes / 900.0);

  -- ============================================================
  -- PASSO 1: Converter todas as stats → Per 90 minutos
  -- Fórmula: (valor_bruto / GREATEST(minutos, 1)) * 90
  -- ============================================================

  -- ATA
  v_goals_p90           := (COALESCE(v_stats.goals,           0)::numeric * 90.0) / v_minutes;
  v_shots_on_target_p90 := (COALESCE(v_stats.shots_on_target, 0)::numeric * 90.0) / v_minutes;
  v_penalties_won_p90   := (COALESCE(v_stats.penalties_won,   0)::numeric * 90.0) / v_minutes;
  v_offsides_p90        := (COALESCE(v_stats.offsides,        0)::numeric * 90.0) / v_minutes;

  -- CRI
  v_assists_p90         := (COALESCE(v_stats.assists,         0)::numeric * 90.0) / v_minutes;
  v_key_passes_p90      := (COALESCE(v_stats.key_passes,      0)::numeric * 90.0) / v_minutes;
  v_chances_created_p90 := (COALESCE(v_stats.chances_created, 0)::numeric * 90.0) / v_minutes;

  -- TEC — positivos
  v_accurate_passes_p90      := (COALESCE(v_stats.accurate_passes,      0)::numeric * 90.0) / v_minutes;
  v_long_passes_accurate_p90 := (COALESCE(v_stats.long_passes_accurate, 0)::numeric * 90.0) / v_minutes;
  v_crosses_success_p90      := (COALESCE(v_stats.crosses_success,      0)::numeric * 90.0) / v_minutes;
  v_successful_dribbles_p90  := (COALESCE(v_stats.successful_dribbles,  0)::numeric * 90.0) / v_minutes;

  -- TEC — penalidades
  v_possession_lost_p90 := (COALESCE(v_stats.possession_lost, 0)::numeric * 90.0) / v_minutes;
  v_dribbles_failed_p90 := (GREATEST(0, COALESCE(v_stats.total_dribbles, 0) - COALESCE(v_stats.successful_dribbles, 0))::numeric * 90.0) / v_minutes;
  v_passes_failed_p90   := (GREATEST(0, COALESCE(v_stats.total_passes,   0) - COALESCE(v_stats.accurate_passes,    0))::numeric * 90.0) / v_minutes;

  -- DEF — positivos (blocked_shots lido diretamente de player_stats)
  v_steals_p90         := (COALESCE(v_stats.steals,        0)::numeric * 90.0) / v_minutes;
  v_tackles_p90        := (COALESCE(v_stats.tackles,       0)::numeric * 90.0) / v_minutes;
  v_interceptions_p90  := (COALESCE(v_stats.interceptions, 0)::numeric * 90.0) / v_minutes;
  v_clearances_p90     := (COALESCE(v_stats.clearances,    0)::numeric * 90.0) / v_minutes;
  v_blocked_shots_p90  := (COALESCE(v_stats.blocked_shots, 0)::numeric * 90.0) / v_minutes;

  -- DEF — penalidade
  v_times_dribbled_past_p90 := (COALESCE(v_stats.times_dribbled_past, 0)::numeric * 90.0) / v_minutes;

  -- TAT — positivos
  v_recoveries_p90       := (COALESCE(v_stats.recoveries,       0)::numeric * 90.0) / v_minutes;
  v_ground_duels_won_p90 := (COALESCE(v_stats.ground_duels_won, 0)::numeric * 90.0) / v_minutes;
  v_aerial_duels_won_p90 := (COALESCE(v_stats.aerial_duels_won, 0)::numeric * 90.0) / v_minutes;
  v_fouls_drawn_p90      := (COALESCE(v_stats.fouls_drawn,      0)::numeric * 90.0) / v_minutes;

  -- TAT — penalidades
  v_fouls_committed_p90 := (COALESCE(v_stats.fouls_committed, 0)::numeric * 90.0) / v_minutes;
  v_yellow_p90          := (COALESCE(v_stats.yellow_cards,    0)::numeric * 90.0) / v_minutes;
  v_red_p90             := (COALESCE(v_stats.red_cards,       0)::numeric * 90.0) / v_minutes;

  -- ============================================================
  -- PASSO 2: Normalizar cada p90 → sub-score 0-100
  -- Benchmark (cap) = valor p90 que representa nível de elite (nota 100)
  -- ============================================================

  -- ATA
  v_s_goals           := LEAST(100.0, (v_goals_p90           / 0.75) * 100.0);  -- 0.75 gols/90
  v_s_shots_on_target := LEAST(100.0, (v_shots_on_target_p90 / 2.50) * 100.0);  -- 2.5 finalizações certas/90
  v_s_penalties_won   := LEAST(100.0, (v_penalties_won_p90   / 0.25) * 100.0);  -- 0.25 pênaltis sofridos/90 = elite

  -- CRI
  v_s_assists         := LEAST(100.0, (v_assists_p90         / 0.45) * 100.0);
  v_s_key_passes      := LEAST(100.0, (v_key_passes_p90      / 3.50) * 100.0);
  v_s_chances_created := LEAST(100.0, (v_chances_created_p90 / 3.50) * 100.0);

  -- TEC
  v_s_accurate_passes      := LEAST(100.0, (v_accurate_passes_p90      / 60.0) * 100.0);
  v_s_long_passes_accurate := LEAST(100.0, (v_long_passes_accurate_p90 /  6.0) * 100.0);
  v_s_crosses_success      := LEAST(100.0, (v_crosses_success_p90      /  3.0) * 100.0);
  v_s_successful_dribbles  := LEAST(100.0, (v_successful_dribbles_p90  /  3.5) * 100.0);

  -- DEF
  v_s_steals         := LEAST(100.0, (v_steals_p90         / 4.0) * 100.0);
  v_s_tackles        := LEAST(100.0, (v_tackles_p90        / 4.5) * 100.0);
  v_s_interceptions  := LEAST(100.0, (v_interceptions_p90  / 3.5) * 100.0);
  v_s_clearances     := LEAST(100.0, (v_clearances_p90     / 6.0) * 100.0);
  v_s_blocked_shots  := LEAST(100.0, (v_blocked_shots_p90  / 1.5) * 100.0);  -- 1.5 chutes bloqueados/90

  -- TAT
  v_s_recoveries       := LEAST(100.0, (v_recoveries_p90       / 12.0) * 100.0);
  v_s_ground_duels_won := LEAST(100.0, (v_ground_duels_won_p90 /  5.0) * 100.0);
  v_s_aerial_duels_won := LEAST(100.0, (v_aerial_duels_won_p90 /  3.0) * 100.0);
  v_s_fouls_drawn      := LEAST(100.0, (v_fouls_drawn_p90      /  3.5) * 100.0);

  -- Piso em 0 para todos os sub-scores
  v_s_goals                := GREATEST(0.0, v_s_goals);
  v_s_shots_on_target      := GREATEST(0.0, v_s_shots_on_target);
  v_s_penalties_won        := GREATEST(0.0, v_s_penalties_won);
  v_s_assists              := GREATEST(0.0, v_s_assists);
  v_s_key_passes           := GREATEST(0.0, v_s_key_passes);
  v_s_chances_created      := GREATEST(0.0, v_s_chances_created);
  v_s_accurate_passes      := GREATEST(0.0, v_s_accurate_passes);
  v_s_long_passes_accurate := GREATEST(0.0, v_s_long_passes_accurate);
  v_s_crosses_success      := GREATEST(0.0, v_s_crosses_success);
  v_s_successful_dribbles  := GREATEST(0.0, v_s_successful_dribbles);
  v_s_steals               := GREATEST(0.0, v_s_steals);
  v_s_tackles              := GREATEST(0.0, v_s_tackles);
  v_s_interceptions        := GREATEST(0.0, v_s_interceptions);
  v_s_clearances           := GREATEST(0.0, v_s_clearances);
  v_s_blocked_shots        := GREATEST(0.0, v_s_blocked_shots);
  v_s_recoveries           := GREATEST(0.0, v_s_recoveries);
  v_s_ground_duels_won     := GREATEST(0.0, v_s_ground_duels_won);
  v_s_aerial_duels_won     := GREATEST(0.0, v_s_aerial_duels_won);
  v_s_fouls_drawn          := GREATEST(0.0, v_s_fouls_drawn);

  -- ============================================================
  -- PASSO 3: Penalidades (dedução em pontos do score do eixo)
  -- ============================================================

  v_pen_offsides        := LEAST(15.0, (v_offsides_p90            / 2.0)  * 15.0);  -- ATA: max -15
  v_pen_possession_lost := LEAST(15.0, (v_possession_lost_p90     / 15.0) * 15.0);  -- TEC: max -15
  v_pen_dribbles_failed := LEAST( 8.0, (v_dribbles_failed_p90     /  4.0) *  8.0);  -- TEC: max -8
  v_pen_passes_failed   := LEAST( 7.0, (v_passes_failed_p90       / 15.0) *  7.0);  -- TEC: max -7
  v_pen_times_dribbled  := LEAST(20.0, (v_times_dribbled_past_p90 /  4.0) * 20.0);  -- DEF: max -20
  v_pen_fouls_committed := LEAST(20.0, (v_fouls_committed_p90     /  4.0) * 20.0);  -- TAT: max -20
  v_pen_yellow          := LEAST(20.0, (v_yellow_p90              /  0.4) * 20.0);  -- TAT: max -20
  v_pen_red             := LEAST(30.0, (v_red_p90                 /  0.1) * 30.0);  -- TAT: max -30

  -- ============================================================
  -- PASSO 4: Score de cada eixo
  --
  -- ATA — pesos relativos [gols=6, finalizações=4, penalties_won=3] → soma = 13
  --        Normalizados: 6/13≈0.46 | 4/13≈0.31 | 3/13≈0.23
  --        Isso implementa "penalties_won * 3": cada pênalti sofrido
  --        tem peso 3× em relação a 1 unidade de contribuição.
  --
  -- DEF — blocked_shots com peso 0.10 (× 1), lido direto de player_stats
  -- ============================================================

  v_ata := (v_s_goals           * 0.46)
         + (v_s_shots_on_target * 0.31)
         + (v_s_penalties_won   * 0.23)   -- "penalties_won * 3" relativo
         - v_pen_offsides;

  v_cri := (v_s_assists         * 0.35)
         + (v_s_key_passes       * 0.35)
         + (v_s_chances_created  * 0.30);

  v_tec := (v_s_accurate_passes      * 0.30)
         + (v_s_long_passes_accurate  * 0.15)
         + (v_s_crosses_success       * 0.20)
         + (v_s_successful_dribbles   * 0.35)
         - v_pen_possession_lost
         - v_pen_dribbles_failed
         - v_pen_passes_failed;

  v_def := (v_s_steals         * 0.25)
         + (v_s_tackles         * 0.25)
         + (v_s_interceptions   * 0.20)
         + (v_s_clearances      * 0.20)
         + (v_s_blocked_shots   * 0.10)   -- "blocked_shots * 1"
         - v_pen_times_dribbled;

  v_tat := (v_s_recoveries       * 0.30)
         + (v_s_ground_duels_won  * 0.25)
         + (v_s_aerial_duels_won  * 0.25)
         + (v_s_fouls_drawn       * 0.20)
         - v_pen_fouls_committed
         - v_pen_yellow
         - v_pen_red;

  -- Travar piso/teto antes do shrink
  v_ata := GREATEST(0.0, LEAST(100.0, v_ata));
  v_cri := GREATEST(0.0, LEAST(100.0, v_cri));
  v_tec := GREATEST(0.0, LEAST(100.0, v_tec));
  v_def := GREATEST(0.0, LEAST(100.0, v_def));
  v_tat := GREATEST(0.0, LEAST(100.0, v_tat));

  -- ============================================================
  -- PASSO 5: Shrink de confiança → poucos minutos puxa score em direção a 50
  -- ============================================================
  v_ata := (v_confidence * v_ata) + ((1.0 - v_confidence) * 50.0);
  v_cri := (v_confidence * v_cri) + ((1.0 - v_confidence) * 50.0);
  v_tec := (v_confidence * v_tec) + ((1.0 - v_confidence) * 50.0);
  v_def := (v_confidence * v_def) + ((1.0 - v_confidence) * 50.0);
  v_tat := (v_confidence * v_tat) + ((1.0 - v_confidence) * 50.0);

  -- Clamp final + arredondamento
  v_ata := GREATEST(0, LEAST(100, ROUND(v_ata)));
  v_cri := GREATEST(0, LEAST(100, ROUND(v_cri)));
  v_tec := GREATEST(0, LEAST(100, ROUND(v_tec)));
  v_def := GREATEST(0, LEAST(100, ROUND(v_def)));
  v_tat := GREATEST(0, LEAST(100, ROUND(v_tat)));

  -- ============================================================
  -- PASSO 6: Persistir
  -- ============================================================
  v_per90 := jsonb_build_object(
    'goals',                v_goals_p90,
    'shots_on_target',      v_shots_on_target_p90,
    'penalties_won',        v_penalties_won_p90,
    'offsides',             v_offsides_p90,
    'assists',              v_assists_p90,
    'key_passes',           v_key_passes_p90,
    'chances_created',      v_chances_created_p90,
    'accurate_passes',      v_accurate_passes_p90,
    'long_passes_accurate', v_long_passes_accurate_p90,
    'crosses_success',      v_crosses_success_p90,
    'successful_dribbles',  v_successful_dribbles_p90,
    'possession_lost',      v_possession_lost_p90,
    'dribbles_failed',      v_dribbles_failed_p90,
    'passes_failed',        v_passes_failed_p90,
    'steals',               v_steals_p90,
    'tackles',              v_tackles_p90,
    'interceptions',        v_interceptions_p90,
    'clearances',           v_clearances_p90,
    'blocked_shots',        v_blocked_shots_p90,
    'times_dribbled_past',  v_times_dribbled_past_p90,
    'recoveries',           v_recoveries_p90,
    'ground_duels_won',     v_ground_duels_won_p90,
    'aerial_duels_won',     v_aerial_duels_won_p90,
    'fouls_drawn',          v_fouls_drawn_p90,
    'fouls_committed',      v_fouls_committed_p90,
    'yellow_cards',         v_yellow_p90,
    'red_cards',            v_red_p90
  );

  v_final_scores := jsonb_build_object(
    'ata', v_ata, 'cri', v_cri, 'tec', v_tec, 'def', v_def, 'tat', v_tat
  );

  INSERT INTO public.player_attribute_scores (
    player_id, competition_id, season_year,
    ata_score_100, tec_score_100, def_score_100, tat_score_100, cri_score_100,
    attr_confidence, details, updated_at
  )
  VALUES (
    p_player_id, p_competition_id, p_season_year,
    v_ata, v_tec, v_def, v_tat, v_cri,
    v_confidence,
    jsonb_build_object(
      'minutes',      v_minutes,
      'matches',      v_matches,
      'per90',        v_per90,
      'final_scores', v_final_scores,
      'benchmarks', jsonb_build_object(
        'ata', jsonb_build_object(
          'goals_cap', 0.75,            'shots_on_target_cap', 2.5,
          'penalties_won_cap', 0.25,    'penalties_won_relative_weight', 3,
          'offsides_penalty_cap', 2.0,  'offsides_max_deduction', 15
        ),
        'cri', jsonb_build_object(
          'assists_cap', 0.45, 'key_passes_cap', 3.5, 'chances_created_cap', 3.5
        ),
        'tec', jsonb_build_object(
          'accurate_passes_cap', 60,       'long_passes_accurate_cap', 6,
          'crosses_success_cap', 3,        'successful_dribbles_cap', 3.5,
          'possession_lost_penalty_cap', 15, 'dribbles_failed_penalty_cap', 4,
          'passes_failed_penalty_cap', 15
        ),
        'def', jsonb_build_object(
          'steals_cap', 4.0,        'tackles_cap', 4.5,
          'interceptions_cap', 3.5, 'clearances_cap', 6.0,
          'blocked_shots_cap', 1.5, 'blocked_shots_relative_weight', 1,
          'times_dribbled_penalty_cap', 4.0, 'times_dribbled_max_deduction', 20
        ),
        'tat', jsonb_build_object(
          'recoveries_cap', 12.0,          'ground_duels_won_cap', 5.0,
          'aerial_duels_won_cap', 3.0,     'fouls_drawn_cap', 3.5,
          'fouls_committed_penalty_cap', 4.0, 'yellow_penalty_cap', 0.4,
          'red_penalty_cap', 0.1
        )
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
    'success',    true,
    'ata',        v_ata,
    'cri',        v_cri,
    'tec',        v_tec,
    'def',        v_def,
    'tat',        v_tat,
    'confidence', v_confidence,
    'minutes',    v_minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
