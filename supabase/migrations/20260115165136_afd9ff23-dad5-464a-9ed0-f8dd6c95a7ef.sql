-- Add soft-delete fields to match_players for player removal from match
ALTER TABLE public.match_players
ADD COLUMN is_removed boolean DEFAULT false,
ADD COLUMN removed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN removed_by uuid DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.match_players.is_removed IS 'Whether the player was removed from this match';
COMMENT ON COLUMN public.match_players.removed_at IS 'Timestamp when the player was removed';
COMMENT ON COLUMN public.match_players.removed_by IS 'User ID who removed the player';