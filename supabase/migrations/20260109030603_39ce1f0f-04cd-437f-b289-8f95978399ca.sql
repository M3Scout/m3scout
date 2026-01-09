-- Add display_name and competition_code columns
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS competition_code TEXT;

-- Create index for competition_code
CREATE INDEX IF NOT EXISTS idx_competitions_code ON public.competitions(competition_code);

-- Update display_name for Brazilian state championships
-- Format: "{State Name} {Division}" e.g., "Cearense A1"
UPDATE public.competitions
SET display_name = CASE state
  WHEN 'AC' THEN 'Acreano ' || COALESCE(division, 'A1')
  WHEN 'AL' THEN 'Alagoano ' || COALESCE(division, 'A1')
  WHEN 'AM' THEN 'Amazonense ' || COALESCE(division, 'A1')
  WHEN 'AP' THEN 'Amapaense ' || COALESCE(division, 'A1')
  WHEN 'BA' THEN 'Baiano ' || COALESCE(division, 'A1')
  WHEN 'CE' THEN 'Cearense ' || COALESCE(division, 'A1')
  WHEN 'DF' THEN 'Brasiliense ' || COALESCE(division, 'A1')
  WHEN 'ES' THEN 'Capixaba ' || COALESCE(division, 'A1')
  WHEN 'GO' THEN 'Goiano ' || COALESCE(division, 'A1')
  WHEN 'MA' THEN 'Maranhense ' || COALESCE(division, 'A1')
  WHEN 'MG' THEN 'Mineiro ' || COALESCE(division, 'A1')
  WHEN 'MS' THEN 'Sul-Mato-Grossense ' || COALESCE(division, 'A1')
  WHEN 'MT' THEN 'Mato-Grossense ' || COALESCE(division, 'A1')
  WHEN 'PA' THEN 'Paraense ' || COALESCE(division, 'A1')
  WHEN 'PB' THEN 'Paraibano ' || COALESCE(division, 'A1')
  WHEN 'PE' THEN 'Pernambucano ' || COALESCE(division, 'A1')
  WHEN 'PI' THEN 'Piauiense ' || COALESCE(division, 'A1')
  WHEN 'PR' THEN 'Paranaense ' || COALESCE(division, 'A1')
  WHEN 'RJ' THEN 'Carioca ' || COALESCE(division, 'A1')
  WHEN 'RN' THEN 'Potiguar ' || COALESCE(division, 'A1')
  WHEN 'RO' THEN 'Rondoniense ' || COALESCE(division, 'A1')
  WHEN 'RR' THEN 'Roraimense ' || COALESCE(division, 'A1')
  WHEN 'RS' THEN 'Gaúcho ' || COALESCE(division, 'A1')
  WHEN 'SC' THEN 'Catarinense ' || COALESCE(division, 'A1')
  WHEN 'SE' THEN 'Sergipano ' || COALESCE(division, 'A1')
  WHEN 'SP' THEN 'Paulista ' || COALESCE(division, 'A1')
  WHEN 'TO' THEN 'Tocantinense ' || COALESCE(division, 'A1')
  ELSE name
END,
competition_code = 'BR-' || state || '-' || COALESCE(division, 'A1')
WHERE type = 'state_league' AND state IS NOT NULL;

-- Update display_name for other Brazilian competitions
UPDATE public.competitions
SET display_name = CASE 
  WHEN division = 'Serie A' THEN 'Brasileirão Série A'
  WHEN division = 'Serie B' THEN 'Brasileirão Série B'
  WHEN division = 'Serie C' THEN 'Brasileirão Série C'
  WHEN division = 'Serie D' THEN 'Brasileirão Série D'
  WHEN division = 'Copa do Brasil' THEN 'Copa do Brasil'
  ELSE name
END,
competition_code = CASE
  WHEN division = 'Serie A' THEN 'BR-SER-A'
  WHEN division = 'Serie B' THEN 'BR-SER-B'
  WHEN division = 'Serie C' THEN 'BR-SER-C'
  WHEN division = 'Serie D' THEN 'BR-SER-D'
  WHEN division = 'Copa do Brasil' THEN 'BR-CDB'
  ELSE 'BR-' || COALESCE(division, 'OTHER')
END
WHERE country = 'Brazil' AND type != 'state_league';

-- Standardize country name to Portuguese
UPDATE public.competitions
SET country = 'Brasil'
WHERE country = 'Brazil';

-- Update name column to use new format for state championships
UPDATE public.competitions
SET name = 'Brasil – ' || display_name || ' (' || state || ')'
WHERE type = 'state_league' AND state IS NOT NULL AND display_name IS NOT NULL;

-- Update name column for national competitions
UPDATE public.competitions
SET name = 'Brasil – ' || display_name
WHERE country = 'Brasil' AND type != 'state_league' AND display_name IS NOT NULL;

-- Create function to validate division levels
CREATE OR REPLACE FUNCTION public.validate_competition_division()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only validate Brazilian state championships
  IF NEW.type = 'state_league' AND NEW.country = 'Brasil' THEN
    -- São Paulo can have A1, A2, A3, A4
    IF NEW.state = 'SP' THEN
      IF NEW.division NOT IN ('A1', 'A2', 'A3', 'A4') THEN
        RAISE EXCEPTION 'São Paulo state championships only allow divisions A1, A2, A3, or A4';
      END IF;
    ELSE
      -- All other states only A1 and A2
      IF NEW.division NOT IN ('A1', 'A2') THEN
        RAISE EXCEPTION 'State championships only allow divisions A1 or A2 (except São Paulo)';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_competition_division_trigger ON public.competitions;
CREATE TRIGGER validate_competition_division_trigger
BEFORE INSERT OR UPDATE ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.validate_competition_division();