-- Add unique constraint for player_stats upsert
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_stats_player_competition_season_unique'
  ) THEN
    ALTER TABLE public.player_stats 
    ADD CONSTRAINT player_stats_player_competition_season_unique 
    UNIQUE (player_id, competition_id, season_year);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;