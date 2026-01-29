-- Add soft-delete/archive columns to player_stats for cleanup of ghost records
ALTER TABLE public.player_stats
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_reason text DEFAULT NULL;

-- Create index for archive queries
CREATE INDEX IF NOT EXISTS idx_player_stats_archived ON public.player_stats(is_archived) WHERE is_archived = true;

-- Comment explaining the purpose
COMMENT ON COLUMN public.player_stats.is_archived IS 'Soft-delete flag for cleanup of ghost/duplicate records';
COMMENT ON COLUMN public.player_stats.archived_reason IS 'Reason for archiving (e.g., auto_cleanup_live_dup)';