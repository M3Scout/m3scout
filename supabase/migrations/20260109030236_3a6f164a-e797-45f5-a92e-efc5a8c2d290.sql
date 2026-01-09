-- Add deleted_at column for soft delete
ALTER TABLE public.player_market_value_history
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for performance on non-deleted entries
CREATE INDEX idx_player_market_value_history_active 
ON public.player_market_value_history(player_id, recorded_at) 
WHERE deleted_at IS NULL;

-- Function to recalculate player market value summary from history
CREATE OR REPLACE FUNCTION public.recalculate_player_market_value_summary(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_entry RECORD;
  peak_entry RECORD;
  new_trend TEXT;
  prev_value NUMERIC;
BEGIN
  -- Get the most recent non-deleted entry
  SELECT id, value, currency, recorded_at
  INTO latest_entry
  FROM player_market_value_history
  WHERE player_id = p_player_id AND deleted_at IS NULL
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Get the peak value entry (same currency as latest if exists)
  IF latest_entry IS NOT NULL THEN
    SELECT value
    INTO peak_entry
    FROM player_market_value_history
    WHERE player_id = p_player_id 
      AND deleted_at IS NULL
      AND currency = latest_entry.currency
    ORDER BY value DESC
    LIMIT 1;
    
    -- Get previous entry to calculate trend
    SELECT value INTO prev_value
    FROM player_market_value_history
    WHERE player_id = p_player_id 
      AND deleted_at IS NULL
      AND recorded_at < latest_entry.recorded_at
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    -- Calculate trend
    IF prev_value IS NULL THEN
      new_trend := 'stable';
    ELSIF latest_entry.value > prev_value THEN
      new_trend := 'up';
    ELSIF latest_entry.value < prev_value THEN
      new_trend := 'down';
    ELSE
      new_trend := 'stable';
    END IF;

    -- Update player record
    UPDATE players
    SET 
      market_value = latest_entry.value,
      market_value_currency = latest_entry.currency,
      market_value_trend = new_trend,
      updated_at = now()
    WHERE id = p_player_id;
  ELSE
    -- No entries, clear market value
    UPDATE players
    SET 
      market_value = NULL,
      market_value_currency = 'EUR',
      market_value_trend = 'stable',
      updated_at = now()
    WHERE id = p_player_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.recalculate_player_market_value_summary(UUID) TO authenticated;