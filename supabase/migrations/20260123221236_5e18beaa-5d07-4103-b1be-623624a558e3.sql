-- Step 1: Add 'player' role to the existing enum
-- This must be committed before it can be used in functions
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'player';

-- Step 2: Add linked_player_id column to user_roles for player-to-athlete linking
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS linked_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

-- Step 3: Create index for faster lookups on linked_player_id
CREATE INDEX IF NOT EXISTS idx_user_roles_linked_player_id 
ON public.user_roles(linked_player_id) 
WHERE linked_player_id IS NOT NULL;