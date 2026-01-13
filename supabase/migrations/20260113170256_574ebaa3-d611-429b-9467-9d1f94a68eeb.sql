-- Add deleted_at column for soft delete
ALTER TABLE public.scouting_reports 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for faster filtering of non-deleted reports
CREATE INDEX IF NOT EXISTS idx_scouting_reports_deleted_at 
ON public.scouting_reports (deleted_at) 
WHERE deleted_at IS NULL;

-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete reports" ON public.scouting_reports;

-- Create new delete policy that allows admin OR the scout who created it
CREATE POLICY "Scouts can delete their own reports or admins can delete any"
ON public.scouting_reports
FOR DELETE
USING (
  is_admin(auth.uid()) OR scout_id = auth.uid()
);

-- Update SELECT policy to exclude soft-deleted reports
DROP POLICY IF EXISTS "Internal users can view reports" ON public.scouting_reports;

CREATE POLICY "Internal users can view non-deleted reports"
ON public.scouting_reports
FOR SELECT
USING (
  is_internal_user(auth.uid()) AND (deleted_at IS NULL)
);