-- ============================================
-- 1. Update RLS to allow players to manage their own goals
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Scouts can create goals" ON public.player_season_goals;
DROP POLICY IF EXISTS "Scouts can update goals" ON public.player_season_goals;

-- Players can create their own goals
CREATE POLICY "Players can create their own goals" 
ON public.player_season_goals 
FOR INSERT 
WITH CHECK (
  (is_player(auth.uid()) AND player_id = get_linked_player_id(auth.uid()))
  OR has_role(auth.uid(), 'scout'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Players can update their own goals
CREATE POLICY "Players can update their own goals" 
ON public.player_season_goals 
FOR UPDATE 
USING (
  (is_player(auth.uid()) AND player_id = get_linked_player_id(auth.uid()))
  OR has_role(auth.uid(), 'scout'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Players can delete their own goals
CREATE POLICY "Players can delete their own goals" 
ON public.player_season_goals 
FOR DELETE 
USING (
  (is_player(auth.uid()) AND player_id = get_linked_player_id(auth.uid()))
  OR is_admin(auth.uid())
);

-- ============================================
-- 2. Create player_achievements table
-- ============================================
CREATE TABLE public.player_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (achievement_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  season_year INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE)::integer,
  metadata JSONB DEFAULT '{}',
  UNIQUE(player_id, achievement_type, achievement_tier, season_year)
);

-- Enable RLS
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

-- Players can view their own achievements
CREATE POLICY "Players can view their own achievements" 
ON public.player_achievements 
FOR SELECT 
USING (
  (is_player(auth.uid()) AND player_id = get_linked_player_id(auth.uid()))
  OR is_internal_user(auth.uid())
);

-- System inserts achievements (via trigger or admin)
CREATE POLICY "Admins can manage achievements" 
ON public.player_achievements 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 3. Create trigger to auto-unlock achievements
-- ============================================
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_player_id UUID;
  v_season_year INTEGER;
  v_goals INTEGER;
  v_assists INTEGER;
  v_matches INTEGER;
  v_minutes INTEGER;
  v_clean_sheets INTEGER;
  v_saves INTEGER;
BEGIN
  -- Get player_id and season from the match
  v_player_id := NEW.player_id;
  
  SELECT m.season_year INTO v_season_year
  FROM public.matches m
  WHERE m.id = NEW.match_id;

  IF v_season_year IS NULL THEN
    v_season_year := EXTRACT(year FROM CURRENT_DATE)::integer;
  END IF;

  -- Get current season totals from match_player_stats
  SELECT 
    COALESCE(SUM(mps.goals), 0),
    COALESCE(SUM(mps.assists), 0),
    COUNT(DISTINCT mp.match_id),
    COALESCE(SUM(mp.minutes_played), 0),
    COALESCE(SUM(CASE WHEN mps.goals_conceded = 0 AND mp.minutes_played >= 45 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(mps.saves), 0)
  INTO v_goals, v_assists, v_matches, v_minutes, v_clean_sheets, v_saves
  FROM public.match_players mp
  JOIN public.matches m ON m.id = mp.match_id
  LEFT JOIN public.match_player_stats mps ON mps.match_id = mp.match_id AND mps.player_id = mp.player_id
  WHERE mp.player_id = v_player_id
    AND m.season_year = v_season_year
    AND m.status IN ('finished', 'stats_applied')
    AND mp.is_removed = false;

  -- GOALS achievements
  IF v_goals >= 5 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'scorer', 'bronze', v_season_year, jsonb_build_object('goals', v_goals))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_goals >= 15 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'scorer', 'silver', v_season_year, jsonb_build_object('goals', v_goals))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_goals >= 25 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'scorer', 'gold', v_season_year, jsonb_build_object('goals', v_goals))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;

  -- ASSISTS achievements
  IF v_assists >= 5 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'playmaker', 'bronze', v_season_year, jsonb_build_object('assists', v_assists))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_assists >= 12 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'playmaker', 'silver', v_season_year, jsonb_build_object('assists', v_assists))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_assists >= 20 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'playmaker', 'gold', v_season_year, jsonb_build_object('assists', v_assists))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;

  -- MATCHES achievements
  IF v_matches >= 10 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'veteran', 'bronze', v_season_year, jsonb_build_object('matches', v_matches))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_matches >= 25 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'veteran', 'silver', v_season_year, jsonb_build_object('matches', v_matches))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_matches >= 40 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'veteran', 'gold', v_season_year, jsonb_build_object('matches', v_matches))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;

  -- MINUTES achievements (1000, 2500, 4000)
  IF v_minutes >= 1000 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'ironman', 'bronze', v_season_year, jsonb_build_object('minutes', v_minutes))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_minutes >= 2500 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'ironman', 'silver', v_season_year, jsonb_build_object('minutes', v_minutes))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_minutes >= 4000 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'ironman', 'gold', v_season_year, jsonb_build_object('minutes', v_minutes))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;

  -- CLEAN SHEETS achievements (GK)
  IF v_clean_sheets >= 5 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'wall', 'bronze', v_season_year, jsonb_build_object('clean_sheets', v_clean_sheets))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_clean_sheets >= 12 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'wall', 'silver', v_season_year, jsonb_build_object('clean_sheets', v_clean_sheets))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;
  IF v_clean_sheets >= 20 THEN
    INSERT INTO public.player_achievements (player_id, achievement_type, achievement_tier, season_year, metadata)
    VALUES (v_player_id, 'wall', 'gold', v_season_year, jsonb_build_object('clean_sheets', v_clean_sheets))
    ON CONFLICT (player_id, achievement_type, achievement_tier, season_year) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'check_and_unlock_achievements failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on match_player_stats
DROP TRIGGER IF EXISTS on_stats_check_achievements ON public.match_player_stats;
CREATE TRIGGER on_stats_check_achievements
AFTER INSERT OR UPDATE ON public.match_player_stats
FOR EACH ROW
EXECUTE FUNCTION public.check_and_unlock_achievements();