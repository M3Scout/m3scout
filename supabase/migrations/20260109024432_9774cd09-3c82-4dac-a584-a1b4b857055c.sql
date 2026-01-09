-- Add market value fields to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS market_value numeric(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS market_value_currency text DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS market_value_trend text DEFAULT 'stable';

-- Create market value history table
CREATE TABLE IF NOT EXISTS public.player_market_value_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  value numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  note text,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on market value history
ALTER TABLE public.player_market_value_history ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_market_value_history_player 
ON public.player_market_value_history(player_id, recorded_at DESC);

-- RLS Policies for market value history
-- Public can view market value history for public players
CREATE POLICY "Public can view market value history for public players" 
ON public.player_market_value_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE id = player_market_value_history.player_id 
    AND is_public = true 
    AND (is_archived = false OR is_archived IS NULL)
  )
);

-- Internal users can view all market value history
CREATE POLICY "Internal users can view all market value history" 
ON public.player_market_value_history 
FOR SELECT 
USING (is_internal_user(auth.uid()));

-- Scouts and admins can create market value entries
CREATE POLICY "Scouts and admins can create market value entries" 
ON public.player_market_value_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

-- Admins can update market value entries
CREATE POLICY "Admins can update market value entries" 
ON public.player_market_value_history 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Admins can delete market value entries
CREATE POLICY "Admins can delete market value entries" 
ON public.player_market_value_history 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create function to update market value and record history
CREATE OR REPLACE FUNCTION public.update_player_market_value(
  p_player_id uuid,
  p_value numeric,
  p_currency text DEFAULT 'EUR',
  p_note text DEFAULT NULL
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
  
  -- Record history entry
  INSERT INTO public.player_market_value_history (player_id, value, currency, note)
  VALUES (p_player_id, p_value, p_currency, p_note);
END;
$$;