-- Create competition_phases table
CREATE TABLE public.competition_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  phase_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competition_phases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view phases" ON public.competition_phases
FOR SELECT USING (true);

CREATE POLICY "Admins can manage phases" ON public.competition_phases
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Add is_unique column to competitions
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS is_unique BOOLEAN DEFAULT false;

-- Add phase_id to scouting_reports for optional phase tracking
ALTER TABLE public.scouting_reports
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.competition_phases(id);

-- Keep one Copa do Brasil entry and delete duplicates
-- First, get the ID of the first Copa do Brasil entry to keep
DO $$
DECLARE
  keep_id UUID;
  copa_ids UUID[];
BEGIN
  -- Get all Copa do Brasil IDs
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO copa_ids
  FROM public.competitions
  WHERE division = 'Copa do Brasil' OR name LIKE '%Copa do Brasil%';
  
  IF array_length(copa_ids, 1) > 0 THEN
    keep_id := copa_ids[1];
    
    -- Update all references to point to the kept entry
    UPDATE public.scouting_reports
    SET competition_id = keep_id
    WHERE competition_id = ANY(copa_ids) AND competition_id != keep_id;
    
    UPDATE public.player_stats
    SET competition_id = keep_id
    WHERE competition_id = ANY(copa_ids) AND competition_id != keep_id;
    
    -- Delete duplicate entries
    DELETE FROM public.competitions
    WHERE (division = 'Copa do Brasil' OR name LIKE '%Copa do Brasil%')
    AND id != keep_id;
    
    -- Update the kept entry
    UPDATE public.competitions
    SET 
      name = 'Brasil – Copa do Brasil',
      display_name = 'Copa do Brasil',
      competition_code = 'BR-CDB',
      is_unique = true,
      type = 'cup',
      country = 'Brasil'
    WHERE id = keep_id;
    
    -- Insert phases for Copa do Brasil
    INSERT INTO public.competition_phases (competition_id, phase_name, phase_order, phase_weight)
    VALUES
      (keep_id, '1ª Fase', 1, 0.90),
      (keep_id, '2ª Fase', 2, 0.95),
      (keep_id, '3ª Fase', 3, 1.00),
      (keep_id, 'Oitavas de Final', 4, 1.05),
      (keep_id, 'Quartas de Final', 5, 1.10),
      (keep_id, 'Semifinal', 6, 1.15),
      (keep_id, 'Final', 7, 1.25);
  END IF;
END $$;

-- Create index for faster phase lookups
CREATE INDEX idx_competition_phases_competition ON public.competition_phases(competition_id);