-- 1. Create a safe public view for players (excludes sensitive fields)
CREATE OR REPLACE VIEW public.public_players_safe AS
SELECT
  id, slug, full_name, position, secondary_positions,
  birth_date, age, height, weight, dominant_foot,
  nationality, current_club, country, photo_url,
  bio_public, highlight_video_url,
  is_public, is_archived,
  overall_rating, potential_rating, auto_rating,
  estimated_level, market_value, market_value_currency, market_value_trend,
  physical_status, ready_to_compete,
  body_fat_percentage, muscle_mass, wingspan, max_speed, sprint_30m, vo2_max,
  playing_height_preference, play_style, primary_tactical_role, secondary_tactical_role,
  strengths, areas_to_develop, passports,
  created_at, updated_at
FROM public.players
WHERE is_public = true AND (is_archived = false OR is_archived IS NULL);

-- Make this view use SECURITY INVOKER (default for new views in PG15+, explicit for safety)
ALTER VIEW public.public_players_safe SET (security_invoker = on);

-- 2. Drop the old overly-permissive public SELECT policy
DROP POLICY IF EXISTS "Public players visible to everyone" ON public.players;

-- 3. Create a new restricted public policy that only allows reading safe columns
-- Anonymous users should use the public_players_safe view instead.
-- But we still need a base policy for the view to work with security_invoker.
-- Since security_invoker means the view runs as the calling user (anon),
-- anon needs SELECT on players but ONLY through the view.
-- We'll create a minimal policy that still allows public access but
-- the view filters columns. Direct table access by anon will show all columns
-- so we need to REVOKE direct SELECT on players from anon and grant it on the view.

-- Revoke direct anon access to the players table
REVOKE SELECT ON public.players FROM anon;

-- Grant anon access only to the safe view
GRANT SELECT ON public.public_players_safe TO anon;

-- Re-add the policy for the view to work (anon still needs RLS pass-through)
-- Since we revoked SELECT, anon can't query the table directly anyway.
-- But the view with security_invoker needs the underlying table accessible.
-- So we use security_definer on this specific safe view instead:
ALTER VIEW public.public_players_safe SET (security_invoker = off);

-- 4. Fix the unified_player_season_stats SECURITY DEFINER issue
ALTER VIEW public.unified_player_season_stats SET (security_invoker = on);