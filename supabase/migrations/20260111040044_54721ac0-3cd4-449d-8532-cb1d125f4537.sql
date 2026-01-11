-- Update the calculate_competition_final_coefficient trigger to use new tier thresholds
-- Tier is now calculated ONLY from final_coefficient, not from division/type/country
CREATE OR REPLACE FUNCTION public.calculate_competition_final_coefficient()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_final NUMERIC;
  v_tier TEXT;
BEGIN
  -- final_coefficient is set directly by the user or computed
  -- Use base_coefficient as the source for final_coefficient calculation
  v_final := ROUND(NEW.base_coefficient, 2);
  
  -- Determine tier based SOLELY on final_coefficient
  -- New official thresholds:
  -- Tier S → final_coefficient ≥ 1.90
  -- Tier A → 1.60 ≤ final_coefficient < 1.90
  -- Tier B → 1.30 ≤ final_coefficient < 1.60
  -- Tier C → 1.00 ≤ final_coefficient < 1.30
  -- Tier D → final_coefficient < 1.00
  v_tier := CASE
    WHEN v_final >= 1.90 THEN 'S'
    WHEN v_final >= 1.60 THEN 'A'
    WHEN v_final >= 1.30 THEN 'B'
    WHEN v_final >= 1.00 THEN 'C'
    ELSE 'D'
  END;
  
  -- Set computed values
  NEW.final_coefficient := v_final;
  NEW.computed_coefficient := v_final;
  NEW.tier := v_tier;
  
  RETURN NEW;
END;
$function$;

-- Also update the recalculate_all_competition_coefficients function with new thresholds
CREATE OR REPLACE FUNCTION public.recalculate_all_competition_coefficients()
 RETURNS TABLE(competition_id uuid, competition_name text, old_final numeric, new_final numeric, new_tier text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_comp RECORD;
  v_old_final NUMERIC;
  v_new_final NUMERIC;
  v_new_tier TEXT;
BEGIN
  FOR v_comp IN SELECT id, name, base_coefficient, final_coefficient FROM public.competitions LOOP
    v_old_final := v_comp.final_coefficient;
    
    -- Calculate new final (equals base_coefficient)
    v_new_final := ROUND(v_comp.base_coefficient, 2);
    
    -- Determine tier using new official thresholds
    v_new_tier := CASE
      WHEN v_new_final >= 1.90 THEN 'S'
      WHEN v_new_final >= 1.60 THEN 'A'
      WHEN v_new_final >= 1.30 THEN 'B'
      WHEN v_new_final >= 1.00 THEN 'C'
      ELSE 'D'
    END;
    
    -- Update competition
    UPDATE public.competitions
    SET 
      final_coefficient = v_new_final,
      computed_coefficient = v_new_final,
      tier = v_new_tier
    WHERE id = v_comp.id;
    
    competition_id := v_comp.id;
    competition_name := v_comp.name;
    old_final := v_old_final;
    new_final := v_new_final;
    new_tier := v_new_tier;
    RETURN NEXT;
  END LOOP;
END;
$function$;