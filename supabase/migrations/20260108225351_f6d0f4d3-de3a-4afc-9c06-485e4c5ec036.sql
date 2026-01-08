-- Drop existing policies on competitions
DROP POLICY IF EXISTS "Admins can manage competitions" ON public.competitions;
DROP POLICY IF EXISTS "Public can view active competitions" ON public.competitions;

-- Create PERMISSIVE policies for competitions

-- Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage competitions"
ON public.competitions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Public can view active competitions (SELECT only)
CREATE POLICY "Public can view active competitions"
ON public.competitions
FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Also fix brazil_state_tiers if needed
DROP POLICY IF EXISTS "Admins can manage state tiers" ON public.brazil_state_tiers;
DROP POLICY IF EXISTS "Anyone can view state tiers" ON public.brazil_state_tiers;

-- Admins can manage state tiers
CREATE POLICY "Admins can manage state tiers"
ON public.brazil_state_tiers
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Anyone can view state tiers
CREATE POLICY "Anyone can view state tiers"
ON public.brazil_state_tiers
FOR SELECT
TO authenticated, anon
USING (true);