-- Drop the existing tier check constraint and add a new one that includes 'D'
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_tier_check;

-- Add new constraint with Tier D included
ALTER TABLE public.competitions ADD CONSTRAINT competitions_tier_check 
  CHECK (tier IN ('S', 'A', 'B', 'C', 'D'));