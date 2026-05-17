ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS is_live_correction boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_player_stats_live_correction
  ON public.player_stats (player_id, season_year, competition_id)
  WHERE is_live_correction = true;

COMMENT ON COLUMN public.player_stats.is_live_correction IS
  'When true, this row is a manual correction applied on top of LIVE-aggregated stats for the same (player, season, competition). The public stats view must REPLACE the LIVE row with this one instead of summing them.';