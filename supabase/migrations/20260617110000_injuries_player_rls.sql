-- Allow athletes to view their own injury history
-- Previously only internal users (admin/scout/editor/viewer) could SELECT this table.

CREATE POLICY "Players can view own injuries"
  ON public.player_injuries FOR SELECT
  USING (
    is_player(auth.uid())
    AND player_id = get_linked_player_id(auth.uid())
  );
