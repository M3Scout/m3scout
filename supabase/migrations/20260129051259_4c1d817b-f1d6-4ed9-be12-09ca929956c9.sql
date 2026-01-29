-- Add persisted (official) match rating fields
ALTER TABLE public.match_player_stats
ADD COLUMN IF NOT EXISTS rating numeric,
ADD COLUMN IF NOT EXISTS rating_minutes_played integer,
ADD COLUMN IF NOT EXISTS rating_minutes_factor numeric,
ADD COLUMN IF NOT EXISTS rating_engine_version text NOT NULL DEFAULT 'matchRatingEngine_v2',
ADD COLUMN IF NOT EXISTS rating_computed_at timestamp with time zone;

-- (Optional but helpful) index for filtering players with ratings per match
CREATE INDEX IF NOT EXISTS idx_match_player_stats_match_rating
ON public.match_player_stats (match_id, rating);
