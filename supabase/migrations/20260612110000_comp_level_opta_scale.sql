-- Escala Opta Analyst: multiplier = 100.0 / 1.21 ≈ 82.64
-- Piso: 0.24 (Sub-20 periférico) → ~20 pts
-- Série B: 0.72 → ~60 pts | Série A: 0.99 → ~82 pts
-- Premier League: 1.12 → ~93 pts | Champions League: 1.21 → 100 pts (teto)
-- Afeta update_player_auto_rating (jogadores de linha) e
-- calculate_athlete_auto_rating (goleiros).

-- ── 1. update_player_auto_rating (jogadores de linha) ────────────────────────

CREATE OR REPLACE FUNCTION public.update_player_auto_rating(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_player        RECORD;
  v_position_group TEXT;
  v_old_rating    NUMERIC(5,1);

  v_year1         INT;  v_year2         INT;
  v_w1            NUMERIC; v_w2 NUMERIC;

  v_ata1 NUMERIC; v_cri1 NUMERIC; v_tec1 NUMERIC; v_def1 NUMERIC; v_tat1 NUMERIC;
  v_ata2 NUMERIC; v_cri2 NUMERIC; v_tec2 NUMERIC; v_def2 NUMERIC; v_tat2 NUMERIC;

  v_radar1        NUMERIC; v_radar2 NUMERIC;
  v_comp_level1   NUMERIC; v_comp_level2 NUMERIC;
  v_ovr1          NUMERIC; v_ovr2  NUMERIC;
  v_final_ovr     NUMERIC;
  v_new_rating    NUMERIC;
  v_bonus         INT;
  v_potential     NUMERIC(5,1);
  v_details       JSONB;
BEGIN
  SELECT id, position, age, auto_rating
  INTO v_player
  FROM public.players WHERE id = p_player_id;

  IF v_player IS NULL THEN RETURN; END IF;
  v_old_rating := v_player.auto_rating;

  v_position_group := CASE
    WHEN v_player.position = 'Goleiro'                                                THEN 'goalkeeper'
    WHEN v_player.position IN ('Zagueiro','Lateral Direito','Lateral Esquerdo',
                               'Ala Direito','Ala Esquerdo')                          THEN 'defender'
    WHEN v_player.position IN ('Volante')                                             THEN 'defensive_mid'
    WHEN v_player.position IN ('Meia','Meia Atacante','Meia Central','Meio-Campo')    THEN 'midfielder'
    WHEN v_player.position IN ('Atacante','Centroavante','Ponta Direita',
                               'Ponta Esquerda','Segundo Atacante')                   THEN 'forward'
    ELSE 'midfielder'
  END;

  -- Goleiros: cálculo SQL legado
  IF v_position_group = 'goalkeeper' THEN
    PERFORM public.calculate_athlete_auto_rating(p_player_id);
    SELECT NULLIF((auto_rating_details->'scores'->>'final_index_100'),'')::NUMERIC
    INTO v_new_rating
    FROM public.players WHERE id = p_player_id;
    IF v_new_rating IS NOT NULL THEN
      v_new_rating := LEAST(GREATEST(ROUND(v_new_rating), 0), 99);
      v_bonus := CASE
        WHEN v_player.age IS NULL THEN 2
        WHEN v_player.age <= 18   THEN 15
        WHEN v_player.age <= 21   THEN 10
        WHEN v_player.age <= 24   THEN 6
        WHEN v_player.age <= 27   THEN 2
        ELSE 0
      END;
      v_potential := LEAST(v_new_rating + v_bonus, 99);
      UPDATE public.players
      SET auto_rating = v_new_rating, auto_potential = v_potential,
          rating_updated_at = NOW()
      WHERE id = p_player_id;
    END IF;
    RETURN;
  END IF;

  -- Jogadores de linha: lê eixos do radar
  SELECT
    (array_agg(season_year ORDER BY season_year DESC))[1],
    (array_agg(season_year ORDER BY season_year DESC))[2]
  INTO v_year1, v_year2
  FROM public.player_attribute_scores
  WHERE player_id = p_player_id AND ata_score_100 IS NOT NULL;

  IF v_year1 IS NULL THEN
    UPDATE public.players SET auto_rating = NULL, auto_potential = 0 WHERE id = p_player_id;
    RETURN;
  END IF;

  v_w1 := CASE WHEN v_year2 IS NOT NULL THEN 0.60 ELSE 1.0 END;
  v_w2 := CASE WHEN v_year2 IS NOT NULL THEN 0.40 ELSE 0.0 END;

  SELECT
    COALESCE(ata_score_100,0), COALESCE(cri_score_100,0), COALESCE(tec_score_100,0),
    COALESCE(def_score_100,0), COALESCE(tat_score_100,0)
  INTO v_ata1, v_cri1, v_tec1, v_def1, v_tat1
  FROM public.player_attribute_scores
  WHERE player_id = p_player_id AND season_year = v_year1
  ORDER BY (competition_id IS NOT NULL), updated_at DESC
  LIMIT 1;

  IF v_year2 IS NOT NULL THEN
    SELECT
      COALESCE(ata_score_100,0), COALESCE(cri_score_100,0), COALESCE(tec_score_100,0),
      COALESCE(def_score_100,0), COALESCE(tat_score_100,0)
    INTO v_ata2, v_cri2, v_tec2, v_def2, v_tat2
    FROM public.player_attribute_scores
    WHERE player_id = p_player_id AND season_year = v_year2
    ORDER BY (competition_id IS NOT NULL), updated_at DESC
    LIMIT 1;
  END IF;

  v_radar1 := CASE v_position_group
    WHEN 'forward'       THEN v_ata1*0.45 + v_cri1*0.25 + v_tec1*0.20 + v_tat1*0.05 + v_def1*0.05
    WHEN 'midfielder'    THEN v_ata1*0.15 + v_cri1*0.35 + v_tec1*0.30 + v_tat1*0.15 + v_def1*0.05
    WHEN 'defensive_mid' THEN v_ata1*0.05 + v_cri1*0.10 + v_tec1*0.20 + v_tat1*0.30 + v_def1*0.35
    WHEN 'defender'      THEN v_ata1*0.05 + v_cri1*0.05 + v_tec1*0.15 + v_tat1*0.25 + v_def1*0.50
    ELSE                      v_ata1*0.20 + v_cri1*0.20 + v_tec1*0.20 + v_tat1*0.20 + v_def1*0.20
  END;

  IF v_year2 IS NOT NULL THEN
    v_radar2 := CASE v_position_group
      WHEN 'forward'       THEN v_ata2*0.45 + v_cri2*0.25 + v_tec2*0.20 + v_tat2*0.05 + v_def2*0.05
      WHEN 'midfielder'    THEN v_ata2*0.15 + v_cri2*0.35 + v_tec2*0.30 + v_tat2*0.15 + v_def2*0.05
      WHEN 'defensive_mid' THEN v_ata2*0.05 + v_cri2*0.10 + v_tec2*0.20 + v_tat2*0.30 + v_def2*0.35
      WHEN 'defender'      THEN v_ata2*0.05 + v_cri2*0.05 + v_tec2*0.15 + v_tat2*0.25 + v_def2*0.50
      ELSE                      v_ata2*0.20 + v_cri2*0.20 + v_tec2*0.20 + v_tat2*0.20 + v_def2*0.20
    END;
  END IF;

  -- Nível da competição: coeff * (100.0 / 1.21) (coeffs 0.65–1.12 → range ~59–100)
  SELECT LEAST(COALESCE(SUM(final_coefficient * minutes) / NULLIF(SUM(minutes),0), 0.65) * (100.0 / 1.21), 100)
  INTO v_comp_level1
  FROM public.unified_player_season_stats
  WHERE player_id = p_player_id AND season_year = v_year1 AND minutes > 0;
  v_comp_level1 := COALESCE(v_comp_level1, 20); -- fallback: ~coeff mínimo * (100.0 / 1.21)

  IF v_year2 IS NOT NULL THEN
    SELECT LEAST(COALESCE(SUM(final_coefficient * minutes) / NULLIF(SUM(minutes),0), 0.65) * (100.0 / 1.21), 100)
    INTO v_comp_level2
    FROM public.unified_player_season_stats
    WHERE player_id = p_player_id AND season_year = v_year2 AND minutes > 0;
    v_comp_level2 := COALESCE(v_comp_level2, 20);
  END IF;

  v_ovr1 := v_radar1 * 0.70 + v_comp_level1 * 0.30;

  IF v_year2 IS NOT NULL THEN
    v_ovr2      := v_radar2 * 0.70 + v_comp_level2 * 0.30;
    v_final_ovr := v_ovr1 * v_w1 + v_ovr2 * v_w2;
  ELSE
    v_final_ovr := v_ovr1;
  END IF;

  v_new_rating := LEAST(GREATEST(ROUND(v_final_ovr), 0), 99);

  v_bonus := CASE
    WHEN v_player.age IS NULL THEN 2
    WHEN v_player.age <= 18   THEN 15
    WHEN v_player.age <= 21   THEN 10
    WHEN v_player.age <= 24   THEN 6
    WHEN v_player.age <= 27   THEN 2
    ELSE 0
  END;
  v_potential := LEAST(v_new_rating + v_bonus, 99);

  v_details := jsonb_build_object(
    'version',        'v3-radar',
    'calculated_at',  NOW(),
    'position',       v_player.position,
    'position_group', v_position_group,
    'age',            v_player.age,
    'year1', v_year1, 'year2', v_year2,
    'year1_weight', v_w1, 'year2_weight', v_w2,
    'radar', jsonb_build_object(
      'year1', jsonb_build_object('ata',v_ata1,'cri',v_cri1,'tec',v_tec1,'def',v_def1,'tat',v_tat1,'weighted',ROUND(v_radar1::NUMERIC,1)),
      'year2', CASE WHEN v_year2 IS NOT NULL
                    THEN jsonb_build_object('ata',v_ata2,'cri',v_cri2,'tec',v_tec2,'def',v_def2,'tat',v_tat2,'weighted',ROUND(v_radar2::NUMERIC,1))
                    ELSE NULL END
    ),
    'comp_level', jsonb_build_object('year1', v_comp_level1, 'year2', v_comp_level2),
    'scores', jsonb_build_object(
      'ovr_year1',       ROUND(v_ovr1::NUMERIC,1),
      'ovr_year2',       ROUND(COALESCE(v_ovr2,0)::NUMERIC,1),
      'final_index_100', ROUND(v_final_ovr::NUMERIC,1)
    )
  );

  UPDATE public.players
  SET auto_rating         = v_new_rating,
      auto_potential      = v_potential,
      auto_rating_details = v_details,
      rating_updated_at   = NOW()
  WHERE id = p_player_id;

  IF v_new_rating IS NOT NULL AND (v_old_rating IS NULL OR v_old_rating IS DISTINCT FROM v_new_rating) THEN
    INSERT INTO public.player_rating_history (player_id, rating, recorded_at)
    VALUES (p_player_id, v_new_rating, NOW());
  END IF;
END;
$function$;

-- ── 2. calculate_athlete_auto_rating (goleiros) — mesma correção ────────────
-- Apenas a linha v_competition_level_score muda de * 20 para * (100.0 / 1.21).
-- Restante da função é idêntico à migração 20260129223959.

CREATE OR REPLACE FUNCTION public.calculate_athlete_auto_rating(p_player_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_player RECORD;
  v_position_group TEXT := 'midfielder';
  v_comp_record RECORD;
  v_year1 INT; v_year2 INT;
  v_year1_weight NUMERIC; v_year2_weight NUMERIC;
  v_year1_total_minutes NUMERIC := 0;
  v_year2_total_minutes NUMERIC := 0;
  v_competitions JSONB := '[]'::JSONB;
  v_comp_data JSONB;
  v_year_weight NUMERIC; v_in_year_weight NUMERIC; v_final_weight NUMERIC;
  v_competition_level_score NUMERIC;
  v_position_stats_score NUMERIC;
  v_final_comp_score NUMERIC;
  v_minutes_90 NUMERIC;
  v_stat_breakdown JSONB;
  v_total_weight NUMERIC;
  v_weighted_score NUMERIC;
  v_goals_90 NUMERIC; v_assists_90 NUMERIC; v_ga_90 NUMERIC;
  v_tackles_90 NUMERIC; v_interceptions_90 NUMERIC; v_recoveries_90 NUMERIC;
  v_saves_90 NUMERIC; v_goals_conceded_90 NUMERIC; v_aerial_duels_90 NUMERIC;
  v_accurate_passes_90 NUMERIC; v_duels_won_pct NUMERIC; v_pass_accuracy NUMERIC;
  v_chances_created_90 NUMERIC; v_key_passes_90 NUMERIC;
  v_shots_90 NUMERIC; v_shots_on_target_90 NUMERIC; v_cards_90 NUMERIC;
  v_sum_weighted_scores NUMERIC := 0; v_sum_weights NUMERIC := 0;
  v_final_score_100 NUMERIC; v_rating_05 NUMERIC;
  v_details JSONB; v_reliability TEXT;
  v_total_minutes INT := 0; v_total_matches INT := 0;
BEGIN
  SELECT id, position, age, current_club INTO v_player
  FROM public.players WHERE id = p_player_id;
  IF v_player IS NULL THEN RETURN NULL; END IF;

  v_position_group := CASE
    WHEN v_player.position = 'Goleiro'                                             THEN 'goalkeeper'
    WHEN v_player.position IN ('Zagueiro')                                         THEN 'center_back'
    WHEN v_player.position IN ('Volante')                                          THEN 'defensive_mid'
    WHEN v_player.position IN ('Meia','Meia Atacante','Meia Central','Meio-Campo') THEN 'midfielder'
    WHEN v_player.position IN ('Atacante','Centroavante','Ponta Direita',
                               'Ponta Esquerda','Segundo Atacante')                THEN 'forward'
    WHEN v_player.position IN ('Lateral Direito','Lateral Esquerdo',
                               'Ala Direito','Ala Esquerdo')                       THEN 'center_back'
    ELSE 'midfielder'
  END;

  SELECT
    (array_agg(DISTINCT season_year ORDER BY season_year DESC))[1],
    (array_agg(DISTINCT season_year ORDER BY season_year DESC))[2]
  INTO v_year1, v_year2
  FROM public.unified_player_season_stats WHERE player_id = p_player_id;

  IF v_year1 IS NULL THEN
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;

  IF v_year2 IS NOT NULL THEN
    v_year1_weight := 0.60; v_year2_weight := 0.40;
  ELSE
    v_year1_weight := 1.0;  v_year2_weight := 0.0;
  END IF;

  SELECT COALESCE(SUM(minutes),0) INTO v_year1_total_minutes
  FROM public.unified_player_season_stats
  WHERE player_id = p_player_id AND season_year = v_year1;

  IF v_year2 IS NOT NULL THEN
    SELECT COALESCE(SUM(minutes),0) INTO v_year2_total_minutes
    FROM public.unified_player_season_stats
    WHERE player_id = p_player_id AND season_year = v_year2;
  END IF;

  FOR v_comp_record IN
    SELECT
      COALESCE(us.competition_id::text,'no_comp') AS id,
      us.competition_id, us.competition_name, us.final_coefficient, us.season_year,
      us.matches::int, us.minutes::int, us.goals::int, us.assists::int,
      us.yellow_cards::int, us.red_cards::int, us.tackles::int, us.interceptions::int,
      us.recoveries::int, us.saves::int, us.goals_conceded::int, us.clean_sheets::int,
      us.penalties_saved::int, us.errors_leading_to_goal::int,
      us.aerial_duels_won::int, us.accurate_passes::int, us.total_passes::int,
      us.duels_won::int, us.total_duels::int, us.chances_created::int,
      us.key_passes::int, us.shots::int, us.shots_on_target::int,
      us.fouls_committed::int, us.fouls_drawn::int,
      us.successful_dribbles::int, us.total_dribbles::int,
      us.ground_duels_won::int, us.ground_duels_total::int, us.data_source
    FROM public.unified_player_season_stats us
    WHERE us.player_id = p_player_id
      AND us.season_year IN (v_year1, v_year2)
      AND us.minutes > 0
    ORDER BY us.season_year DESC, us.minutes DESC
  LOOP
    v_year_weight    := CASE WHEN v_comp_record.season_year = v_year1 THEN v_year1_weight ELSE v_year2_weight END;
    IF v_comp_record.season_year = v_year1 AND v_year1_total_minutes > 0 THEN
      v_in_year_weight := LEAST(v_comp_record.minutes::NUMERIC / v_year1_total_minutes, 1.0);
    ELSIF v_comp_record.season_year = v_year2 AND v_year2_total_minutes > 0 THEN
      v_in_year_weight := LEAST(v_comp_record.minutes::NUMERIC / v_year2_total_minutes, 1.0);
    ELSE
      v_in_year_weight := 1.0;
    END IF;
    v_final_weight := v_year_weight * v_in_year_weight;
    IF v_final_weight < 0.01 THEN CONTINUE; END IF;

    -- Nível da competição: coeff * (100.0 / 1.21) (corrigido de * 20)
    v_competition_level_score := LEAST(v_comp_record.final_coefficient * (100.0 / 1.21), 100);

    v_minutes_90            := GREATEST(v_comp_record.minutes::NUMERIC / 90.0, 0.01);
    v_goals_90              := v_comp_record.goals::NUMERIC / v_minutes_90;
    v_assists_90            := v_comp_record.assists::NUMERIC / v_minutes_90;
    v_ga_90                 := (v_comp_record.goals + v_comp_record.assists)::NUMERIC / v_minutes_90;
    v_tackles_90            := v_comp_record.tackles::NUMERIC / v_minutes_90;
    v_interceptions_90      := v_comp_record.interceptions::NUMERIC / v_minutes_90;
    v_recoveries_90         := v_comp_record.recoveries::NUMERIC / v_minutes_90;
    v_saves_90              := v_comp_record.saves::NUMERIC / v_minutes_90;
    v_goals_conceded_90     := v_comp_record.goals_conceded::NUMERIC / v_minutes_90;
    v_aerial_duels_90       := v_comp_record.aerial_duels_won::NUMERIC / v_minutes_90;
    v_accurate_passes_90    := v_comp_record.accurate_passes::NUMERIC / v_minutes_90;
    v_chances_created_90    := v_comp_record.chances_created::NUMERIC / v_minutes_90;
    v_key_passes_90         := v_comp_record.key_passes::NUMERIC / v_minutes_90;
    v_shots_90              := v_comp_record.shots::NUMERIC / v_minutes_90;
    v_shots_on_target_90    := v_comp_record.shots_on_target::NUMERIC / v_minutes_90;
    v_cards_90              := (v_comp_record.yellow_cards + v_comp_record.red_cards * 2)::NUMERIC / v_minutes_90;
    v_duels_won_pct         := CASE WHEN v_comp_record.total_duels > 0 THEN (v_comp_record.duels_won::NUMERIC / v_comp_record.total_duels::NUMERIC) * 100 ELSE 0 END;
    v_pass_accuracy         := CASE WHEN v_comp_record.total_passes > 0 THEN (v_comp_record.accurate_passes::NUMERIC / v_comp_record.total_passes::NUMERIC) * 100 ELSE 0 END;

    CASE v_position_group
      WHEN 'goalkeeper' THEN
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key','saves_90','stat_label','Defesas/90','value_raw',v_saves_90,'subscore_100',LEAST(v_saves_90*25,100),'weight_pct',25),
          jsonb_build_object('stat_key','goals_conceded_90','stat_label','Gols Sofridos/90','value_raw',v_goals_conceded_90,'subscore_100',GREATEST(100-v_goals_conceded_90*40,0),'weight_pct',25),
          jsonb_build_object('stat_key','clean_sheets','stat_label','Clean Sheets','value_raw',v_comp_record.clean_sheets,'subscore_100',LEAST(v_comp_record.clean_sheets*15,100),'weight_pct',20),
          jsonb_build_object('stat_key','aerial_duels_90','stat_label','Duelos Aéreos/90','value_raw',v_aerial_duels_90,'subscore_100',LEAST(v_aerial_duels_90*50,100),'weight_pct',15),
          jsonb_build_object('stat_key','pass_accuracy','stat_label','Precisão Passes','value_raw',v_pass_accuracy,'subscore_100',v_pass_accuracy,'weight_pct',15)
        );
      WHEN 'center_back' THEN
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key','tackles_90','stat_label','Desarmes/90','value_raw',v_tackles_90,'subscore_100',LEAST(v_tackles_90*25,100),'weight_pct',20),
          jsonb_build_object('stat_key','interceptions_90','stat_label','Interceptações/90','value_raw',v_interceptions_90,'subscore_100',LEAST(v_interceptions_90*30,100),'weight_pct',20),
          jsonb_build_object('stat_key','duels_won_pct','stat_label','Duelos Vencidos (%)','value_raw',v_duels_won_pct,'subscore_100',v_duels_won_pct,'weight_pct',20),
          jsonb_build_object('stat_key','pass_accuracy','stat_label','Precisão Passes','value_raw',v_pass_accuracy,'subscore_100',v_pass_accuracy,'weight_pct',15),
          jsonb_build_object('stat_key','recoveries_90','stat_label','Recuperações/90','value_raw',v_recoveries_90,'subscore_100',LEAST(v_recoveries_90*15,100),'weight_pct',15),
          jsonb_build_object('stat_key','discipline','stat_label','Disciplina','value_raw',v_cards_90,'subscore_100',GREATEST(100-v_cards_90*30,0),'weight_pct',10)
        );
      WHEN 'defensive_mid' THEN
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key','tackles_90','stat_label','Desarmes/90','value_raw',v_tackles_90,'subscore_100',LEAST(v_tackles_90*25,100),'weight_pct',18),
          jsonb_build_object('stat_key','recoveries_90','stat_label','Recuperações/90','value_raw',v_recoveries_90,'subscore_100',LEAST(v_recoveries_90*15,100),'weight_pct',18),
          jsonb_build_object('stat_key','interceptions_90','stat_label','Interceptações/90','value_raw',v_interceptions_90,'subscore_100',LEAST(v_interceptions_90*30,100),'weight_pct',15),
          jsonb_build_object('stat_key','pass_accuracy','stat_label','Precisão Passes','value_raw',v_pass_accuracy,'subscore_100',v_pass_accuracy,'weight_pct',15),
          jsonb_build_object('stat_key','duels_won_pct','stat_label','Duelos Vencidos (%)','value_raw',v_duels_won_pct,'subscore_100',v_duels_won_pct,'weight_pct',15),
          jsonb_build_object('stat_key','key_passes_90','stat_label','Passes Decisivos/90','value_raw',v_key_passes_90,'subscore_100',LEAST(v_key_passes_90*40,100),'weight_pct',10),
          jsonb_build_object('stat_key','discipline','stat_label','Disciplina','value_raw',v_cards_90,'subscore_100',GREATEST(100-v_cards_90*30,0),'weight_pct',9)
        );
      WHEN 'midfielder' THEN
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key','key_passes_90','stat_label','Passes Decisivos/90','value_raw',v_key_passes_90,'subscore_100',LEAST(v_key_passes_90*40,100),'weight_pct',20),
          jsonb_build_object('stat_key','chances_created_90','stat_label','Chances Criadas/90','value_raw',v_chances_created_90,'subscore_100',LEAST(v_chances_created_90*50,100),'weight_pct',18),
          jsonb_build_object('stat_key','pass_accuracy','stat_label','Precisão Passes','value_raw',v_pass_accuracy,'subscore_100',v_pass_accuracy,'weight_pct',15),
          jsonb_build_object('stat_key','ga_per_90','stat_label','G+A/90','value_raw',v_ga_90,'subscore_100',LEAST(v_ga_90*100,100),'weight_pct',15),
          jsonb_build_object('stat_key','recoveries_90','stat_label','Recuperações/90','value_raw',v_recoveries_90,'subscore_100',LEAST(v_recoveries_90*15,100),'weight_pct',12),
          jsonb_build_object('stat_key','tackles_90','stat_label','Desarmes/90','value_raw',v_tackles_90,'subscore_100',LEAST(v_tackles_90*25,100),'weight_pct',10),
          jsonb_build_object('stat_key','discipline','stat_label','Disciplina','value_raw',v_cards_90,'subscore_100',GREATEST(100-v_cards_90*30,0),'weight_pct',10)
        );
      WHEN 'forward' THEN
        v_stat_breakdown := jsonb_build_array(
          jsonb_build_object('stat_key','goals_per_90','stat_label','Gols/90','value_raw',v_goals_90,'subscore_100',LEAST(v_goals_90*150,100),'weight_pct',30),
          jsonb_build_object('stat_key','ga_per_90','stat_label','G+A/90','value_raw',v_ga_90,'subscore_100',LEAST(v_ga_90*100,100),'weight_pct',20),
          jsonb_build_object('stat_key','shots_on_target_90','stat_label','Finalizações no Gol/90','value_raw',v_shots_on_target_90,'subscore_100',LEAST(v_shots_on_target_90*35,100),'weight_pct',15),
          jsonb_build_object('stat_key','chances_created_90','stat_label','Chances Criadas/90','value_raw',v_chances_created_90,'subscore_100',LEAST(v_chances_created_90*50,100),'weight_pct',15),
          jsonb_build_object('stat_key','key_passes_90','stat_label','Passes Decisivos/90','value_raw',v_key_passes_90,'subscore_100',LEAST(v_key_passes_90*40,100),'weight_pct',10),
          jsonb_build_object('stat_key','discipline','stat_label','Disciplina','value_raw',v_cards_90,'subscore_100',GREATEST(100-v_cards_90*30,0),'weight_pct',10)
        );
      ELSE
        v_stat_breakdown := '[]'::JSONB;
    END CASE;

    SELECT COALESCE(SUM((s->>'subscore_100')::NUMERIC * (s->>'weight_pct')::NUMERIC / 100),0)
    INTO v_position_stats_score
    FROM jsonb_array_elements(v_stat_breakdown) AS s;

    v_final_comp_score := (v_position_stats_score * 0.70) + (v_competition_level_score * 0.30);

    v_sum_weighted_scores := v_sum_weighted_scores + (v_final_comp_score * v_final_weight);
    v_sum_weights         := v_sum_weights + v_final_weight;
    v_total_minutes       := v_total_minutes + v_comp_record.minutes;
    v_total_matches       := v_total_matches + v_comp_record.matches;

    v_comp_data := jsonb_build_object(
      'competition_id', v_comp_record.competition_id,
      'competition_name', v_comp_record.competition_name,
      'season_year', v_comp_record.season_year,
      'final_coefficient', v_comp_record.final_coefficient,
      'matches', v_comp_record.matches, 'minutes', v_comp_record.minutes,
      'goals', v_comp_record.goals, 'assists', v_comp_record.assists,
      'year_weight', v_year_weight, 'in_year_weight', v_in_year_weight,
      'final_weight', v_final_weight,
      'competition_level_score', v_competition_level_score,
      'position_stats_score', v_position_stats_score,
      'final_score', v_final_comp_score,
      'stat_breakdown', v_stat_breakdown,
      'data_source', v_comp_record.data_source
    );
    v_competitions := v_competitions || v_comp_data;
  END LOOP;

  IF v_sum_weights > 0 THEN
    v_final_score_100 := v_sum_weighted_scores / v_sum_weights;
  ELSE
    UPDATE public.players SET auto_rating_details = NULL WHERE id = p_player_id;
    RETURN NULL;
  END IF;

  v_rating_05 := ROUND((v_final_score_100 / 20) * 2) / 2;
  v_rating_05 := LEAST(GREATEST(v_rating_05, 1.0), 5.0);

  v_reliability := CASE
    WHEN v_total_minutes >= 2000 THEN 'high'
    WHEN v_total_minutes >= 900  THEN 'medium'
    ELSE 'low'
  END;

  v_details := jsonb_build_object(
    'version', 'v2', 'calculated_at', NOW(),
    'position', v_player.position, 'position_group', v_position_group,
    'age', v_player.age, 'total_matches', v_total_matches,
    'total_minutes', v_total_minutes,
    'total_competitions', jsonb_array_length(v_competitions),
    'competitions', v_competitions,
    'scores', jsonb_build_object(
      'final_index_100', ROUND(v_final_score_100::NUMERIC,1),
      'rating_0_5', v_rating_05
    ),
    'reliability', v_reliability
  );

  UPDATE public.players SET auto_rating_details = v_details WHERE id = p_player_id;
  RETURN v_rating_05;
END;
$function$;

-- ── 3. Backfill ───────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.players LOOP
    PERFORM public.update_player_auto_rating(r.id);
  END LOOP;
END $$;
