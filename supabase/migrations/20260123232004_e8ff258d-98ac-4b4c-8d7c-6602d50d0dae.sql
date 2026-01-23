-- Create a helper function to check if user has any valid role (not pending/none)
CREATE OR REPLACE FUNCTION public.has_valid_role(_user_id uuid)
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
      AND role IN ('admin', 'scout', 'editor', 'viewer', 'player')
      AND status = 'active'
  )
$$;

-- Update all existing RLS policies that use is_internal_user or is_player 
-- to also require has_valid_role check

-- For players table - update the policy to require valid role
DROP POLICY IF EXISTS "Players can view their own profile" ON public.players;
CREATE POLICY "Players can view their own profile" 
ON public.players
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  id = get_linked_player_id(auth.uid())
);

-- For scouting_reports - update player policy
DROP POLICY IF EXISTS "Players can view their own reports" ON public.scouting_reports;
CREATE POLICY "Players can view their own reports" 
ON public.scouting_reports
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  player_id = get_linked_player_id(auth.uid()) AND
  deleted_at IS NULL
);

-- For matches - update player policy
DROP POLICY IF EXISTS "Players can view their matches" ON public.matches;
CREATE POLICY "Players can view their matches" 
ON public.matches
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM match_players mp
    WHERE mp.match_id = matches.id 
    AND mp.player_id = get_linked_player_id(auth.uid())
  )
);

-- For match_events - update player policy
DROP POLICY IF EXISTS "Players can view their match events" ON public.match_events;
CREATE POLICY "Players can view their match events" 
ON public.match_events
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  player_id = get_linked_player_id(auth.uid())
);

-- For match_player_stats - update player policy  
DROP POLICY IF EXISTS "Players can view their match stats" ON public.match_player_stats;
CREATE POLICY "Players can view their match stats" 
ON public.match_player_stats
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  player_id = get_linked_player_id(auth.uid())
);

-- For match_players - update player policy
DROP POLICY IF EXISTS "Players can view their match participation" ON public.match_players;
CREATE POLICY "Players can view their match participation" 
ON public.match_players
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  player_id = get_linked_player_id(auth.uid())
);

-- For player_stats - update player policy
DROP POLICY IF EXISTS "Players can view their stats" ON public.player_stats;
CREATE POLICY "Players can view their stats" 
ON public.player_stats
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  player_id = get_linked_player_id(auth.uid())
);

-- For player_attribute_scores - update player policy
DROP POLICY IF EXISTS "Players can view their attribute scores" ON public.player_attribute_scores;
CREATE POLICY "Players can view their attribute scores" 
ON public.player_attribute_scores
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  player_id = get_linked_player_id(auth.uid())
);

-- For notifications - update policy to require valid role
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications
FOR SELECT
USING (
  has_valid_role(auth.uid()) AND
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications
FOR UPDATE
USING (
  has_valid_role(auth.uid()) AND
  auth.uid() = user_id
);