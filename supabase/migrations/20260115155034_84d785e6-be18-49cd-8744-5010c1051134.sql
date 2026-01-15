-- Add timer V2 fields to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS half smallint DEFAULT 1,
ADD COLUMN IF NOT EXISTS clock_status text DEFAULT 'stopped' CHECK (clock_status IN ('stopped', 'running', 'paused')),
ADD COLUMN IF NOT EXISTS half_start_time timestamptz,
ADD COLUMN IF NOT EXISTS elapsed_seconds_in_half integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS added_time_first_half integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS added_time_second_half integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_start_time timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.matches.half IS 'Current half of the match: 1 or 2';
COMMENT ON COLUMN public.matches.clock_status IS 'Clock status: stopped, running, or paused';
COMMENT ON COLUMN public.matches.half_start_time IS 'Timestamp when the current half (or resumed play) started';
COMMENT ON COLUMN public.matches.elapsed_seconds_in_half IS 'Accumulated seconds in current half (used when pausing)';
COMMENT ON COLUMN public.matches.added_time_first_half IS 'Added/stoppage time for first half (in minutes)';
COMMENT ON COLUMN public.matches.added_time_second_half IS 'Added/stoppage time for second half (in minutes)';
COMMENT ON COLUMN public.matches.match_start_time IS 'Timestamp when the match officially started';