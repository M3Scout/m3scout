CREATE OR REPLACE FUNCTION public.resolve_current_club(p_player_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_name
  FROM public.player_contract_history
  WHERE player_id = p_player_id
    AND COALESCE(is_archived, false) = false
    AND club_name IS NOT NULL
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 1 ELSE 2 END,
    start_date DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.resolve_current_contract_status(p_player_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 'emprestado'
    ELSE 'contracted'
  END
  FROM public.player_contract_history
  WHERE player_id = p_player_id
    AND COALESCE(is_archived, false) = false
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 1 ELSE 2 END,
    start_date DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.sync_player_current_club()
RETURNS TRIGGER AS $$
DECLARE
  target_player_id uuid := COALESCE(NEW.player_id, OLD.player_id);
  resolved_club text;
  resolved_status text;
  resolved_contract_id uuid;
BEGIN
  SELECT id, club_name,
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 'emprestado' ELSE 'contracted' END
  INTO resolved_contract_id, resolved_club, resolved_status
  FROM public.player_contract_history
  WHERE player_id = target_player_id
    AND COALESCE(is_archived, false) = false
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 1 ELSE 2 END,
    start_date DESC
  LIMIT 1;

  UPDATE public.player_contract_history
  SET is_current = (id = resolved_contract_id)
  WHERE player_id = target_player_id
    AND COALESCE(is_current, false) IS DISTINCT FROM (id = resolved_contract_id);

  UPDATE public.players
  SET current_club = resolved_club,
      contract_status = COALESCE(resolved_status, 'free'),
      contract_start = CASE WHEN resolved_contract_id IS NULL THEN NULL ELSE contract_start END,
      contract_end = CASE WHEN resolved_contract_id IS NULL THEN NULL ELSE contract_end END
  WHERE id = target_player_id
    AND (current_club IS DISTINCT FROM resolved_club
      OR contract_status IS DISTINCT FROM COALESCE(resolved_status, 'free'));

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE VIEW public.public_players_safe AS
 SELECT p.id,
    p.slug,
    p.full_name,
    p."position",
    p.secondary_positions,
    p.birth_date,
    p.age,
    p.height,
    p.dominant_foot,
    p.nationality,
    public.resolve_current_club(p.id) AS current_club,
    p.country,
    p.photo_url,
    p.bio_public,
    p.highlight_video_url,
    p.is_public,
    p.is_archived,
    p.auto_rating,
    p.auto_potential,
    p.estimated_level,
    p.market_value,
    p.market_value_currency,
    p.market_value_trend,
    p.physical_status,
    p.ready_to_compete,
    p.playing_height_preference,
    p.play_style,
    p.primary_tactical_role,
    p.secondary_tactical_role,
    p.strengths,
    p.areas_to_develop,
    p.wingspan,
    p.created_at,
    p.updated_at,
    COALESCE(ph.weight, p.weight) AS weight,
    COALESCE(ph.body_fat_percentage, p.body_fat_percentage) AS body_fat_percentage,
    COALESCE(ph.muscle_mass, p.muscle_mass) AS muscle_mass,
    COALESCE(ph.max_speed, p.max_speed) AS max_speed,
    COALESCE(ph.sprint_30m, p.sprint_30m) AS sprint_30m,
    COALESCE(ph.vo2_max, p.vo2_max) AS vo2_max
   FROM public.players p
     LEFT JOIN LATERAL ( SELECT player_physical_history.weight,
            player_physical_history.body_fat_percentage,
            player_physical_history.muscle_mass,
            player_physical_history.max_speed,
            player_physical_history.sprint_30m,
            player_physical_history.vo2_max
           FROM player_physical_history
          WHERE player_physical_history.player_id = p.id
          ORDER BY player_physical_history.recorded_at DESC
         LIMIT 1) ph ON true
  WHERE p.is_public = true AND (p.is_archived = false OR p.is_archived IS NULL);

GRANT SELECT ON public.public_players_safe TO anon;
GRANT SELECT ON public.public_players_safe TO authenticated;

WITH resolved AS (
  SELECT p.id AS player_id,
         public.resolve_current_club(p.id) AS club,
         COALESCE(public.resolve_current_contract_status(p.id), 'free') AS status
  FROM public.players p
)
UPDATE public.players p
SET current_club = r.club,
    contract_status = r.status,
    contract_start = CASE WHEN r.club IS NULL THEN NULL ELSE p.contract_start END,
    contract_end = CASE WHEN r.club IS NULL THEN NULL ELSE p.contract_end END
FROM resolved r
WHERE p.id = r.player_id
  AND (p.current_club IS DISTINCT FROM r.club OR p.contract_status IS DISTINCT FROM r.status);

WITH current_contracts AS (
  SELECT DISTINCT ON (player_id) player_id, id
  FROM public.player_contract_history
  WHERE COALESCE(is_archived, false) = false
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY player_id,
    CASE WHEN lower(COALESCE(contract_type, '')) = 'loan' THEN 1 ELSE 2 END,
    start_date DESC
)
UPDATE public.player_contract_history c
SET is_current = (c.id = cc.id)
FROM public.players p
LEFT JOIN current_contracts cc ON cc.player_id = p.id
WHERE c.player_id = p.id
  AND COALESCE(c.is_current, false) IS DISTINCT FROM (c.id = cc.id);