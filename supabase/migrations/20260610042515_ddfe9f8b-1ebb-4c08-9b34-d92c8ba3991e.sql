DROP VIEW IF EXISTS public.public_players_safe;

ALTER TABLE public.players
  DROP COLUMN IF EXISTS overall_rating,
  DROP COLUMN IF EXISTS potential_rating;

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

GRANT SELECT ON public.public_players_safe TO anon, authenticated;
GRANT ALL ON public.public_players_safe TO service_role;