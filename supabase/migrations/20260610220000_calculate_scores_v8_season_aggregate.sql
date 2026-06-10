-- calculate_player_attribute_scores v8
-- Mudanca principal: agrega TODAS as competicoes do season_year (remove filtro por competition_id)
-- Mantém a assinatura (uuid, uuid, integer) para compatibilidade com callers TypeScript.
-- O p_competition_id recebido e ignorado nas queries; e usado apenas para nomear a linha salva.
-- O orquestrador chama a funcao UMA vez por (player, season) com um competition_id representativo.
-- Formula nova: media simples dos sub-scores; positivo = LEAST(100, p90/cap*100);
--               negativo = GREATEST(0, 100 - p90/pen_cap*100).

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

  -- Per-90
  v_goals_p90                numeric;
  v_shots_on_target_p90      numeric;
  v_penalties_won_p90        numeric;
  v_offsides_p90             numeric;
  v_key_passes_p90           numeric;
  v_chances_created_p90      numeric;
  v_crosses_success_p90      numeric;
  v_crosses_failed_p90       numeric;
  v_assists_p90              numeric;
  v_accurate_passes_p90      numeric;
  v_long_passes_accurate_p90 numeric;
  v_long_passes_failed_p90   numeric;
  v_successful_dribbles_p90  numeric;
  v_dribbles_failed_p90      numeric;
  v_fouls_drawn_p90          numeric;
  v_passes_failed_p90        numeric;
  v_possession_lost_p90      numeric;
  v_tackles_p90              numeric;
  v_interceptions_p90        numeric;
  v_clearances_p90           numeric;
  v_blocked_shots_p90        numeric;
  v_times_dribbled_past_p90  numeric;
  v_recoveries_p90           numeric;
  v_ground_duels_won_p90     numeric;
  v_ground_duels_lost_p90    numeric;
  v_aerial_duels_won_p90     numeric;
  v_aerial_duels_lost_p90    numeric;
  v_fouls_committed_p90      numeric;
  v_yellow_p90               numeric;
  v_red_p90                  numeric;

  -- Sub-scores ATA
  v_s_goals                  numeric;
  v_s_shots_on_target        numeric;
  v_s_penalties_won          numeric;
  v_s_offsides_neg           numeric;
  -- Sub-scores CRI
  v_s_key_passes             numeric;
  v_s_chances_created        numeric;
  v_s_crosses_success        numeric;
  v_s_crosses_failed_neg     numeric;
  -- Sub-scores TEC
  v_s_assists                numeric;
  v_s_accurate_passes        numeric;
  v_s_long_passes_accurate   numeric;
  v_s_long_passes_failed_neg numeric;
  v_s_successful_dribbles    numeric;
  v_s_dribbles_failed_neg    numeric;
  v_s_fouls_drawn            numeric;
  v_s_passes_failed_neg      numeric;
  v_s_possession_lost_neg    numeric;
  -- Sub-scores DEF
  v_s_tackles                numeric;
  v_s_interceptions          numeric;
  v_s_clearances             numeric;
  v_s_blocked_shots          numeric;
  v_s_times_dribbled_neg     numeric;
  -- Sub-scores TAT
  v_s_recoveries             numeric;
  v_s_ground_duels_won       numeric;
  v_s_ground_duels_lost_neg  numeric;
  v_s_aerial_duels_won       numeric;
  v_s_aerial_duels_lost_neg  numeric;
  v_s_fouls_committed_neg    numeric;
  v_s_yellow_neg             numeric;
  v_s_red_neg                numeric;

  v_ata numeric;
  v_cri numeric;
  v_tec numeric;
  v_def numeric;
  v_tat numeric;

  v_per90        jsonb;
  v_final_scores jsonb;
BEGIN
  -- ============================================================
  -- PASSO 0: Agregar TODAS as competicoes do season_year
  -- Fonte 1: player_stats (SUM de todas as linhas do player+season)
  -- Fonte 2: match_player_stats via match_players (todos os jogos aplicados do season)
  -- p_competition_id e IGNORADO nas queries; a season_year e o unico filtro temporal.
  -- ============================================================
  WITH
  src_ps AS (
    -- Agregar todas as competicoes em player_stats para este player+season
    SELECT
      SUM(ps.matches)::numeric                            AS matches,
      SUM(ps.minutes)::numeric                            AS minutes,
      SUM(COALESCE(ps.goals,                  0))::numeric AS goals,
      SUM(COALESCE(ps.shots_on_target,        0))::numeric AS shots_on_target,
      SUM(COALESCE(ps.penalties_won,          0))::numeric AS penalties_won,
      SUM(COALESCE(ps.offsides,               0))::numeric AS offsides,
      SUM(COALESCE(ps.key_passes,             0))::numeric AS key_passes,
      SUM(COALESCE(ps.chances_created,        0))::numeric AS chances_created,
      SUM(COALESCE(ps.crosses_success,        0))::numeric AS crosses_success,
      SUM(COALESCE(ps.crosses_failed,         0))::numeric AS crosses_failed,
      SUM(COALESCE(ps.assists,                0))::numeric AS assists,
      SUM(COALESCE(ps.accurate_passes,        0))::numeric AS accurate_passes,
      SUM(COALESCE(ps.total_passes,           0))::numeric AS total_passes,
      SUM(COALESCE(ps.long_passes_accurate,   0))::numeric AS long_passes_accurate,
      SUM(COALESCE(ps.long_passes_total,      0))::numeric AS long_passes_total,
      SUM(COALESCE(ps.successful_dribbles,    0))::numeric AS successful_dribbles,
      SUM(COALESCE(ps.total_dribbles,         0))::numeric AS total_dribbles,
      SUM(COALESCE(ps.fouls_drawn,            0))::numeric AS fouls_drawn,
      SUM(COALESCE(ps.possession_lost,        0))::numeric AS possession_lost,
      SUM(COALESCE(ps.tackles,               0))::numeric AS tackles,
      SUM(COALESCE(ps.interceptions,          0))::numeric AS interceptions,
      SUM(COALESCE(ps.clearances,             0))::numeric AS clearances,
      SUM(COALESCE(ps.blocked_shots,          0))::numeric AS blocked_shots,
      SUM(COALESCE(ps.times_dribbled_past,    0))::numeric AS times_dribbled_past,
      SUM(COALESCE(ps.recoveries,             0))::numeric AS recoveries,
      SUM(COALESCE(ps.ground_duels_won,       0))::numeric AS ground_duels_won,
      SUM(COALESCE(ps.ground_duels_total,     0))::numeric AS ground_duels_total,
      SUM(COALESCE(ps.aerial_duels_won,       0))::numeric AS aerial_duels_won,
      SUM(COALESCE(ps.aerial_duels_total,     0))::numeric AS aerial_duels_total,
      SUM(COALESCE(ps.fouls_committed,        0))::numeric AS fouls_committed,
      SUM(COALESCE(ps.yellow_cards,           0))::numeric AS yellow_cards,
      SUM(COALESCE(ps.red_cards,              0))::numeric AS red_cards
    FROM public.player_stats ps
    WHERE ps.player_id   = p_player_id
      AND ps.season_year = p_season_year
      AND ps.minutes     > 0
      AND COALESCE(ps.is_archived, false) = false
  ),
  src_live AS (
    -- Agregar todos os jogos aplicados do player neste season (todas as competicoes)
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
           WHERE pfp.player_id    = p_player_id
             AND pfpm.season_year = p_season_year
             AND pfpm.status      = 'applied'),
          SUM(GREATEST(0, LEAST(COALESCE(mp.minutes_played, 0), 90)))::numeric
        )
      ) AS minutes,
      SUM(COALESCE(mps.goals,            0))::numeric AS goals,
      SUM(COALESCE(mps.shots_on_target,  0))::numeric AS shots_on_target,
      SUM(COALESCE(mps.penalties_won,    0))::numeric AS penalties_won,
      SUM(COALESCE(mps.offsides,         0))::numeric AS offsides,
      SUM(COALESCE(mps.key_passes,       0))::numeric AS key_passes,
      SUM(COALESCE(mps.chances_created,  0))::numeric AS chances_created,
      SUM(COALESCE(mps.crosses_success,  0))::numeric AS crosses_success,
      SUM(COALESCE(mps.crosses_failed,   0))::numeric AS crosses_failed,
      SUM(COALESCE(mps.assists,          0))::numeric AS assists,
      -- passes_completed = passes certos; passes_total = passes errados (convencao historica)
      SUM(COALESCE(mps.passes_completed, 0))::numeric AS accurate_passes,
      SUM(COALESCE(mps.passes_completed, 0) + COALESCE(mps.passes_total, 0))::numeric AS total_passes,
      0::numeric                                      AS long_passes_accurate,
      0::numeric                                      AS long_passes_total,
      -- dribbles_total = dribles errados (convencao historica)
      SUM(COALESCE(mps.dribbles_success, 0))::numeric AS successful_dribbles,
      SUM(COALESCE(mps.dribbles_success, 0) + COALESCE(mps.dribbles_total, 0))::numeric AS total_dribbles,
      SUM(COALESCE(mps.fouls_suffered,   0))::numeric AS fouls_drawn,
      SUM(COALESCE(mps.possession_lost,  0))::numeric AS possession_lost,
      SUM(COALESCE(mps.tackles,          0))::numeric AS tackles,
      SUM(COALESCE(mps.interceptions,    0))::numeric AS interceptions,
      SUM(COALESCE(mps.clearances,       0))::numeric AS clearances,
      SUM(COALESCE(mps.blocked_shots,    0))::numeric AS blocked_shots,
      SUM(COALESCE(mps.was_dribbled,     0))::numeric AS times_dribbled_past,
      SUM(COALESCE(mps.recoveries,       0))::numeric AS recoveries,
      -- duels_won / duels_total = duelos de chao (ground duels)
      SUM(COALESCE(mps.duels_won,        0))::numeric AS ground_duels_won,
      SUM(COALESCE(mps.duels_total,      0))::numeric AS ground_duels_total,
      SUM(COALESCE(mps.aerial_duels_won, 0))::numeric AS aerial_duels_won,
      SUM(COALESCE(mps.aerial_duels_total, 0))::numeric AS aerial_duels_total,
      SUM(COALESCE(mps.fouls_committed,  0))::numeric AS fouls_committed,
      SUM(COALESCE(mps.yellow_cards,     0))::numeric AS yellow_cards,
      SUM(COALESCE(mps.red_cards,        0))::numeric AS red_cards
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    LEFT JOIN public.match_player_stats mps
           ON mps.match_id  = mp.match_id
          AND mps.player_id = mp.player_id
    WHERE mp.player_id                   = p_player_id
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
    SUM(key_passes)           AS key_passes,
    SUM(chances_created)      AS chances_created,
    SUM(crosses_success)      AS crosses_success,
    SUM(crosses_failed)       AS crosses_failed,
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

  -- ============================================================
  -- PASSO 1: Per-90
  -- ============================================================
  v_goals_p90               := (COALESCE(v_stats.goals,               0) * 90.0) / v_minutes;
  v_shots_on_target_p90     := (COALESCE(v_stats.shots_on_target,     0) * 90.0) / v_minutes;
  v_penalties_won_p90       := (COALESCE(v_stats.penalties_won,       0) * 90.0) / v_minutes;
  v_offsides_p90            := (COALESCE(v_stats.offsides,            0) * 90.0) / v_minutes;

  v_key_passes_p90          := (COALESCE(v_stats.key_passes,          0) * 90.0) / v_minutes;
  v_chances_created_p90     := (COALESCE(v_stats.chances_created,     0) * 90.0) / v_minutes;
  v_crosses_success_p90     := (COALESCE(v_stats.crosses_success,     0) * 90.0) / v_minutes;
  v_crosses_failed_p90      := (COALESCE(v_stats.crosses_failed,      0) * 90.0) / v_minutes;

  v_assists_p90             := (COALESCE(v_stats.assists,             0) * 90.0) / v_minutes;
  v_accurate_passes_p90     := (COALESCE(v_stats.accurate_passes,     0) * 90.0) / v_minutes;
  v_long_passes_accurate_p90 := (COALESCE(v_stats.long_passes_accurate, 0) * 90.0) / v_minutes;
  v_long_passes_failed_p90  := (GREATEST(0, COALESCE(v_stats.long_passes_total, 0) - COALESCE(v_stats.long_passes_accurate, 0)) * 90.0) / v_minutes;
  v_successful_dribbles_p90 := (COALESCE(v_stats.successful_dribbles, 0) * 90.0) / v_minutes;
  v_dribbles_failed_p90     := (GREATEST(0, COALESCE(v_stats.total_dribbles,   0) - COALESCE(v_stats.successful_dribbles, 0)) * 90.0) / v_minutes;
  v_fouls_drawn_p90         := (COALESCE(v_stats.fouls_drawn,         0) * 90.0) / v_minutes;
  v_passes_failed_p90       := (GREATEST(0, COALESCE(v_stats.total_passes,     0) - COALESCE(v_stats.accurate_passes,    0)) * 90.0) / v_minutes;
  v_possession_lost_p90     := (COALESCE(v_stats.possession_lost,     0) * 90.0) / v_minutes;

  v_tackles_p90             := (COALESCE(v_stats.tackles,             0) * 90.0) / v_minutes;
  v_interceptions_p90       := (COALESCE(v_stats.interceptions,       0) * 90.0) / v_minutes;
  v_clearances_p90          := (COALESCE(v_stats.clearances,          0) * 90.0) / v_minutes;
  v_blocked_shots_p90       := (COALESCE(v_stats.blocked_shots,       0) * 90.0) / v_minutes;
  v_times_dribbled_past_p90 := (COALESCE(v_stats.times_dribbled_past, 0) * 90.0) / v_minutes;

  v_recoveries_p90          := (COALESCE(v_stats.recoveries,          0) * 90.0) / v_minutes;
  v_ground_duels_won_p90    := (COALESCE(v_stats.ground_duels_won,    0) * 90.0) / v_minutes;
  v_ground_duels_lost_p90   := (GREATEST(0, COALESCE(v_stats.ground_duels_total, 0) - COALESCE(v_stats.ground_duels_won,  0)) * 90.0) / v_minutes;
  v_aerial_duels_won_p90    := (COALESCE(v_stats.aerial_duels_won,    0) * 90.0) / v_minutes;
  v_aerial_duels_lost_p90   := (GREATEST(0, COALESCE(v_stats.aerial_duels_total, 0) - COALESCE(v_stats.aerial_duels_won,  0)) * 90.0) / v_minutes;
  v_fouls_committed_p90     := (COALESCE(v_stats.fouls_committed,     0) * 90.0) / v_minutes;
  v_yellow_p90              := (COALESCE(v_stats.yellow_cards,        0) * 90.0) / v_minutes;
  v_red_p90                 := (COALESCE(v_stats.red_cards,           0) * 90.0) / v_minutes;

  -- ============================================================
  -- PASSO 2: Sub-scores
  -- Positivo: LEAST(100, (p90 / cap) * 100)
  -- Negativo: GREATEST(0, 100 - (p90 / pen_cap) * 100)
  -- ============================================================

  -- ATAQUE (4 sub-scores)
  v_s_goals              := LEAST(100.0, (v_goals_p90           / 0.55) * 100.0);
  v_s_shots_on_target    := LEAST(100.0, (v_shots_on_target_p90 / 1.80) * 100.0);
  v_s_penalties_won      := LEAST(100.0, (v_penalties_won_p90   / 0.10) * 100.0);
  v_s_offsides_neg       := GREATEST(0.0, 100.0 - (v_offsides_p90           / 1.50) * 100.0);

  -- CRIACAO (4 sub-scores)
  v_s_key_passes         := LEAST(100.0, (v_key_passes_p90      / 2.20) * 100.0);
  v_s_chances_created    := LEAST(100.0, (v_chances_created_p90 / 0.80) * 100.0);
  v_s_crosses_success    := LEAST(100.0, (v_crosses_success_p90 / 1.50) * 100.0);
  v_s_crosses_failed_neg := GREATEST(0.0, 100.0 - (v_crosses_failed_p90      / 4.00) * 100.0);

  -- TECNICA (9 sub-scores)
  v_s_assists                := LEAST(100.0, (v_assists_p90              / 0.45) * 100.0);
  v_s_accurate_passes        := LEAST(100.0, (v_accurate_passes_p90      / 40.0) * 100.0);
  v_s_long_passes_accurate   := LEAST(100.0, (v_long_passes_accurate_p90 / 4.50) * 100.0);
  v_s_long_passes_failed_neg := GREATEST(0.0, 100.0 - (v_long_passes_failed_p90  / 6.00) * 100.0);
  v_s_successful_dribbles    := LEAST(100.0, (v_successful_dribbles_p90  / 3.00) * 100.0);
  v_s_dribbles_failed_neg    := GREATEST(0.0, 100.0 - (v_dribbles_failed_p90     / 2.50) * 100.0);
  v_s_fouls_drawn            := LEAST(100.0, (v_fouls_drawn_p90          / 2.60) * 100.0);
  v_s_passes_failed_neg      := GREATEST(0.0, 100.0 - (v_passes_failed_p90       / 12.0) * 100.0);
  v_s_possession_lost_neg    := GREATEST(0.0, 100.0 - (v_possession_lost_p90     / 15.0) * 100.0);

  -- DEFESA (5 sub-scores)
  v_s_tackles            := LEAST(100.0, (v_tackles_p90             / 3.15) * 100.0);
  v_s_interceptions      := LEAST(100.0, (v_interceptions_p90       / 2.45) * 100.0);
  v_s_clearances         := LEAST(100.0, (v_clearances_p90          / 4.20) * 100.0);
  v_s_blocked_shots      := LEAST(100.0, (v_blocked_shots_p90       / 1.00) * 100.0);
  v_s_times_dribbled_neg := GREATEST(0.0, 100.0 - (v_times_dribbled_past_p90 / 2.80) * 100.0);

  -- TATICA (8 sub-scores)
  v_s_recoveries             := LEAST(100.0, (v_recoveries_p90          / 9.00) * 100.0);
  v_s_ground_duels_won       := LEAST(100.0, (v_ground_duels_won_p90    / 3.75) * 100.0);
  v_s_ground_duels_lost_neg  := GREATEST(0.0, 100.0 - (v_ground_duels_lost_p90   / 4.00) * 100.0);
  v_s_aerial_duels_won       := LEAST(100.0, (v_aerial_duels_won_p90    / 2.25) * 100.0);
  v_s_aerial_duels_lost_neg  := GREATEST(0.0, 100.0 - (v_aerial_duels_lost_p90    / 3.00) * 100.0);
  v_s_fouls_committed_neg    := GREATEST(0.0, 100.0 - (v_fouls_committed_p90      / 3.00) * 100.0);
  v_s_yellow_neg             := GREATEST(0.0, 100.0 - (v_yellow_p90               / 0.30) * 100.0);
  v_s_red_neg                := GREATEST(0.0, 100.0 - (v_red_p90                  / 0.05) * 100.0);

  -- ============================================================
  -- PASSO 3: Score dos 5 eixos = media simples dos sub-scores
  -- ============================================================
  v_ata := (v_s_goals + v_s_shots_on_target + v_s_penalties_won + v_s_offsides_neg) / 4.0;
  v_cri := (v_s_key_passes + v_s_chances_created + v_s_crosses_success + v_s_crosses_failed_neg) / 4.0;
  v_tec := (v_s_assists + v_s_accurate_passes + v_s_long_passes_accurate + v_s_long_passes_failed_neg
            + v_s_successful_dribbles + v_s_dribbles_failed_neg + v_s_fouls_drawn
            + v_s_passes_failed_neg + v_s_possession_lost_neg) / 9.0;
  v_def := (v_s_tackles + v_s_interceptions + v_s_clearances + v_s_blocked_shots + v_s_times_dribbled_neg) / 5.0;
  v_tat := (v_s_recoveries + v_s_ground_duels_won + v_s_ground_duels_lost_neg
            + v_s_aerial_duels_won + v_s_aerial_duels_lost_neg
            + v_s_fouls_committed_neg + v_s_yellow_neg + v_s_red_neg) / 8.0;

  -- Clamp 0-100
  v_ata := GREATEST(0.0, LEAST(100.0, v_ata));
  v_cri := GREATEST(0.0, LEAST(100.0, v_cri));
  v_tec := GREATEST(0.0, LEAST(100.0, v_tec));
  v_def := GREATEST(0.0, LEAST(100.0, v_def));
  v_tat := GREATEST(0.0, LEAST(100.0, v_tat));

  -- Fator de confianca (1.0 a partir de 900 minutos)
  v_ata := v_ata * v_confidence;
  v_cri := v_cri * v_confidence;
  v_tec := v_tec * v_confidence;
  v_def := v_def * v_confidence;
  v_tat := v_tat * v_confidence;

  -- Arredondar
  v_ata := GREATEST(0, LEAST(100, ROUND(v_ata)));
  v_cri := GREATEST(0, LEAST(100, ROUND(v_cri)));
  v_tec := GREATEST(0, LEAST(100, ROUND(v_tec)));
  v_def := GREATEST(0, LEAST(100, ROUND(v_def)));
  v_tat := GREATEST(0, LEAST(100, ROUND(v_tat)));

  v_per90 := jsonb_build_object(
    'goals',               v_goals_p90,
    'shots_on_target',     v_shots_on_target_p90,
    'penalties_won',       v_penalties_won_p90,
    'offsides',            v_offsides_p90,
    'key_passes',          v_key_passes_p90,
    'chances_created',     v_chances_created_p90,
    'crosses_success',     v_crosses_success_p90,
    'crosses_failed',      v_crosses_failed_p90,
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
    'red_cards',           v_red_p90
  );

  v_final_scores := jsonb_build_object(
    'ata', v_ata, 'cri', v_cri, 'tec', v_tec, 'def', v_def, 'tat', v_tat
  );

  -- ============================================================
  -- PASSO 4: Persistir - DELETE (todas as competicoes do season) + INSERT
  -- Garante 1 unica linha por (player, season) com o competition_id representativo.
  -- ============================================================
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
      'minutes',      v_minutes,
      'matches',      v_matches,
      'per90',        v_per90,
      'final_scores', v_final_scores,
      'engine_version', 'v8',
      'data_sources', 'player_stats + match_player_stats (all competitions in season)',
      'benchmarks', jsonb_build_object(
        'ata', jsonb_build_object('goals', 0.55, 'shots_on_target', 1.80, 'penalties_won', 0.10, 'offsides_neg', 1.50),
        'cri', jsonb_build_object('key_passes', 2.20, 'chances_created', 0.80, 'crosses_success', 1.50, 'crosses_failed_neg', 4.00),
        'tec', jsonb_build_object('assists', 0.45, 'accurate_passes', 40.0, 'long_passes_accurate', 4.50, 'successful_dribbles', 3.00, 'fouls_drawn', 2.60, 'passes_failed_neg', 12.0, 'long_passes_failed_neg', 6.00, 'dribbles_failed_neg', 2.50, 'possession_lost_neg', 15.0),
        'def', jsonb_build_object('tackles', 3.15, 'interceptions', 2.45, 'clearances', 4.20, 'blocked_shots', 1.00, 'times_dribbled_neg', 2.80),
        'tat', jsonb_build_object('recoveries', 9.00, 'ground_duels_won', 3.75, 'aerial_duels_won', 2.25, 'ground_duels_lost_neg', 4.00, 'aerial_duels_lost_neg', 3.00, 'fouls_committed_neg', 3.00, 'yellow_neg', 0.30, 'red_neg', 0.05)
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

-- ============================================================
-- Orquestrador por jogador: chama a funcao UMA vez por season_year
-- usando um competition_id representativo (o menor UUID encontrado).
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_player_all_attributes(p_player_id uuid)
RETURNS TABLE(competition_id uuid, season_year integer, result jsonb) AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH all_season_competitions AS (
    -- Todas as (season_year, competition_id) do jogador nas 2 fontes
    SELECT ps.season_year, ps.competition_id
    FROM public.player_stats ps
    WHERE ps.player_id      = p_player_id
      AND ps.season_year    IS NOT NULL
      AND ps.competition_id IS NOT NULL
      AND ps.minutes        > 0
      AND COALESCE(ps.is_archived, false) = false
    UNION ALL
    SELECT m.season_year, m.competition_id
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id                   = p_player_id
      AND m.season_year                  IS NOT NULL
      AND m.competition_id               IS NOT NULL
      AND m.status                       = 'applied'
      AND COALESCE(mp.is_removed, false) = false
  ),
  -- Um competition_id representativo por season (DISTINCT ON, UUID nao tem MIN nativo)
  one_per_season AS (
    SELECT DISTINCT ON (asc2.season_year) asc2.season_year, asc2.competition_id
    FROM all_season_competitions asc2
    ORDER BY asc2.season_year, asc2.competition_id::text
  )
  SELECT
    ops.competition_id,
    ops.season_year,
    public.calculate_player_attribute_scores(p_player_id, ops.competition_id, ops.season_year) AS result
  FROM one_per_season ops;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Orquestrador global: percorre todos os jogadores com dados
-- em qualquer das 2 fontes e dispara recalculo por season.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_all_attribute_scores()
RETURNS TABLE(player_id uuid, player_name text, rows_processed integer) AS $$
#variable_conflict use_column
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
        AND ps2.season_year    IS NOT NULL
        AND ps2.competition_id IS NOT NULL
        AND COALESCE(ps2.is_archived, false) = false
      UNION
      SELECT DISTINCT mp2.player_id
      FROM public.match_players mp2
      JOIN public.matches m2 ON m2.id = mp2.match_id
      WHERE m2.status         = 'applied'
        AND m2.season_year    IS NOT NULL
        AND m2.competition_id IS NOT NULL
        AND COALESCE(mp2.is_removed, false) = false
    )
    ORDER BY p.full_name
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.recalculate_player_all_attributes(v_player.id);
    RETURN QUERY SELECT v_player.id, v_player.full_name, v_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara recalculo imediato
SELECT * FROM public.recalculate_all_attribute_scores();
