ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS crosses_success integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crosses_failed integer NOT NULL DEFAULT 0;