-- Add team customization fields to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS team_name_display text,
ADD COLUMN IF NOT EXISTS team_logo_url text,
ADD COLUMN IF NOT EXISTS opponent_logo_url text;

-- Add comments for documentation
COMMENT ON COLUMN public.matches.team_name_display IS 'Custom team name to display for this match (overrides global settings)';
COMMENT ON COLUMN public.matches.team_logo_url IS 'Custom team logo URL for this match (overrides global settings)';
COMMENT ON COLUMN public.matches.opponent_logo_url IS 'Optional opponent logo URL';