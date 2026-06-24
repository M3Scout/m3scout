-- Update tier classification thresholds (Regra Definitiva)
--
-- New thresholds based on final_coefficient:
--   Tier S: final_coefficient >= 0.9400
--   Tier A: 0.8500 <= final_coefficient < 0.9400
--   Tier B: 0.7400 <= final_coefficient < 0.8500
--   Tier C: 0.6000 <= final_coefficient < 0.7400
--   Tier D: final_coefficient < 0.6000

-- 1. Update the trigger function (fires on INSERT / UPDATE)
CREATE OR REPLACE FUNCTION public.compute_competition_coefficients()
RETURNS TRIGGER AS $$
DECLARE
  v_state_coef NUMERIC := 1.0;
  v_type_coef  NUMERIC := 1.0;
  v_tier       TEXT;
  v_final      NUMERIC;
BEGIN
  -- Get state coefficient if applicable (Brazil only)
  IF NEW.country = 'Brasil' AND NEW.state IS NOT NULL THEN
    SELECT base_coefficient INTO v_state_coef
    FROM public.brazil_state_tiers
    WHERE state = NEW.state;

    IF v_state_coef IS NULL THEN
      v_state_coef := 1.0;
    END IF;
  END IF;

  -- Apply type-based modifiers
  CASE NEW.type
    WHEN 'continental'   THEN v_type_coef := 1.15;
    WHEN 'cup'           THEN v_type_coef := 1.05;
    WHEN 'league'        THEN v_type_coef := 1.0;
    WHEN 'state_league'  THEN v_type_coef := 0.95;
    ELSE                      v_type_coef := 1.0;
  END CASE;

  -- Compute coefficients
  NEW.computed_coefficient := ROUND((v_state_coef * v_type_coef)::NUMERIC, 4);
  v_final := ROUND((NEW.base_coefficient * NEW.computed_coefficient)::NUMERIC, 4);
  NEW.final_coefficient := v_final;

  -- Determine tier based solely on final_coefficient
  v_tier := CASE
    WHEN v_final >= 0.9400 THEN 'S'
    WHEN v_final >= 0.8500 THEN 'A'
    WHEN v_final >= 0.7400 THEN 'B'
    WHEN v_final >= 0.6000 THEN 'C'
    ELSE 'D'
  END;

  NEW.tier := v_tier;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Update the bulk-recalculate helper function
CREATE OR REPLACE FUNCTION public.recalculate_all_competition_coefficients()
RETURNS TABLE(
  competition_id   UUID,
  competition_name TEXT,
  old_final        NUMERIC,
  new_final        NUMERIC,
  new_tier         TEXT
) AS $$
DECLARE
  comp         RECORD;
  v_state_coef NUMERIC;
  v_type_coef  NUMERIC;
  v_computed   NUMERIC;
  v_final      NUMERIC;
  v_tier       TEXT;
BEGIN
  FOR comp IN SELECT * FROM public.competitions LOOP
    -- State coefficient
    v_state_coef := 1.0;
    IF comp.country = 'Brasil' AND comp.state IS NOT NULL THEN
      SELECT base_coefficient INTO v_state_coef
      FROM public.brazil_state_tiers
      WHERE state = comp.state;

      IF v_state_coef IS NULL THEN
        v_state_coef := 1.0;
      END IF;
    END IF;

    -- Type modifier
    CASE comp.type
      WHEN 'continental'  THEN v_type_coef := 1.15;
      WHEN 'cup'          THEN v_type_coef := 1.05;
      WHEN 'league'       THEN v_type_coef := 1.0;
      WHEN 'state_league' THEN v_type_coef := 0.95;
      ELSE                     v_type_coef := 1.0;
    END CASE;

    -- Compute
    v_computed := ROUND((v_state_coef * v_type_coef)::NUMERIC, 4);
    v_final    := ROUND((comp.base_coefficient * v_computed)::NUMERIC, 4);

    -- Tier
    v_tier := CASE
      WHEN v_final >= 0.9400 THEN 'S'
      WHEN v_final >= 0.8500 THEN 'A'
      WHEN v_final >= 0.7400 THEN 'B'
      WHEN v_final >= 0.6000 THEN 'C'
      ELSE 'D'
    END;

    UPDATE public.competitions
    SET
      computed_coefficient = v_computed,
      final_coefficient    = v_final,
      tier                 = v_tier,
      updated_at           = now()
    WHERE id = comp.id;

    competition_id   := comp.id;
    competition_name := comp.name;
    old_final        := comp.final_coefficient;
    new_final        := v_final;
    new_tier         := v_tier;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- 3. Recalculate all existing competitions with the new thresholds
SELECT * FROM public.recalculate_all_competition_coefficients();
