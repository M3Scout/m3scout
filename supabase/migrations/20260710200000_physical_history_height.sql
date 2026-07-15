-- Height is tracked as a periodic evaluation metric too (players grow, especially
-- youth prospects), so it needs a slot in player_physical_history alongside
-- weight/body_fat/etc, not just the static players.height field.
ALTER TABLE public.player_physical_history
  ADD COLUMN IF NOT EXISTS height INTEGER;
