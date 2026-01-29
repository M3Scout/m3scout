-- Fix search_path for calculate_minutes_factor function
CREATE OR REPLACE FUNCTION public.calculate_minutes_factor(minutes_played integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Professional Scouting Model minutes factor
  IF minutes_played < 30 THEN RETURN 0.6;
  ELSIF minutes_played < 60 THEN RETURN 0.8;
  ELSIF minutes_played < 80 THEN RETURN 0.9;
  ELSE RETURN 1.0;
  END IF;
END;
$$;