-- v25: Allow competition_id = NULL in player_attribute_scores
-- The TypeScript engine (v25-ts) writes one aggregate row per player+season
-- with competition_id = NULL (across all competitions).
-- PostgreSQL MATCH SIMPLE (default) allows NULL in FK columns without FK lookup.

-- 1. Allow competition_id to be NULL (preserves FK for non-null values)
ALTER TABLE public.player_attribute_scores
  ALTER COLUMN competition_id DROP NOT NULL;

-- 2. Drop old unique constraint that required competition_id to be part of the key
ALTER TABLE public.player_attribute_scores
  DROP CONSTRAINT IF EXISTS player_attribute_scores_player_id_competition_id_season_year_key;

-- 3. One aggregate row per player+season (competition_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pas_aggregate
  ON public.player_attribute_scores (player_id, season_year)
  WHERE competition_id IS NULL;

-- 4. Backwards-compat: per-competition rows (competition_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pas_per_competition
  ON public.player_attribute_scores (player_id, competition_id, season_year)
  WHERE competition_id IS NOT NULL;
