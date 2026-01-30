-- Add new columns to player_contract_history for enhanced management
ALTER TABLE public.player_contract_history
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_player_contract_history_sort 
ON public.player_contract_history(player_id, sort_order);

-- Create index for filtering archived contracts
CREATE INDEX IF NOT EXISTS idx_player_contract_history_archived 
ON public.player_contract_history(player_id, is_archived);

-- Create a function to ensure only one current contract per player
CREATE OR REPLACE FUNCTION public.set_single_current_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.player_contract_history
    SET is_current = false
    WHERE player_id = NEW.player_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for ensuring single current contract
DROP TRIGGER IF EXISTS ensure_single_current_contract ON public.player_contract_history;
CREATE TRIGGER ensure_single_current_contract
BEFORE INSERT OR UPDATE OF is_current ON public.player_contract_history
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION public.set_single_current_contract();