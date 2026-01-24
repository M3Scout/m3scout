-- ============================================
-- 1. Create player_season_goals table
-- ============================================
CREATE TABLE public.player_season_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE)::integer,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('goals', 'assists', 'matches', 'minutes', 'clean_sheets', 'saves')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(player_id, season_year, goal_type)
);

-- Enable RLS
ALTER TABLE public.player_season_goals ENABLE ROW LEVEL SECURITY;

-- Players can view their own goals
CREATE POLICY "Players can view their own goals" 
ON public.player_season_goals 
FOR SELECT 
USING (
  (is_player(auth.uid()) AND player_id = get_linked_player_id(auth.uid()))
  OR is_internal_user(auth.uid())
);

-- Admins can manage all goals
CREATE POLICY "Admins can manage goals" 
ON public.player_season_goals 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Scouts can create/update goals
CREATE POLICY "Scouts can create goals" 
ON public.player_season_goals 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'scout'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Scouts can update goals" 
ON public.player_season_goals 
FOR UPDATE 
USING (has_role(auth.uid(), 'scout'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_player_season_goals_updated_at
BEFORE UPDATE ON public.player_season_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. Create notification triggers
-- ============================================

-- Function to notify player when added to match lineup
CREATE OR REPLACE FUNCTION public.notify_player_added_to_match()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_match_date TEXT;
  v_opponent TEXT;
BEGIN
  -- Only trigger on new non-removed entries
  IF NEW.is_removed = true THEN
    RETURN NEW;
  END IF;

  -- Get user_id from user_roles where linked_player_id matches
  SELECT ur.user_id INTO v_user_id
  FROM public.user_roles ur
  WHERE ur.linked_player_id = NEW.player_id
    AND ur.role = 'player'
    AND ur.status = 'active'
  LIMIT 1;

  -- If no linked user, skip notification
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get match details
  SELECT 
    to_char(m.match_date, 'DD/MM/YYYY'),
    m.opponent_name
  INTO v_match_date, v_opponent
  FROM public.matches m
  WHERE m.id = NEW.match_id;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_user_id,
    'match',
    'Você foi escalado!',
    'Você foi adicionado à partida contra ' || COALESCE(v_opponent, 'adversário') || ' em ' || COALESCE(v_match_date, 'data a definir'),
    '/app/live-match/' || NEW.match_id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE WARNING 'notify_player_added_to_match failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for match_players
DROP TRIGGER IF EXISTS on_player_added_to_match ON public.match_players;
CREATE TRIGGER on_player_added_to_match
AFTER INSERT ON public.match_players
FOR EACH ROW
EXECUTE FUNCTION public.notify_player_added_to_match();

-- Function to notify player when a new scouting report is created about them
CREATE OR REPLACE FUNCTION public.notify_player_new_report()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_match_date TEXT;
  v_competition_name TEXT;
BEGIN
  -- Get user_id from user_roles where linked_player_id matches
  SELECT ur.user_id INTO v_user_id
  FROM public.user_roles ur
  WHERE ur.linked_player_id = NEW.player_id
    AND ur.role = 'player'
    AND ur.status = 'active'
  LIMIT 1;

  -- If no linked user, skip notification
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get competition name
  SELECT c.name INTO v_competition_name
  FROM public.competitions c
  WHERE c.id = NEW.competition_id;

  -- Format date
  v_match_date := to_char(NEW.match_date, 'DD/MM/YYYY');

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_user_id,
    'report',
    'Novo Relatório Disponível',
    'Um novo relatório foi criado sobre sua atuação' || 
      CASE WHEN v_competition_name IS NOT NULL THEN ' em ' || v_competition_name ELSE '' END ||
      ' (' || COALESCE(v_match_date, 'data não informada') || ')',
    '/app/reports/' || NEW.id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE WARNING 'notify_player_new_report failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for scouting_reports
DROP TRIGGER IF EXISTS on_scouting_report_created ON public.scouting_reports;
CREATE TRIGGER on_scouting_report_created
AFTER INSERT ON public.scouting_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_player_new_report();