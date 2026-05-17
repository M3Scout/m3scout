-- Add is_live_correction flag to player_stats.
-- When true, this row was created by editing a LIVE stats group in PlayerStatsForm
-- and should REPLACE (not sum with) the underlying live row for the same
-- (player_id, season_year, competition_id) in the public stats view.
-- Rows with is_live_correction = false are additive manual entries.

ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS is_live_correction boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.player_stats.is_live_correction IS
  'True when this row was saved as a correction to a live match stats group. '
  'The public view uses this flag to suppress the underlying live row instead of '
  'summing it with this correction.';
