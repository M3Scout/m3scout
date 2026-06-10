-- Drop dependent view to allow column type change
DROP VIEW IF EXISTS public.public_players_safe;

ALTER TABLE public.players ALTER COLUMN auto_rating TYPE NUMERIC;
ALTER TABLE public.players ALTER COLUMN auto_potential TYPE NUMERIC;

-- Recreate view (same definition as latest cleanup migration)
CREATE VIEW public.public_players_safe AS
SELECT id, slug, full_name, "position", secondary_positions, birth_date, age,
   height, weight, dominant_foot, nationality, current_club, country,
   photo_url, bio_public, highlight_video_url, is_public, is_archived,
   auto_rating, auto_potential, estimated_level, market_value,
   market_value_currency, market_value_trend, physical_status,
   ready_to_compete, body_fat_percentage, muscle_mass, wingspan, max_speed,
   sprint_30m, vo2_max, playing_height_preference, play_style,
   primary_tactical_role, secondary_tactical_role, strengths,
   areas_to_develop, passports, created_at, updated_at
FROM public.players
WHERE is_public = true AND (is_archived = false OR is_archived IS NULL);

ALTER VIEW public.public_players_safe SET (security_invoker = on);
GRANT SELECT ON public.public_players_safe TO anon, authenticated;
GRANT ALL ON public.public_players_safe TO service_role;

-- Round existing values to integers per FIFA scale (0-99)
UPDATE public.players
SET auto_rating = ROUND(auto_rating),
    auto_potential = ROUND(auto_potential)
WHERE auto_rating IS NOT NULL;

-- Recalculate all ratings via the (already fixed) updater that reads final_index_100
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.players LOOP
    PERFORM public.update_player_auto_rating(r.id);
  END LOOP;
END $$;
