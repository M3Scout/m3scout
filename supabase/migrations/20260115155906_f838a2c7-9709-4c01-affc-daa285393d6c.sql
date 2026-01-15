-- Add half and display_minute columns to match_events for proper event tracking
ALTER TABLE public.match_events 
ADD COLUMN IF NOT EXISTS half INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS display_minute TEXT;