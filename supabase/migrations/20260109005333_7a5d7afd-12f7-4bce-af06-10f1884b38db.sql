-- Add soft delete fields to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_players_is_archived ON public.players(is_archived);

-- Update RLS policies to handle archived players
-- Internal users can still see archived players (with toggle)
-- Public players policy should exclude archived
DROP POLICY IF EXISTS "Public players visible to everyone" ON public.players;
CREATE POLICY "Public players visible to everyone" 
ON public.players 
FOR SELECT 
USING (is_public = true AND (is_archived = false OR is_archived IS NULL));