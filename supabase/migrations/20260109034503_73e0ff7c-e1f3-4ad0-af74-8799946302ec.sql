-- Add column to store rating calculation details/breakdown
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS auto_rating_details jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.players.auto_rating_details IS 'JSON breakdown of automatic rating calculation including per-competition stats, weights, and component scores';