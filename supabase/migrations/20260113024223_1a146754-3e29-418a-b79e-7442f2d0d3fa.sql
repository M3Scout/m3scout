-- Add goalkeeper-specific columns to player_stats table
ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS shots_on_target_against integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_faced integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claims integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crosses_faced integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crosses_stopped integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errors_leading_to_shot integer NOT NULL DEFAULT 0;

-- Add index for goalkeeper queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_player_stats_gk_metrics 
  ON public.player_stats (player_id, season_year, saves, goals_conceded, clean_sheets);

-- Add comment documenting these as GK columns
COMMENT ON COLUMN public.player_stats.shots_on_target_against IS 'Goalkeeper: shots on target faced';
COMMENT ON COLUMN public.player_stats.penalty_faced IS 'Goalkeeper: total penalties faced';
COMMENT ON COLUMN public.player_stats.claims IS 'Goalkeeper: aerial balls claimed (caught)';
COMMENT ON COLUMN public.player_stats.crosses_faced IS 'Goalkeeper: total crosses into the box';
COMMENT ON COLUMN public.player_stats.crosses_stopped IS 'Goalkeeper: crosses intercepted/caught';
COMMENT ON COLUMN public.player_stats.errors_leading_to_shot IS 'Goalkeeper: errors leading to opponent shot';