-- Fix the overly permissive INSERT policy
-- The insert should only be done by the system via SECURITY DEFINER functions
DROP POLICY IF EXISTS "System can insert rating history" ON public.player_rating_history;

-- No INSERT policy needed since inserts are done via SECURITY DEFINER function
-- The function bypasses RLS