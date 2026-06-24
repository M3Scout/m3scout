-- Fix trailing spaces in competitions.country column
UPDATE public.competitions
SET country = TRIM(country)
WHERE country != TRIM(country);
