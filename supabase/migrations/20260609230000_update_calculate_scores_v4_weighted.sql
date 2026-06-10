-- calculate_player_attribute_scores v4 — Pesos diretos sobre p90 + benchmark
--
-- Modelo: raw_score = soma(stat_p90 * peso) para cada eixo
--         final     = GREATEST(0, LEAST(ROUND((raw_score / benchmark) * 100), 100))
--         + shrink de confiança aplicado antes do clamp final
--
-- ATA: (gols*5) + (penalties_won*3) + (finaliz_gol*1) - (impedimentos*0.5)  / bench 6.0
-- CRI: (assist*4) + (chances_criadas*3) + (passes_decisivos*1)               / bench 4.5
-- TEC: (dribles_certos*1.5)+(passes_longos_certos*0.5)+(cruzam_certos*0.5)
--      +(passes_certos*0.05)-(bolas_perdidas*0.5)-(passes_errados*0.05)      / bench 8.0
-- DEF: (desarmes*2)+(steals*1.5)+(intercept*1)+(cortes*0.5)-(driblado*1)    / bench 9.0
-- TAT: (recup*1)+(duelos_aereos*0.5)+(duelos_chao*0.5)
--      -(faltas_cometidas*0.5)-(amarelos*2)-(vermelhos*5)                    / bench 10.0

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

  -- Per-90 metrics
  v_goals_p90               numeric;
  v_penalties_won_p90       numeric;
  v_shots_on_target_p90     numeric;
  v_offsides_p90            numeric;

  v_assists_p90             numeric;
  v_chances_created_p90     numeric;
  v_key_passes_p90          numeric;

  v_successful_dribbles_p90  numeric;
  v_long_passes_accurate_p90 numeric;
  v_crosses_success_p90      numeric;
  v_accurate_passes_p90      numeric;
  v_possession_lost_p90      numeric;
  v_passes_failed_p90        numeric;

  v_tackles_p90             numeric;
  v_steals_p90              numeric;
  v_interceptions_p90       numeric;
  v_clearances_p90          numeric;
  v_times_dribbled_past_p90 numeric;

  v_recoveries_p90          numeric;
  v_aerial_duels_won_p90    numeric;
  v_ground_duels_won_p90    numeric;
  v_fouls_committed_p90     numeric;
  v_yellow_p90              numeric;
  v_red_p90                 numeric;

  -- Pontuações brutas (soma ponderada dos p90)
  v_raw_ata numeric;
  v_raw_cri numeric;
  v_raw_tec numeric;
  v_raw_def numeric;
  v_raw_tat numeric;

  -- Scores finais 0-100
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
  -- PASSO 1: Converter stats brutas → Per 90 minutos
  -- ============================================================

  v_goals_p90           := (COALESCE(v_stats.goals,           0)::numeric * 90.0) / v_minutes;
  v_penalties_won_p90   := (COALESCE(v_stats.penalties_won,   0)::numeric * 90.0) / v_minutes;
  v_shots_on_target_p90 := (COALESCE(v_stats.shots_on_target, 0)::numeric * 90.0) / v_minutes;
  v_offsides_p90        := (COALESCE(v_stats.offsides,        0)::numeric * 90.0) / v_minutes;

  v_assists_p90         := (COALESCE(v_stats.assists,         0)::numeric * 90.0) / v_minutes;
  v_chances_created_p90 := (COALESCE(v_stats.chances_created, 0)::numeric * 90.0) / v_minutes;
  v_key_passes_p90      := (COALESCE(v_stats.key_passes,      0)::numeric * 90.0) / v_minutes;

  v_successful_dribbles_p90  := (COALESCE(v_stats.successful_dribbles,  0)::numeric * 90.0) / v_minutes;
  v_long_passes_accurate_p90 := (COALESCE(v_stats.long_passes_accurate, 0)::numeric * 90.0) / v_minutes;
  v_crosses_success_p90      := (COALESCE(v_stats.crosses_success,      0)::numeric * 90.0) / v_minutes;
  v_accurate_passes_p90      := (COALESCE(v_stats.accurate_passes,      0)::numeric * 90.0) / v_minutes;
  v_possession_lost_p90      := (COALESCE(v_stats.possession_lost,      0)::numeric * 90.0) / v_minutes;
  v_passes_failed_p90        := (GREATEST(0, COALESCE(v_stats.total_passes, 0) - COALESCE(v_stats.accurate_passes, 0))::numeric * 90.0) / v_minutes;

  v_tackles_p90             := (COALESCE(v_stats.tackles,            0)::numeric * 90.0) / v_minutes;
  v_steals_p90              := (COALESCE(v_stats.steals,             0)::numeric * 90.0) / v_minutes;
  v_interceptions_p90       := (COALESCE(v_stats.interceptions,      0)::numeric * 90.0) / v_minutes;
  v_clearances_p90          := (COALESCE(v_stats.clearances,         0)::numeric * 90.0) / v_minutes;
  v_times_dribbled_past_p90 := (COALESCE(v_stats.times_dribbled_past,0)::numeric * 90.0) / v_minutes;

  v_recoveries_p90       := (COALESCE(v_stats.recoveries,       0)::numeric * 90.0) / v_minutes;
  v_aerial_duels_won_p90 := (COALESCE(v_stats.aerial_duels_won, 0)::numeric * 90.0) / v_minutes;
  v_ground_duels_won_p90 := (COALESCE(v_stats.ground_duels_won, 0)::numeric * 90.0) / v_minutes;
  v_fouls_committed_p90  := (COALESCE(v_stats.fouls_committed,  0)::numeric * 90.0) / v_minutes;
  v_yellow_p90           := (COALESCE(v_stats.yellow_cards,     0)::numeric * 90.0) / v_minutes;
  v_red_p90              := (COALESCE(v_stats.red_cards,        0)::numeric * 90.0) / v_minutes;

  -- ============================================================
  -- PASSO 2: Pontuação bruta — soma ponderada dos p90
  -- ============================================================

  -- ATA: benchmark 6.0
  -- Um atacante sólido: ~0.8 gols/90 (4.0) + ~0.1 penalties (0.3) + ~1.5 finaliz. (1.5) = ~5.8
  v_raw_ata := (v_goals_p90           * 5.0)
             + (v_penalties_won_p90   * 3.0)
             + (v_shots_on_target_p90 * 1.0)
             - (v_offsides_p90        * 0.5);

  -- CRI: benchmark 4.5
  -- Um criador sólido: ~0.4 assists (1.6) + ~0.7 chances (2.1) + ~0.8 key_passes (0.8) = ~4.5
  v_raw_cri := (v_assists_p90         * 4.0)
             + (v_chances_created_p90  * 3.0)
             + (v_key_passes_p90       * 1.0);

  -- TEC: benchmark 8.0
  -- Um meia técnico: ~3 dribles (4.5) + ~2 passes longos (1.0) + ~1.5 cruzamentos (0.75) + ~40 passes (2.0)
  --                  - ~5 bolas perdidas (2.5) - ~10 passes errados (0.5) = ~5.25 → ajuste fine-tune no benchmark
  v_raw_tec := (v_successful_dribbles_p90  * 1.5)
             + (v_long_passes_accurate_p90  * 0.5)
             + (v_crosses_success_p90       * 0.5)
             + (v_accurate_passes_p90       * 0.05)
             - (v_possession_lost_p90       * 0.5)
             - (v_passes_failed_p90         * 0.05);

  -- DEF: benchmark 9.0
  -- Um defensor sólido: ~3 desarmes (6.0) + ~2 steals (3.0) + ~1.5 intercept (1.5) + ~2 cortes (1.0)
  --                     - ~1 driblado (1.0) = ~10.5 → calibrado em 9.0 para ser exigente
  v_raw_def := (v_tackles_p90             * 2.0)
             + (v_steals_p90              * 1.5)
             + (v_interceptions_p90       * 1.0)
             + (v_clearances_p90          * 0.5)
             - (v_times_dribbled_past_p90 * 1.0);

  -- TAT: benchmark 10.0
  -- Um volante tático: ~8 recup (8.0) + ~1.5 duelos aéreos (0.75) + ~3 duelos chão (1.5)
  --                    - ~1.5 faltas (0.75) - ~0.2 amarelos (0.4) = ~9.1
  v_raw_tat := (v_recoveries_p90       * 1.0)
             + (v_aerial_duels_won_p90  * 0.5)
             + (v_ground_duels_won_p90  * 0.5)
             - (v_fouls_committed_p90   * 0.5)
             - (v_yellow_p90            * 2.0)
             - (v_red_p90               * 5.0);

  -- ============================================================
  -- PASSO 3: Normalizar → 0-100 via benchmark
  -- ============================================================
  v_ata := ROUND((v_raw_ata / 6.0)  * 100.0);
  v_cri := ROUND((v_raw_cri / 4.5)  * 100.0);
  v_tec := ROUND((v_raw_tec / 8.0)  * 100.0);
  v_def := ROUND((v_raw_def / 9.0)  * 100.0);
  v_tat := ROUND((v_raw_tat / 10.0) * 100.0);

  -- ============================================================
  -- PASSO 4: Shrink de confiança — poucos minutos → puxa para 50
  -- ============================================================
  v_ata := (v_confidence * v_ata) + ((1.0 - v_confidence) * 50.0);
  v_cri := (v_confidence * v_cri) + ((1.0 - v_confidence) * 50.0);
  v_tec := (v_confidence * v_tec) + ((1.0 - v_confidence) * 50.0);
  v_def := (v_confidence * v_def) + ((1.0 - v_confidence) * 50.0);
  v_tat := (v_confidence * v_tat) + ((1.0 - v_confidence) * 50.0);

  -- ============================================================
  -- PASSO 5: Clamp final — GREATEST(0, LEAST(ROUND(valor), 100))
  -- ============================================================
  v_ata := GREATEST(0, LEAST(ROUND(v_ata), 100));
  v_cri := GREATEST(0, LEAST(ROUND(v_cri), 100));
  v_tec := GREATEST(0, LEAST(ROUND(v_tec), 100));
  v_def := GREATEST(0, LEAST(ROUND(v_def), 100));
  v_tat := GREATEST(0, LEAST(ROUND(v_tat), 100));

  -- ============================================================
  -- PASSO 6: Persistir
  -- ============================================================
  v_per90 := jsonb_build_object(
    'goals',                v_goals_p90,
    'penalties_won',        v_penalties_won_p90,
    'shots_on_target',      v_shots_on_target_p90,
    'offsides',             v_offsides_p90,
    'assists',              v_assists_p90,
    'chances_created',      v_chances_created_p90,
    'key_passes',           v_key_passes_p90,
    'successful_dribbles',  v_successful_dribbles_p90,
    'long_passes_accurate', v_long_passes_accurate_p90,
    'crosses_success',      v_crosses_success_p90,
    'accurate_passes',      v_accurate_passes_p90,
    'possession_lost',      v_possession_lost_p90,
    'passes_failed',        v_passes_failed_p90,
    'tackles',              v_tackles_p90,
    'steals',               v_steals_p90,
    'interceptions',        v_interceptions_p90,
    'clearances',           v_clearances_p90,
    'times_dribbled_past',  v_times_dribbled_past_p90,
    'recoveries',           v_recoveries_p90,
    'aerial_duels_won',     v_aerial_duels_won_p90,
    'ground_duels_won',     v_ground_duels_won_p90,
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
      'raw_weighted', jsonb_build_object(
        'ata', v_raw_ata, 'cri', v_raw_cri, 'tec', v_raw_tec,
        'def', v_raw_def, 'tat', v_raw_tat
      ),
      'benchmarks', jsonb_build_object(
        'ata', 6.0, 'cri', 4.5, 'tec', 8.0, 'def', 9.0, 'tat', 10.0
      ),
      'weights', jsonb_build_object(
        'ata', jsonb_build_object('goals',5,'penalties_won',3,'shots_on_target',1,'offsides',-0.5),
        'cri', jsonb_build_object('assists',4,'chances_created',3,'key_passes',1),
        'tec', jsonb_build_object('successful_dribbles',1.5,'long_passes_accurate',0.5,
                                  'crosses_success',0.5,'accurate_passes',0.05,
                                  'possession_lost',-0.5,'passes_failed',-0.05),
        'def', jsonb_build_object('tackles',2,'steals',1.5,'interceptions',1,
                                  'clearances',0.5,'times_dribbled_past',-1),
        'tat', jsonb_build_object('recoveries',1,'aerial_duels_won',0.5,'ground_duels_won',0.5,
                                  'fouls_committed',-0.5,'yellow_cards',-2,'red_cards',-5)
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
    'minutes',    v_minutes,
    'raw',        jsonb_build_object(
      'ata', v_raw_ata, 'cri', v_raw_cri, 'tec', v_raw_tec,
      'def', v_raw_def, 'tat', v_raw_tat
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
