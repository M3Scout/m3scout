-- Create enum for match status
DO $$ BEGIN
  CREATE TYPE public.match_status AS ENUM ('draft', 'live', 'finished', 'applied');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for position template
DO $$ BEGIN
  CREATE TYPE public.position_template AS ENUM ('outfield', 'goalkeeper');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for match event types
DO $$ BEGIN
  CREATE TYPE public.match_event_type AS ENUM (
    -- Outfield events
    'goal', 'assist', 'shot', 'shot_on_target',
    'key_pass', 'chance_created',
    'dribble_success', 'dribble_attempt',
    'tackle', 'interception', 'recovery', 'clearance',
    'duel_won', 'duel_total', 'aerial_duel_won',
    'yellow', 'red', 'foul_committed', 'foul_suffered',
    'pass_success', 'pass_total', 'possession_lost',
    -- Goalkeeper events
    'save', 'goal_conceded', 'clean_sheet',
    'penalty_saved', 'error_led_to_goal',
    'box_save', 'punch', 'high_claim', 'sweeper_action'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3.1 matches table
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  season_year integer NOT NULL DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer,
  opponent_name text NOT NULL,
  match_date timestamp with time zone NOT NULL DEFAULT now(),
  venue text,
  status match_status NOT NULL DEFAULT 'draft',
  duration_minutes integer NOT NULL DEFAULT 90,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for matches
CREATE POLICY "Internal users can view matches"
ON public.matches FOR SELECT
USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create matches"
ON public.matches FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'))
  AND created_by = auth.uid()
);

CREATE POLICY "Scouts and admins can update their own matches"
ON public.matches FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR (has_role(auth.uid(), 'scout') AND created_by = auth.uid()))
);

CREATE POLICY "Admins can delete matches"
ON public.matches FOR DELETE
USING (is_admin(auth.uid()));

-- 3.2 match_players table
CREATE TABLE public.match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position_template position_template NOT NULL DEFAULT 'outfield',
  started boolean NOT NULL DEFAULT false,
  entered_minute integer,
  exited_minute integer,
  minutes_played integer,
  is_on_field boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS on match_players
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for match_players
CREATE POLICY "Internal users can view match players"
ON public.match_players FOR SELECT
USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can manage match players"
ON public.match_players FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout')
);

-- 3.3 match_events table
CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  minute integer,
  event_type match_event_type NOT NULL,
  value integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on match_events
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for match_events
CREATE POLICY "Internal users can view match events"
ON public.match_events FOR SELECT
USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can manage match events"
ON public.match_events FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout')
);

-- Create updated_at trigger for matches
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for match_players
CREATE TRIGGER update_match_players_updated_at
BEFORE UPDATE ON public.match_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();