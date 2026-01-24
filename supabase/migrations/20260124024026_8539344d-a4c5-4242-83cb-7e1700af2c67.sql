
-- Drop the incorrect policy that uses 'public' role
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

-- Recreate with correct role (authenticated)
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
