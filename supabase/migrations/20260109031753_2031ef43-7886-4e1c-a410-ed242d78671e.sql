-- Step 1: Delete duplicate competitions keeping only the first one (by created_at)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY competition_code ORDER BY created_at) as rn
  FROM competitions 
  WHERE competition_code IS NOT NULL
)
DELETE FROM competitions 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Step 2: Add has_phases column
ALTER TABLE public.competitions 
ADD COLUMN IF NOT EXISTS has_phases boolean NOT NULL DEFAULT false;

-- Step 3: Add unique constraint on competition_code
ALTER TABLE public.competitions 
ADD CONSTRAINT competitions_competition_code_key UNIQUE (competition_code);

-- Step 4: Add unique constraint for country + type + state + division + name
ALTER TABLE public.competitions 
ADD CONSTRAINT competitions_unique_entry 
UNIQUE NULLS NOT DISTINCT (country, type, state, division, name);

-- Step 5: Add check constraint for base_coefficient range (0.05 - 2.50)
ALTER TABLE public.competitions 
ADD CONSTRAINT competitions_base_coefficient_range 
CHECK (base_coefficient >= 0.05 AND base_coefficient <= 2.50);

-- Step 6: Add check constraint for visibility_score range (0 - 100)
ALTER TABLE public.competitions 
ADD CONSTRAINT competitions_visibility_score_range 
CHECK (visibility_score >= 0 AND visibility_score <= 100);

-- Step 7: Update validation trigger for state competition divisions
CREATE OR REPLACE FUNCTION public.validate_competition_division()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only validate Brazilian state championships
  IF NEW.type = 'state_league' AND NEW.country = 'Brasil' THEN
    -- São Paulo can have A1, A2, A3, A4
    IF NEW.state = 'SP' THEN
      IF NEW.division IS NOT NULL AND NEW.division NOT IN ('A1', 'A2', 'A3', 'A4') THEN
        RAISE EXCEPTION 'São Paulo state championships only allow divisions A1, A2, A3, or A4';
      END IF;
    ELSE
      -- All other states only A1 and A2
      IF NEW.division IS NOT NULL AND NEW.division NOT IN ('A1', 'A2') THEN
        RAISE EXCEPTION 'State championships only allow divisions A1 or A2 (except São Paulo)';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 8: Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_competition_division_trigger'
  ) THEN
    CREATE TRIGGER validate_competition_division_trigger
    BEFORE INSERT OR UPDATE ON public.competitions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_competition_division();
  END IF;
END $$;