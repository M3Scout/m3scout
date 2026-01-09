-- Add final_coefficient and tier columns
ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS final_coefficient numeric NOT NULL DEFAULT 1.00;

ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'B';

-- Add check constraint for tier values
ALTER TABLE public.competitions 
ADD CONSTRAINT competitions_tier_check 
CHECK (tier IN ('S', 'A', 'B', 'C'));

-- Create function to calculate final_coefficient and tier
CREATE OR REPLACE FUNCTION public.calculate_competition_final_coefficient()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_country_modifier NUMERIC := 1.0;
  v_type_modifier NUMERIC := 1.0;
  v_division_modifier NUMERIC := 1.0;
  v_final NUMERIC;
  v_tier TEXT;
BEGIN
  -- Future-proof: modifiers can be expanded later
  -- For now, they default to 1.0
  
  -- Calculate final coefficient
  v_final := NEW.base_coefficient * v_country_modifier * v_type_modifier * v_division_modifier;
  
  -- Round to 2 decimal places
  v_final := ROUND(v_final, 2);
  
  -- Determine tier based on final_coefficient
  v_tier := CASE
    WHEN v_final >= 1.10 THEN 'S'
    WHEN v_final >= 0.80 THEN 'A'
    WHEN v_final >= 0.45 THEN 'B'
    ELSE 'C'
  END;
  
  -- Set computed values
  NEW.final_coefficient := v_final;
  NEW.computed_coefficient := v_final;
  NEW.tier := v_tier;
  
  RETURN NEW;
END;
$function$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS calculate_competition_coefficient_trigger ON public.competitions;
CREATE TRIGGER calculate_competition_coefficient_trigger
BEFORE INSERT OR UPDATE OF base_coefficient ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_competition_final_coefficient();

-- Create function to recalculate all competitions
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
    
    -- Calculate new final (for now, equals base since modifiers are 1.0)
    v_new_final := ROUND(v_comp.base_coefficient, 2);
    
    -- Determine tier
    v_new_tier := CASE
      WHEN v_new_final >= 1.10 THEN 'S'
      WHEN v_new_final >= 0.80 THEN 'A'
      WHEN v_new_final >= 0.45 THEN 'B'
      ELSE 'C'
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

-- Initialize final_coefficient and tier for existing competitions
UPDATE public.competitions
SET 
  final_coefficient = ROUND(base_coefficient, 2),
  tier = CASE
    WHEN ROUND(base_coefficient, 2) >= 1.10 THEN 'S'
    WHEN ROUND(base_coefficient, 2) >= 0.80 THEN 'A'
    WHEN ROUND(base_coefficient, 2) >= 0.45 THEN 'B'
    ELSE 'C'
  END,
  computed_coefficient = ROUND(base_coefficient, 2);