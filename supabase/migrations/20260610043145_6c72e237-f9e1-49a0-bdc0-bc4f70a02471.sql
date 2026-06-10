-- Fix: auto_rating and auto_potential must be on 0-99 scale (FIFA-like),
-- not on the legacy 0-5 scale.
CREATE OR REPLACE FUNCTION public.update_player_auto_rating(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_legacy_rating NUMERIC(3,1);
  v_new_rating NUMERIC(5,1);
  v_old_rating NUMERIC(5,1);
  v_age INT;
  v_bonus INT;
  v_potential NUMERIC(5,1);
BEGIN
  -- Get current rating + age
  SELECT auto_rating, age INTO v_old_rating, v_age
  FROM public.players WHERE id = p_player_id;

  -- Run calculation (still returns legacy 0-5 but also stores final_index_100 in details)
  v_legacy_rating := public.calculate_athlete_auto_rating(p_player_id);

  -- Read the real 0-100 index from details (single source of truth)
  SELECT NULLIF((auto_rating_details->'scores'->>'final_index_100'), '')::NUMERIC
  INTO v_new_rating
  FROM public.players WHERE id = p_player_id;

  IF v_new_rating IS NOT NULL THEN
    v_new_rating := LEAST(GREATEST(v_new_rating, 0), 99);
  END IF;

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

  -- Record history if changed
  IF v_new_rating IS NOT NULL AND (v_old_rating IS NULL OR v_old_rating IS DISTINCT FROM v_new_rating) THEN
    INSERT INTO public.player_rating_history (player_id, rating, recorded_at)
    VALUES (p_player_id, v_new_rating, NOW());
  END IF;
END;
$function$;

-- Backfill: recompute all players with the new 0-99 scale
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.players LOOP
    PERFORM public.update_player_auto_rating(r.id);
  END LOOP;
END $$;