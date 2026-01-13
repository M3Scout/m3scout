-- Drop existing UPDATE policy that lacks WITH CHECK
DROP POLICY IF EXISTS "Scouts can update their own reports" ON public.scouting_reports;

-- Create new UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Scouts can update their own reports"
ON public.scouting_reports
FOR UPDATE
TO authenticated
USING ((scout_id = auth.uid()) OR is_admin(auth.uid()))
WITH CHECK ((scout_id = auth.uid()) OR is_admin(auth.uid()));