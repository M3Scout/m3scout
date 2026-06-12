-- v3-radar: OVR passa a ser derivado dos 5 eixos do radar (player_attribute_scores)
-- Goleiros mantêm o cálculo SQL legado (calculate_athlete_auto_rating).
-- Demais posições: OVR = (radar_ponderado * 0.70) + (nível_competição * 0.30)
-- Ponderação temporal: ano mais recente 60%, ano anterior 40%.

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

  -- Grupo de posição
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

  -- ── Goleiros: mantém cálculo SQL legado ───────────────────────────────────
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

  -- ── Jogadores de linha: lê eixos do radar ─────────────────────────────────
  -- Prefere rows com competition_id IS NULL (engine v25-ts agregado)
  SELECT
    (array_agg(season_year ORDER BY season_year DESC))[1],
    (array_agg(season_year ORDER BY season_year DESC))[2]
  INTO v_year1, v_year2
  FROM public.player_attribute_scores
  WHERE player_id = p_player_id
    AND ata_score_100 IS NOT NULL;

  IF v_year1 IS NULL THEN
    UPDATE public.players SET auto_rating = NULL, auto_potential = NULL WHERE id = p_player_id;
    RETURN;
  END IF;

  v_w1 := CASE WHEN v_year2 IS NOT NULL THEN 0.60 ELSE 1.0 END;
  v_w2 := CASE WHEN v_year2 IS NOT NULL THEN 0.40 ELSE 0.0 END;

  -- Radar ano 1 (prefere row com competition_id IS NULL)
  SELECT
    COALESCE(ata_score_100,0), COALESCE(cri_score_100,0), COALESCE(tec_score_100,0),
    COALESCE(def_score_100,0), COALESCE(tat_score_100,0)
  INTO v_ata1, v_cri1, v_tec1, v_def1, v_tat1
  FROM public.player_attribute_scores
  WHERE player_id = p_player_id AND season_year = v_year1
  ORDER BY (competition_id IS NOT NULL), updated_at DESC
  LIMIT 1;

  -- Radar ano 2
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

  -- Pesos por posição → score do radar
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

  -- Nível da competição (média ponderada por minutos, coeff * 20)
  SELECT LEAST(COALESCE(SUM(final_coefficient * minutes) / NULLIF(SUM(minutes),0), 1.0) * 20, 100)
  INTO v_comp_level1
  FROM public.unified_player_season_stats
  WHERE player_id = p_player_id AND season_year = v_year1 AND minutes > 0;
  v_comp_level1 := COALESCE(v_comp_level1, 20);

  IF v_year2 IS NOT NULL THEN
    SELECT LEAST(COALESCE(SUM(final_coefficient * minutes) / NULLIF(SUM(minutes),0), 1.0) * 20, 100)
    INTO v_comp_level2
    FROM public.unified_player_season_stats
    WHERE player_id = p_player_id AND season_year = v_year2 AND minutes > 0;
    v_comp_level2 := COALESCE(v_comp_level2, 20);
  END IF;

  -- OVR por ano = radar*0.70 + nível_comp*0.30
  v_ovr1 := v_radar1 * 0.70 + v_comp_level1 * 0.30;

  IF v_year2 IS NOT NULL THEN
    v_ovr2      := v_radar2 * 0.70 + v_comp_level2 * 0.30;
    v_final_ovr := v_ovr1 * v_w1 + v_ovr2 * v_w2;
  ELSE
    v_final_ovr := v_ovr1;
  END IF;

  v_new_rating := LEAST(GREATEST(ROUND(v_final_ovr), 0), 99);

  -- Potencial por curva de idade
  v_bonus := CASE
    WHEN v_player.age IS NULL THEN 2
    WHEN v_player.age <= 18   THEN 15
    WHEN v_player.age <= 21   THEN 10
    WHEN v_player.age <= 24   THEN 6
    WHEN v_player.age <= 27   THEN 2
    ELSE 0
  END;
  v_potential := LEAST(v_new_rating + v_bonus, 99);

  -- Details para debug
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
      'ovr_year1',      ROUND(v_ovr1::NUMERIC,1),
      'ovr_year2',      ROUND(COALESCE(v_ovr2,0)::NUMERIC,1),
      'final_index_100', ROUND(v_final_ovr::NUMERIC,1)
    )
  );

  UPDATE public.players
  SET auto_rating        = v_new_rating,
      auto_potential     = v_potential,
      auto_rating_details = v_details,
      rating_updated_at  = NOW()
  WHERE id = p_player_id;

  IF v_new_rating IS NOT NULL AND (v_old_rating IS NULL OR v_old_rating IS DISTINCT FROM v_new_rating) THEN
    INSERT INTO public.player_rating_history (player_id, rating, recorded_at)
    VALUES (p_player_id, v_new_rating, NOW());
  END IF;
END;
$function$;

-- Backfill: recalcula todos os jogadores com a nova lógica
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.players LOOP
    PERFORM public.update_player_auto_rating(r.id);
  END LOOP;
END $$;
