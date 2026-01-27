-- =====================================================
-- M3 MARKET SCORE MODULE - Database Infrastructure
-- =====================================================

-- Create enum for market score type
CREATE TYPE market_score_type AS ENUM ('ACTIVE', 'TARGET');

-- Create enum for market score trend
CREATE TYPE market_score_trend AS ENUM ('UP', 'DOWN', 'FLAT');

-- Create enum for target status
CREATE TYPE target_status AS ENUM ('MONITORING', 'APPROACH', 'NEGOTIATION', 'DROPPED', 'SIGNED');

-- Create enum for target priority
CREATE TYPE target_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- =====================================================
-- TARGETS TABLE (external players being monitored)
-- =====================================================
CREATE TABLE public.targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  birth_date DATE,
  age_estimate INTEGER,
  current_club TEXT,
  league_competition TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  dominant_foot TEXT,
  height INTEGER,
  weight NUMERIC,
  source TEXT,
  status target_status NOT NULL DEFAULT 'MONITORING',
  priority target_priority NOT NULL DEFAULT 'MEDIUM',
  tags TEXT[] DEFAULT '{}',
  notes_internal TEXT,
  photo_url TEXT,
  highlight_video_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on targets
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- RLS policies for targets
CREATE POLICY "Internal users can view targets"
  ON public.targets FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create targets"
  ON public.targets FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update targets"
  ON public.targets FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete targets"
  ON public.targets FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- TARGET OBSERVATIONS TABLE (scouting notes)
-- =====================================================
CREATE TABLE public.target_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  match_context TEXT,
  opponent TEXT,
  competition TEXT,
  result TEXT,
  minutes_observed INTEGER,
  qualitative_notes TEXT,
  performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 10),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on target_observations
ALTER TABLE public.target_observations ENABLE ROW LEVEL SECURITY;

-- RLS policies for target_observations
CREATE POLICY "Internal users can view observations"
  ON public.target_observations FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create observations"
  ON public.target_observations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update observations"
  ON public.target_observations FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete observations"
  ON public.target_observations FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- MARKET SCORES TABLE (main score storage)
-- =====================================================
CREATE TABLE public.market_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.targets(id) ON DELETE CASCADE,
  type market_score_type NOT NULL,
  score_total NUMERIC NOT NULL DEFAULT 0 CHECK (score_total >= 0 AND score_total <= 100),
  score_age_window NUMERIC NOT NULL DEFAULT 0 CHECK (score_age_window >= 0 AND score_age_window <= 100),
  score_performance_impact NUMERIC NOT NULL DEFAULT 0 CHECK (score_performance_impact >= 0 AND score_performance_impact <= 100),
  score_competitive_context NUMERIC NOT NULL DEFAULT 0 CHECK (score_competitive_context >= 0 AND score_competitive_context <= 100),
  score_consistency_reliability NUMERIC NOT NULL DEFAULT 0 CHECK (score_consistency_reliability >= 0 AND score_consistency_reliability <= 100),
  score_market_profile NUMERIC NOT NULL DEFAULT 0 CHECK (score_market_profile >= 0 AND score_market_profile <= 100),
  confidence_level NUMERIC NOT NULL DEFAULT 0 CHECK (confidence_level >= 0 AND confidence_level <= 100),
  trend_30d market_score_trend DEFAULT 'FLAT',
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calculated_from_range TEXT,
  calculation_details JSONB,
  notes_internal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Constraint: one of athlete_id or target_id must be set
  CONSTRAINT market_scores_entity_check CHECK (
    (athlete_id IS NOT NULL AND target_id IS NULL AND type = 'ACTIVE') OR
    (target_id IS NOT NULL AND athlete_id IS NULL AND type = 'TARGET')
  ),
  -- Unique constraint per entity
  CONSTRAINT market_scores_athlete_unique UNIQUE (athlete_id),
  CONSTRAINT market_scores_target_unique UNIQUE (target_id)
);

-- Enable RLS on market_scores
ALTER TABLE public.market_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for market_scores
CREATE POLICY "Internal users can view market scores"
  ON public.market_scores FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create market scores"
  ON public.market_scores FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update market scores"
  ON public.market_scores FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete market scores"
  ON public.market_scores FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- MARKET SCORE EVENTS TABLE (audit log)
-- =====================================================
CREATE TABLE public.market_score_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_score_id UUID NOT NULL REFERENCES public.market_scores(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  previous_score_total NUMERIC,
  new_score_total NUMERIC NOT NULL,
  delta NUMERIC NOT NULL DEFAULT 0,
  details JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on market_score_events
ALTER TABLE public.market_score_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for market_score_events
CREATE POLICY "Internal users can view score events"
  ON public.market_score_events FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create score events"
  ON public.market_score_events FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_market_scores_athlete_id ON public.market_scores(athlete_id) WHERE athlete_id IS NOT NULL;
CREATE INDEX idx_market_scores_target_id ON public.market_scores(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_market_scores_type ON public.market_scores(type);
CREATE INDEX idx_market_scores_score_total ON public.market_scores(score_total DESC);
CREATE INDEX idx_market_score_events_market_score_id ON public.market_score_events(market_score_id);
CREATE INDEX idx_targets_status ON public.targets(status);
CREATE INDEX idx_targets_priority ON public.targets(priority);
CREATE INDEX idx_target_observations_target_id ON public.target_observations(target_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE TRIGGER update_targets_updated_at
  BEFORE UPDATE ON public.targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_scores_updated_at
  BEFORE UPDATE ON public.market_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();