-- Ensure RLS stays enabled
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;

-- Replace UPDATE policy so it applies even if requests run under the `public` role (common with PostgREST)
DROP POLICY IF EXISTS "Scouts can update their own reports" ON public.scouting_reports;

CREATE POLICY "update_own_scouting_reports"
ON public.scouting_reports
FOR UPDATE
TO public
USING (scout_id = auth.uid() OR is_admin(auth.uid()))
WITH CHECK (scout_id = auth.uid() OR is_admin(auth.uid()));
