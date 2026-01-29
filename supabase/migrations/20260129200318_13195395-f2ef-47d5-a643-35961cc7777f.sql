
-- Fix is_internal_user function to include 'editor' and 'viewer' roles
-- These are valid internal roles that should see organization data

CREATE OR REPLACE FUNCTION public.is_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'scout', 'editor', 'viewer')
      AND status = 'active'
  )
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_internal_user(uuid) IS 'Returns true if user has any internal role (admin, scout, editor, viewer) with active status. Used for RLS policies.';
