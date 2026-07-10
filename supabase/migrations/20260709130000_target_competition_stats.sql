ALTER TABLE public.targets
  DROP COLUMN IF EXISTS matches_played,
  DROP COLUMN IF EXISTS minutes_played,
  DROP COLUMN IF EXISTS goals,
  DROP COLUMN IF EXISTS assists,
  DROP COLUMN IF EXISTS yellow_cards,
  DROP COLUMN IF EXISTS red_cards;

CREATE TABLE public.target_competition_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id),
  matches_played INTEGER,
  minutes_played INTEGER,
  goals INTEGER,
  assists INTEGER,
  yellow_cards INTEGER,
  red_cards INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT target_competition_stats_unique UNIQUE (target_id, competition_id)
);

ALTER TABLE public.target_competition_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can view target competition stats"
  ON public.target_competition_stats FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create target competition stats"
  ON public.target_competition_stats FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update target competition stats"
  ON public.target_competition_stats FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete target competition stats"
  ON public.target_competition_stats FOR DELETE
  USING (is_admin(auth.uid()));

CREATE INDEX idx_target_competition_stats_target_id ON public.target_competition_stats(target_id);

CREATE TRIGGER update_target_competition_stats_updated_at
  BEFORE UPDATE ON public.target_competition_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
