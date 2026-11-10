-- Fontes de estatísticas para o perfil público do atleta (/atleta/:slug).
--
-- A página logada calcula os números no navegador a partir de 5 tabelas restritas
-- (match_players + matches, player_field_presence, match_player_stats,
-- manual_player_stats, player_stats) e as junta com mergeSeasonRows.
-- Esta função devolve essas mesmas linhas, no mesmo formato das consultas do app,
-- para que o perfil público mostre exatamente os mesmos números a visitantes.
--
-- Segurança: só responde para atletas visíveis em public_players_safe, e remove
-- campos internos (anotações, autoria, detalhamento de nota).
CREATE OR REPLACE FUNCTION public.get_public_player_stats_sources(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_players jsonb;
  v_match_ids uuid[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.public_players_safe p WHERE p.id = p_player_id) THEN
    RETURN NULL;
  END IF;

  -- = usePlayerMatchStatsBySeasonCompetition: match_players + matches!inner,
  --   .neq("is_removed", true) e status finished/applied
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', mp.id,
           'match_id', mp.match_id,
           'player_id', mp.player_id,
           'started', mp.started,
           'entered_minute', mp.entered_minute,
           'exited_minute', mp.exited_minute,
           'minutes_played', mp.minutes_played,
           'match', jsonb_build_object(
             'id', m.id,
             'match_date', m.match_date,
             'opponent_name', m.opponent_name,
             'competition_id', m.competition_id,
             'season_year', m.season_year,
             'duration_minutes', m.duration_minutes,
             'added_time_first_half', m.added_time_first_half,
             'added_time_second_half', m.added_time_second_half,
             'status', m.status,
             'competition', CASE WHEN c.id IS NULL THEN NULL
               ELSE jsonb_build_object('id', c.id, 'name', c.name, 'display_name', c.display_name) END
           )
         )), '[]'::jsonb),
         COALESCE(array_agg(mp.match_id), '{}')
    INTO v_match_players, v_match_ids
  FROM public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
  LEFT JOIN public.competitions c ON c.id = m.competition_id
  WHERE mp.player_id = p_player_id
    AND mp.is_removed <> true
    AND m.status IN ('finished', 'applied');

  RETURN jsonb_build_object(
    'match_players', v_match_players,

    'presence', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'match_id', fp.match_id, 'period', fp.period,
        'entered_at_seconds', fp.entered_at_seconds, 'exited_at_seconds', fp.exited_at_seconds))
      FROM public.player_field_presence fp
      WHERE fp.player_id = p_player_id AND fp.match_id = ANY(v_match_ids)
    ), '[]'::jsonb),

    'match_player_stats', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) - 'rating_breakdown')
      FROM public.match_player_stats s
      WHERE s.player_id = p_player_id AND s.match_id = ANY(v_match_ids)
    ), '[]'::jsonb),

    -- = useManualPlayerStats (ordenado por temporada, mais recente primeiro)
    'manual', COALESCE((
      SELECT jsonb_agg((to_jsonb(ms) - 'notes' - 'created_by') || jsonb_build_object(
               'competition', CASE WHEN c.id IS NULL THEN NULL
                 ELSE jsonb_build_object('id', c.id, 'name', c.name, 'display_name', c.display_name) END)
             ORDER BY ms.season_year DESC)
      FROM public.manual_player_stats ms
      LEFT JOIN public.competitions c ON c.id = ms.competition_id
      WHERE ms.player_id = p_player_id
    ), '[]'::jsonb),

    -- = consulta legada de player_stats do useComparePlayerStats
    'player_stats', COALESCE((
      SELECT jsonb_agg((to_jsonb(ps) - 'archived_reason') || jsonb_build_object(
               'competition', CASE WHEN c.id IS NULL THEN NULL
                 ELSE jsonb_build_object('id', c.id, 'name', c.name, 'display_name', c.display_name) END))
      FROM public.player_stats ps
      LEFT JOIN public.competitions c ON c.id = ps.competition_id
      WHERE ps.player_id = p_player_id
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_player_stats_sources(uuid) TO anon, authenticated, service_role;
