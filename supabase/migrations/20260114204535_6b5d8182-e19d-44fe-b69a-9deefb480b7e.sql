-- Update the compute_competition_coefficients function with new tier thresholds
-- Official thresholds (Regra Definitiva):
-- Tier S: coeficiente > 1.01
-- Tier A: 0.97 <= coeficiente <= 1.01
-- Tier B: 0.93 <= coeficiente < 0.97
-- Tier C: 0.89 <= coeficiente < 0.93
-- Tier D: coeficiente < 0.89

CREATE OR REPLACE FUNCTION public.compute_competition_coefficients()
RETURNS TRIGGER AS $$
DECLARE
  v_state_coef NUMERIC := 1.0;
  v_type_coef NUMERIC := 1.0;
  v_tier TEXT;
  v_final NUMERIC;
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
    WHEN 'continental' THEN v_type_coef := 1.15;
    WHEN 'cup' THEN v_type_coef := 1.05;
    WHEN 'league' THEN v_type_coef := 1.0;
    WHEN 'state_league' THEN v_type_coef := 0.95;
    ELSE v_type_coef := 1.0;
  END CASE;
  
  -- Calculate computed coefficient (state × type modifiers)
  NEW.computed_coefficient := ROUND((v_state_coef * v_type_coef)::NUMERIC, 4);
  
  -- Calculate final coefficient (base × computed)
  v_final := ROUND((NEW.base_coefficient * NEW.computed_coefficient)::NUMERIC, 4);
  NEW.final_coefficient := v_final;
  
  -- Determine tier based on final_coefficient
  -- NEW OFFICIAL THRESHOLDS:
  -- Tier S → final_coefficient > 1.01
  -- Tier A → 0.97 <= final_coefficient <= 1.01
  -- Tier B → 0.93 <= final_coefficient < 0.97
  -- Tier C → 0.89 <= final_coefficient < 0.93
  -- Tier D → final_coefficient < 0.89
  v_tier := CASE
    WHEN v_final > 1.01 THEN 'S'
    WHEN v_final >= 0.97 THEN 'A'
    WHEN v_final >= 0.93 THEN 'B'
    WHEN v_final >= 0.89 THEN 'C'
    ELSE 'D'
  END;
  
  NEW.tier := v_tier;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update the recalculate_all_competition_coefficients function with new tier thresholds
CREATE OR REPLACE FUNCTION public.recalculate_all_competition_coefficients()
RETURNS TABLE(
  competition_id UUID,
  competition_name TEXT,
  old_final NUMERIC,
  new_final NUMERIC,
  new_tier TEXT
) AS $$
DECLARE
  comp RECORD;
  v_state_coef NUMERIC;
  v_type_coef NUMERIC;
  v_computed NUMERIC;
  v_final NUMERIC;
  v_tier TEXT;
BEGIN
  FOR comp IN SELECT * FROM public.competitions LOOP
    -- Get state coefficient
    v_state_coef := 1.0;
    IF comp.country = 'Brasil' AND comp.state IS NOT NULL THEN
      SELECT base_coefficient INTO v_state_coef
      FROM public.brazil_state_tiers
      WHERE state = comp.state;
      
      IF v_state_coef IS NULL THEN
        v_state_coef := 1.0;
      END IF;
    END IF;
    
    -- Apply type modifiers
    CASE comp.type
      WHEN 'continental' THEN v_type_coef := 1.15;
      WHEN 'cup' THEN v_type_coef := 1.05;
      WHEN 'league' THEN v_type_coef := 1.0;
      WHEN 'state_league' THEN v_type_coef := 0.95;
      ELSE v_type_coef := 1.0;
    END CASE;
    
    -- Calculate coefficients
    v_computed := ROUND((v_state_coef * v_type_coef)::NUMERIC, 4);
    v_final := ROUND((comp.base_coefficient * v_computed)::NUMERIC, 4);
    
    -- Determine tier with NEW OFFICIAL THRESHOLDS
    v_tier := CASE
      WHEN v_final > 1.01 THEN 'S'
      WHEN v_final >= 0.97 THEN 'A'
      WHEN v_final >= 0.93 THEN 'B'
      WHEN v_final >= 0.89 THEN 'C'
      ELSE 'D'
    END;
    
    -- Update the competition
    UPDATE public.competitions
    SET 
      computed_coefficient = v_computed,
      final_coefficient = v_final,
      tier = v_tier,
      updated_at = now()
    WHERE id = comp.id;
    
    -- Return the result
    competition_id := comp.id;
    competition_name := comp.name;
    old_final := comp.final_coefficient;
    new_final := v_final;
    new_tier := v_tier;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;