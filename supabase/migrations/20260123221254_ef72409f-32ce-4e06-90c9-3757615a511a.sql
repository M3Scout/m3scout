-- Step 1: Create a helper function to check if user is a player
CREATE OR REPLACE FUNCTION public.is_player(_user_id uuid)
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
      AND role = 'player'
  )
$$;

-- Step 2: Create a helper function to get linked player id for a user
CREATE OR REPLACE FUNCTION public.get_linked_player_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT linked_player_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'player'
  LIMIT 1
$$;

-- Step 3: RLS policy for players table - player can view only their own profile
DROP POLICY IF EXISTS "Players can view their own profile" ON public.players;

CREATE POLICY "Players can view their own profile"
ON public.players
FOR SELECT
USING (
  id = public.get_linked_player_id(auth.uid())
);

-- Step 4: RLS policy for scouting_reports - player can view only their own reports
DROP POLICY IF EXISTS "Players can view their own reports" ON public.scouting_reports;

CREATE POLICY "Players can view their own reports"
ON public.scouting_reports
FOR SELECT
USING (
  player_id = public.get_linked_player_id(auth.uid())
  AND deleted_at IS NULL
);

-- Step 5: RLS policy for matches - player can view only matches they are in
DROP POLICY IF EXISTS "Players can view their matches" ON public.matches;

CREATE POLICY "Players can view their matches"
ON public.matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.match_players mp
    WHERE mp.match_id = matches.id
      AND mp.player_id = public.get_linked_player_id(auth.uid())
  )
);

-- Step 6: RLS policy for match_players - player can view their own participation
DROP POLICY IF EXISTS "Players can view their match participation" ON public.match_players;

CREATE POLICY "Players can view their match participation"
ON public.match_players
FOR SELECT
USING (
  player_id = public.get_linked_player_id(auth.uid())
);

-- Step 7: RLS policy for match_events - player can view their own events
DROP POLICY IF EXISTS "Players can view their match events" ON public.match_events;

CREATE POLICY "Players can view their match events"
ON public.match_events
FOR SELECT
USING (
  player_id = public.get_linked_player_id(auth.uid())
);

-- Step 8: RLS policy for match_player_stats - player can view their own stats
DROP POLICY IF EXISTS "Players can view their match stats" ON public.match_player_stats;

CREATE POLICY "Players can view their match stats"
ON public.match_player_stats
FOR SELECT
USING (
  player_id = public.get_linked_player_id(auth.uid())
);

-- Step 9: RLS policy for player_attribute_scores - player can view their own
DROP POLICY IF EXISTS "Players can view their attribute scores" ON public.player_attribute_scores;

CREATE POLICY "Players can view their attribute scores"
ON public.player_attribute_scores
FOR SELECT
USING (
  player_id = public.get_linked_player_id(auth.uid())
);

-- Step 10: RLS policy for player_stats - player can view their own
DROP POLICY IF EXISTS "Players can view their stats" ON public.player_stats;

CREATE POLICY "Players can view their stats"
ON public.player_stats
FOR SELECT
USING (
  player_id = public.get_linked_player_id(auth.uid())
);

-- Step 11: Allow player role to view competitions (read-only)
DROP POLICY IF EXISTS "Players can view active competitions" ON public.competitions;

CREATE POLICY "Players can view active competitions"
ON public.competitions
FOR SELECT
USING (
  public.is_player(auth.uid()) AND is_active = true
);