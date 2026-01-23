-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive INSERT policy that only allows the trigger function (SECURITY DEFINER) to insert
-- Since the trigger runs with SECURITY DEFINER, it bypasses RLS, so we can use a restrictive policy
CREATE POLICY "Only authenticated system can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);

-- Note: The trigger function uses SECURITY DEFINER which bypasses RLS,
-- so it can still insert notifications while direct inserts are blocked