-- Create table to store physical evaluation history
CREATE TABLE public.player_physical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,1),
  muscle_mass NUMERIC(5,2),
  max_speed NUMERIC(4,1),
  sprint_30m NUMERIC(4,2),
  vo2_max NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(player_id, recorded_at)
);

-- Enable RLS
ALTER TABLE public.player_physical_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view physical history"
  ON public.player_physical_history FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can insert physical history"
  ON public.player_physical_history FOR INSERT
  WITH CHECK (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can update physical history"
  ON public.player_physical_history FOR UPDATE
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Internal users can delete physical history"
  ON public.player_physical_history FOR DELETE
  USING (public.is_internal_user(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_player_physical_history_player_date 
  ON public.player_physical_history(player_id, recorded_at DESC);

-- Add comment
COMMENT ON TABLE public.player_physical_history IS 'Historical records of player physical evaluations over time';