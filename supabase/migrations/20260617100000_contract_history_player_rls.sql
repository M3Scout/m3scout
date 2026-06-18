-- Allow athletes to view their own contract history
-- Previously only internal users (admin/scout/editor/viewer) could SELECT this table.
-- Players must be able to see their own club history in /dashboard/atletas/:id.

CREATE POLICY "Players can view own contract history"
  ON public.player_contract_history FOR SELECT
  USING (
    is_player(auth.uid())
    AND player_id = get_linked_player_id(auth.uid())
  );
