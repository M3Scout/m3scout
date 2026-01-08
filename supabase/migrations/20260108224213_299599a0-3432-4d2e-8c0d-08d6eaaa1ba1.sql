-- Drop the restrictive policy and create a truly public one for SELECT
DROP POLICY IF EXISTS "Anyone can view active competitions" ON public.competitions;

CREATE POLICY "Public can view active competitions"
ON public.competitions FOR SELECT
USING (is_active = true);