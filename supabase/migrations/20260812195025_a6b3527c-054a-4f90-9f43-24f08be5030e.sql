-- Date-aware resolution of the club an athlete belongs to right now:
-- 1) active loan (athlete is out on loan), 2) active owning contract (holder club,
-- so the athlete returns automatically when a loan expires), 3) flagged current,
-- 4) most recent contract. Archived contracts ignored.
CREATE OR REPLACE FUNCTION public.resolve_current_club(p_player_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_name
  FROM (
    SELECT
      club_name,
      start_date,
      CASE
        WHEN start_date <= CURRENT_DATE
             AND (end_date IS NULL OR end_date >= CURRENT_DATE)
             AND lower(COALESCE(contract_type, '')) = 'loan' THEN 1
        WHEN start_date <= CURRENT_DATE
             AND (end_date IS NULL OR end_date >= CURRENT_DATE) THEN 2
        WHEN COALESCE(is_current, false) THEN 3
        ELSE 4
      END AS prio
    FROM public.player_contract_history
    WHERE player_id = p_player_id
      AND COALESCE(is_archived, false) = false
      AND club_name IS NOT NULL
  ) t
  ORDER BY prio, start_date DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.sync_player_current_club()
RETURNS TRIGGER AS $$
DECLARE
  target_player_id uuid := COALESCE(NEW.player_id, OLD.player_id);
  resolved_club text;
BEGIN
  resolved_club := public.resolve_current_club(target_player_id);

  UPDATE public.players
  SET current_club = resolved_club
  WHERE id = target_player_id
    AND current_club IS DISTINCT FROM resolved_club;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Public view resolves the club live, so an expiring loan flips the athlete back
-- to the holder club without waiting for any write.
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
    COALESCE(public.resolve_current_club(p.id), p.current_club) AS current_club,
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
   FROM players p
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

-- Re-sync the cached column for everyone with the new rules.
UPDATE public.players p
SET current_club = public.resolve_current_club(p.id)
WHERE public.resolve_current_club(p.id) IS NOT NULL
  AND p.current_club IS DISTINCT FROM public.resolve_current_club(p.id);