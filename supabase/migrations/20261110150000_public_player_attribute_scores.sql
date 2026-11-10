-- Notas de atributos (ATA/TEC/TAT/DEF/CRI) por temporada para o perfil público do atleta.
-- A tabela player_attribute_scores é restrita; esta função expõe somente as 5 notas
-- agregadas por temporada (média ponderada por minutos, como no AtributoRadar) e
-- apenas de atletas visíveis em public_players_safe.
CREATE OR REPLACE FUNCTION public.get_public_player_attribute_scores(p_player_id uuid)
RETURNS TABLE(season_year integer, ata numeric, tec numeric, tat numeric, def numeric, cri numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT s.season_year,
           GREATEST(COALESCE((s.details->>'minutes')::numeric, 0), 1) AS w,
           COALESCE(s.ata_score_100, 0) AS ata, COALESCE(s.tec_score_100, 0) AS tec,
           COALESCE(s.tat_score_100, 0) AS tat, COALESCE(s.def_score_100, 0) AS def,
           COALESCE(s.cri_score_100, 0) AS cri
    FROM public.player_attribute_scores s
    JOIN public.public_players_safe p ON p.id = s.player_id
    WHERE s.player_id = p_player_id AND s.season_year > 0
  )
  SELECT season_year::integer,
         ROUND(SUM(ata * w) / SUM(w), 1), ROUND(SUM(tec * w) / SUM(w), 1),
         ROUND(SUM(tat * w) / SUM(w), 1), ROUND(SUM(def * w) / SUM(w), 1),
         ROUND(SUM(cri * w) / SUM(w), 1)
  FROM r
  GROUP BY season_year
  ORDER BY season_year DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_player_attribute_scores(uuid) TO anon, authenticated, service_role;
