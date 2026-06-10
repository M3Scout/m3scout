-- 1) Add auto_potential column to players
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS auto_potential numeric(4,1) NOT NULL DEFAULT 0;

-- 2) Update auto rating function to also compute and persist auto_potential.
CREATE OR REPLACE FUNCTION public.update_player_auto_rating(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_rating NUMERIC(3,1);
  v_old_rating NUMERIC(3,1);
  v_age INT;
  v_bonus INT;
  v_potential NUMERIC(4,1);
BEGIN
  -- Get current rating + age
  SELECT auto_rating, age INTO v_old_rating, v_age
  FROM public.players WHERE id = p_player_id;

  -- Calculate new rating
  v_new_rating := public.calculate_athlete_auto_rating(p_player_id);

  -- Compute potential based on age curve
  IF v_new_rating IS NULL THEN
    v_potential := NULL;
  ELSE
    v_bonus := CASE
      WHEN v_age IS NULL THEN 2
      WHEN v_age <= 18 THEN 15
      WHEN v_age <= 21 THEN 10
      WHEN v_age <= 24 THEN 6
      WHEN v_age <= 27 THEN 2
      ELSE 0
    END;
    v_potential := LEAST(GREATEST(v_new_rating, v_new_rating + v_bonus), 99);
  END IF;

  -- Update player
  UPDATE public.players
  SET
    auto_rating = v_new_rating,
    auto_potential = COALESCE(v_potential, 0),
    rating_updated_at = NOW()
  WHERE id = p_player_id;

  -- Record history if rating changed or is new
  IF v_new_rating IS NOT NULL AND (v_old_rating IS NULL OR v_old_rating IS DISTINCT FROM v_new_rating) THEN
    INSERT INTO public.player_rating_history (player_id, rating, recorded_at)
    VALUES (p_player_id, v_new_rating, NOW());
  END IF;
END;
$function$;

-- 3) Backfill auto_potential for all existing players based on current auto_rating + age
UPDATE public.players
SET auto_potential = LEAST(
  GREATEST(
    COALESCE(auto_rating, 0),
    COALESCE(auto_rating, 0) + CASE
      WHEN age IS NULL THEN 2
      WHEN age <= 18 THEN 15
      WHEN age <= 21 THEN 10
      WHEN age <= 24 THEN 6
      WHEN age <= 27 THEN 2
      ELSE 0
    END
  ),
  99
);