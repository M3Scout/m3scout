-- Create function to calculate computed_coefficient
CREATE OR REPLACE FUNCTION public.calculate_competition_coefficient()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- computed_coefficient defaults to base_coefficient
  -- Phase weight is applied at query time in scouting reports
  NEW.computed_coefficient := NEW.base_coefficient;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-update computed_coefficient
DROP TRIGGER IF EXISTS calculate_competition_coefficient_trigger ON public.competitions;
CREATE TRIGGER calculate_competition_coefficient_trigger
BEFORE INSERT OR UPDATE OF base_coefficient ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_competition_coefficient();

-- Update all existing competitions to sync computed_coefficient
UPDATE public.competitions 
SET computed_coefficient = base_coefficient 
WHERE computed_coefficient != base_coefficient OR computed_coefficient IS NULL;