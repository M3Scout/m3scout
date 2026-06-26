-- Allow athletes to read their own physical history
-- Admin inserts data in /dashboard/atletas/:id which must be visible in /dashboard (athlete view)
CREATE POLICY "Athletes can view own physical history"
  ON public.player_physical_history FOR SELECT
  USING (player_id = public.get_linked_player_id(auth.uid()));
