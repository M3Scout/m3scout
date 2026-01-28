-- Add RLS policy to allow internal users to view all player season goals
CREATE POLICY "Internal users can view all goals"
ON public.player_season_goals
FOR SELECT
USING (is_internal_user(auth.uid()));