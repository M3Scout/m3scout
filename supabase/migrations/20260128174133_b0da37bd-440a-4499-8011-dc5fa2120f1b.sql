-- Allow players to view their own market score
-- Uses the existing get_linked_player_id() function to resolve player_id from user_id

CREATE POLICY "Players can view their own market score"
ON public.market_scores
FOR SELECT
USING (
  has_valid_role(auth.uid()) 
  AND athlete_id = get_linked_player_id(auth.uid())
);