-- =================================================
-- MANUAL PLAYER STATS TABLE
-- Stores statistics for games NOT tracked via Live Match
-- (e.g., external games, historical data)
-- =================================================

CREATE TABLE IF NOT EXISTS public.manual_player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  
  -- REQUIRED: Context for manual entries
  games INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Core stats
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  
  -- Shooting
  shots INTEGER NOT NULL DEFAULT 0,
  shots_on_target INTEGER NOT NULL DEFAULT 0,
  
  -- Passing
  passes_completed INTEGER NOT NULL DEFAULT 0,
  passes_failed INTEGER NOT NULL DEFAULT 0,
  key_passes INTEGER NOT NULL DEFAULT 0,
  chances_created INTEGER NOT NULL DEFAULT 0,
  
  -- Dribbles
  dribbles_success INTEGER NOT NULL DEFAULT 0,
  dribbles_failed INTEGER NOT NULL DEFAULT 0,
  
  -- Defense
  tackles INTEGER NOT NULL DEFAULT 0,
  interceptions INTEGER NOT NULL DEFAULT 0,
  recoveries INTEGER NOT NULL DEFAULT 0,
  clearances INTEGER NOT NULL DEFAULT 0,
  
  -- Duels
  duels_won INTEGER NOT NULL DEFAULT 0,
  duels_lost INTEGER NOT NULL DEFAULT 0,
  aerial_duels_won INTEGER NOT NULL DEFAULT 0,
  aerial_duels_lost INTEGER NOT NULL DEFAULT 0,
  
  -- Discipline
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  fouls_committed INTEGER NOT NULL DEFAULT 0,
  fouls_suffered INTEGER NOT NULL DEFAULT 0,
  
  -- Goalkeeper
  saves INTEGER NOT NULL DEFAULT 0,
  goals_conceded INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  penalties_saved INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- UNIQUE constraint: only ONE manual stats entry per athlete/season/competition
  CONSTRAINT unique_manual_stats_per_season_competition 
    UNIQUE (player_id, season_year, competition_id)
);

-- Enable RLS
ALTER TABLE public.manual_player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view manual stats"
  ON public.manual_player_stats FOR SELECT
  USING (is_internal_user(auth.uid()));

CREATE POLICY "Players can view their own manual stats"
  ON public.manual_player_stats FOR SELECT
  USING (has_valid_role(auth.uid()) AND player_id = get_linked_player_id(auth.uid()));

CREATE POLICY "Public can view manual stats for public players"
  ON public.manual_player_stats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM players
    WHERE players.id = manual_player_stats.player_id
    AND players.is_public = true
    AND (players.is_archived = false OR players.is_archived IS NULL)
  ));

CREATE POLICY "Scouts and admins can manage manual stats"
  ON public.manual_player_stats FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_manual_player_stats_updated_at
  BEFORE UPDATE ON public.manual_player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_manual_player_stats_player_season 
  ON public.manual_player_stats(player_id, season_year);

-- Comment for documentation
COMMENT ON TABLE public.manual_player_stats IS 
'Stores manually entered statistics for games NOT tracked via Live Match (external games, historical data). 
Uses UNIQUE constraint per player/season/competition to prevent duplication.
These stats are NOT used for rating calculations - only Live Match data affects ratings.';