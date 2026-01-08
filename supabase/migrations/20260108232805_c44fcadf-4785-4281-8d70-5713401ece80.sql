-- Add new columns to players table

-- Physical data
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS weight numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS body_fat_percentage numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS muscle_mass numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS wingspan integer;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS max_speed numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS sprint_30m numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS vo2_max numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_physical_evaluation date;

-- Technical profile
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS playing_height_preference text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS play_style text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS primary_tactical_role text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS secondary_tactical_role text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS strengths text[] DEFAULT '{}';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS areas_to_develop text[] DEFAULT '{}';

-- Contract additional fields
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS contract_start date;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS release_clause text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS contract_status text DEFAULT 'contracted';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS passports text[] DEFAULT '{}';

-- Medical status
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS physical_status text DEFAULT 'fit';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS medical_notes text;

-- Internal evaluation (private)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS overall_rating numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS potential_rating numeric;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS ready_to_compete boolean;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS estimated_level text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS internal_evaluation_notes text;

-- Create player_injuries table
CREATE TABLE IF NOT EXISTS public.player_injuries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  injury_type text NOT NULL,
  start_date date NOT NULL,
  return_date date,
  severity text NOT NULL DEFAULT 'medium',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on player_injuries
ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_injuries
CREATE POLICY "Internal users can view injuries"
  ON public.player_injuries
  FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create injuries"
  ON public.player_injuries
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update injuries"
  ON public.player_injuries
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete injuries"
  ON public.player_injuries
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at on player_injuries
CREATE TRIGGER update_player_injuries_updated_at
  BEFORE UPDATE ON public.player_injuries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();