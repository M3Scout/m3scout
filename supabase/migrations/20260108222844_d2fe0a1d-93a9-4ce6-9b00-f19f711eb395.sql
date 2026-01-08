-- Fix the leads insert policy to validate required fields
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;

CREATE POLICY "Anyone can create leads with valid data"
ON public.leads FOR INSERT
WITH CHECK (
  name IS NOT NULL AND 
  name <> '' AND 
  email IS NOT NULL AND 
  email <> '' AND
  subject IS NOT NULL AND 
  subject <> '' AND
  message IS NOT NULL AND 
  message <> ''
);