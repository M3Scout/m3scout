-- Add notes field to match_players for per-player comments during/after the game
ALTER TABLE public.match_players
ADD COLUMN notes text DEFAULT NULL;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.match_players.notes IS 'Scout notes/comments about the player performance during this specific match';