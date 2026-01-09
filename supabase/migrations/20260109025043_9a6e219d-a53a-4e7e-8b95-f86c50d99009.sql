-- Add source field to market value history
ALTER TABLE public.player_market_value_history
ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;

-- Update the function to include source
CREATE OR REPLACE FUNCTION public.update_player_market_value(
  p_player_id uuid,
  p_value numeric,
  p_currency text DEFAULT 'EUR',
  p_note text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_recorded_at timestamp with time zone DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_value numeric;
  v_trend text;
BEGIN
  -- Get current market value
  SELECT market_value INTO v_old_value FROM public.players WHERE id = p_player_id;
  
  -- Calculate trend
  IF v_old_value IS NULL THEN
    v_trend := 'stable';
  ELSIF p_value > v_old_value THEN
    v_trend := 'up';
  ELSIF p_value < v_old_value THEN
    v_trend := 'down';
  ELSE
    v_trend := 'stable';
  END IF;
  
  -- Update player market value
  UPDATE public.players
  SET 
    market_value = p_value,
    market_value_currency = p_currency,
    market_value_trend = v_trend,
    updated_at = NOW()
  WHERE id = p_player_id;
  
  -- Record history entry with source and custom date
  INSERT INTO public.player_market_value_history (player_id, value, currency, note, source, recorded_at)
  VALUES (p_player_id, p_value, p_currency, p_note, p_source, p_recorded_at);
END;
$$;