-- Create player_stats table for storing athlete statistics per season/competition
CREATE TABLE public.player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  matches INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  tackles INTEGER NOT NULL DEFAULT 0,
  interceptions INTEGER NOT NULL DEFAULT 0,
  recoveries INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint for upsert operations
  CONSTRAINT player_stats_unique_season_competition UNIQUE (player_id, season_year, competition_id)
);

-- Create validation trigger function for non-negative values
CREATE OR REPLACE FUNCTION public.validate_player_stats_non_negative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.matches < 0 THEN
    RAISE EXCEPTION 'matches cannot be negative';
  END IF;
  IF NEW.minutes < 0 THEN
    RAISE EXCEPTION 'minutes cannot be negative';
  END IF;
  IF NEW.goals < 0 THEN
    RAISE EXCEPTION 'goals cannot be negative';
  END IF;
  IF NEW.assists < 0 THEN
    RAISE EXCEPTION 'assists cannot be negative';
  END IF;
  IF NEW.yellow_cards < 0 THEN
    RAISE EXCEPTION 'yellow_cards cannot be negative';
  END IF;
  IF NEW.red_cards < 0 THEN
    RAISE EXCEPTION 'red_cards cannot be negative';
  END IF;
  IF NEW.tackles < 0 THEN
    RAISE EXCEPTION 'tackles cannot be negative';
  END IF;
  IF NEW.interceptions < 0 THEN
    RAISE EXCEPTION 'interceptions cannot be negative';
  END IF;
  IF NEW.recoveries < 0 THEN
    RAISE EXCEPTION 'recoveries cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create validation trigger
CREATE TRIGGER validate_player_stats_before_insert_update
  BEFORE INSERT OR UPDATE ON public.player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_player_stats_non_negative();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON public.player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view player stats"
  ON public.player_stats
  FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create player stats"
  ON public.player_stats
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update player stats"
  ON public.player_stats
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete player stats"
  ON public.player_stats
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_player_stats_player_id ON public.player_stats(player_id);
CREATE INDEX idx_player_stats_season_year ON public.player_stats(season_year);
CREATE INDEX idx_player_stats_competition_id ON public.player_stats(competition_id);