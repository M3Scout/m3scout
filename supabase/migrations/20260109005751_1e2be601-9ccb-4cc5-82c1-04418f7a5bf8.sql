-- Create table to store rating history
CREATE TABLE public.player_rating_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  rating NUMERIC(3,1) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_player_rating_history_player_id ON public.player_rating_history(player_id);
CREATE INDEX idx_player_rating_history_recorded_at ON public.player_rating_history(recorded_at);

-- Enable RLS
ALTER TABLE public.player_rating_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view rating history"
ON public.player_rating_history
FOR SELECT
USING (is_internal_user(auth.uid()));

CREATE POLICY "System can insert rating history"
ON public.player_rating_history
FOR INSERT
WITH CHECK (true);

-- Update the trigger to also record history
CREATE OR REPLACE FUNCTION public.update_player_auto_rating(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_rating NUMERIC(3,1);
  v_old_rating NUMERIC(3,1);
BEGIN
  -- Get current rating
  SELECT auto_rating INTO v_old_rating FROM public.players WHERE id = p_player_id;
  
  -- Calculate new rating
  v_new_rating := public.calculate_athlete_auto_rating(p_player_id);
  
  -- Update player
  UPDATE public.players
  SET 
    auto_rating = v_new_rating,
    rating_updated_at = NOW()
  WHERE id = p_player_id;
  
  -- Record history if rating changed or is new
  IF v_new_rating IS NOT NULL AND (v_old_rating IS NULL OR v_old_rating IS DISTINCT FROM v_new_rating) THEN
    INSERT INTO public.player_rating_history (player_id, rating, recorded_at)
    VALUES (p_player_id, v_new_rating, NOW());
  END IF;
END;
$function$;

-- Create function to recalculate all ratings (for admin use)
CREATE OR REPLACE FUNCTION public.recalculate_all_player_ratings()
RETURNS TABLE(player_id uuid, player_name text, old_rating numeric, new_rating numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_player RECORD;
  v_old_rating NUMERIC(3,1);
  v_new_rating NUMERIC(3,1);
BEGIN
  FOR v_player IN SELECT id, full_name, auto_rating FROM public.players WHERE (is_archived = false OR is_archived IS NULL) LOOP
    v_old_rating := v_player.auto_rating;
    
    -- Calculate and update
    PERFORM public.update_player_auto_rating(v_player.id);
    
    -- Get new rating
    SELECT p.auto_rating INTO v_new_rating FROM public.players p WHERE p.id = v_player.id;
    
    player_id := v_player.id;
    player_name := v_player.full_name;
    old_rating := v_old_rating;
    new_rating := v_new_rating;
    RETURN NEXT;
  END LOOP;
END;
$function$;