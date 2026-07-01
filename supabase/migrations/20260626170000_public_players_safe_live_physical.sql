-- Update public_players_safe to always return the most recent physical evaluation
-- data from player_physical_history instead of the stale static fields on players.
--
-- The view uses SECURITY DEFINER (security_invoker = off), so it runs as the
-- database owner and can read player_physical_history regardless of its RLS
-- policies — no public RLS policy needed, no sensitive data exposed to anon.
--
-- Priority: player_physical_history (latest row) > players static fields.
-- height and wingspan remain static (they are not stored in evaluation history).

CREATE OR REPLACE VIEW public.public_players_safe AS
SELECT
  p.id,
  p.slug,
  p.full_name,
  p.position,
  p.secondary_positions,
  p.birth_date,
  p.age,
  p.height,
  p.wingspan,
  p.dominant_foot,
  p.nationality,
  p.current_club,
  p.country,
  p.photo_url,
  p.bio_public,
  p.highlight_video_url,
  p.is_public,
  p.is_archived,
  p.overall_rating,
  p.potential_rating,
  p.auto_rating,
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
  p.passports,
  p.created_at,
  p.updated_at,
  -- Dynamic physical fields: latest evaluation row wins, falls back to static
  COALESCE(ph.weight,                p.weight)                AS weight,
  COALESCE(ph.body_fat_percentage,   p.body_fat_percentage)   AS body_fat_percentage,
  COALESCE(ph.muscle_mass,           p.muscle_mass)           AS muscle_mass,
  COALESCE(ph.max_speed,             p.max_speed)             AS max_speed,
  COALESCE(ph.sprint_30m,            p.sprint_30m)            AS sprint_30m,
  COALESCE(ph.vo2_max,               p.vo2_max)               AS vo2_max
FROM public.players p
LEFT JOIN LATERAL (
  SELECT
    weight,
    body_fat_percentage,
    muscle_mass,
    max_speed,
    sprint_30m,
    vo2_max
  FROM public.player_physical_history
  WHERE player_id = p.id
  ORDER BY recorded_at DESC
  LIMIT 1
) ph ON true
WHERE p.is_public = true
  AND (p.is_archived = false OR p.is_archived IS NULL);

-- Keep SECURITY DEFINER so the view owner bypasses player_physical_history RLS
-- (anon users can call the view without needing direct table access)
ALTER VIEW public.public_players_safe SET (security_invoker = off);

-- Ensure anon can still SELECT from the view
GRANT SELECT ON public.public_players_safe TO anon;
GRANT SELECT ON public.public_players_safe TO authenticated;
