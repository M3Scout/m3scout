-- Add 'substitution' to match_event_type enum
ALTER TYPE public.match_event_type ADD VALUE IF NOT EXISTS 'substitution';

-- Add player_in_id column to match_events for substitution events
ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS player_in_id UUID REFERENCES public.players(id);

-- Add comment for clarity
COMMENT ON COLUMN public.match_events.player_in_id IS 'For substitution events: the player entering the match. player_id is the player exiting.';