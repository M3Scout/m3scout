-- Fix RLS: Allow users to read their own user_roles
-- This is critical for the auth flow to work properly

-- Add policy for users to view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Also ensure users can view their own permissions (already exists but verify)
-- The existing policy "Users can view their own permissions" should work

-- Update user_permissions to use authenticated role instead of public
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage all permissions"
ON public.user_permissions
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update user_roles policies to use authenticated role
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage non-owner roles" ON public.user_roles;
CREATE POLICY "Admins can manage non-owner roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) 
  AND (
    (user_id = auth.uid()) 
    OR (is_owner = false) 
    OR is_owner(auth.uid())
  )
)
WITH CHECK (
  is_admin(auth.uid()) 
  AND (
    (user_id = auth.uid()) 
    OR (is_owner = false) 
    OR is_owner(auth.uid())
  )
);