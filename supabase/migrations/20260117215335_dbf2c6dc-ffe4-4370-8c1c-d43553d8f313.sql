-- Create teams table for reusable team configurations
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  short_name text,
  logo_url text,
  primary_color text DEFAULT '#22c55e',
  secondary_color text DEFAULT '#ffffff',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Internal users can view teams" 
ON public.teams FOR SELECT 
USING (is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can manage teams" 
ON public.teams FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'scout'::app_role));

-- Add team_id to matches for linking
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS home_team_id uuid REFERENCES public.teams(id);

-- Create RPC to delete the last event of a specific type for a player
CREATE OR REPLACE FUNCTION public.delete_last_live_event(
  p_game_id uuid,
  p_player_id uuid,
  p_event_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_match RECORD;
BEGIN
  -- Fetch match info
  SELECT * INTO v_match FROM matches WHERE id = p_game_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Partida não encontrada');
  END IF;
  
  -- Find the most recent event of this type for this player in this match
  SELECT * INTO v_event 
  FROM match_events 
  WHERE match_id = p_game_id 
    AND player_id = p_player_id 
    AND event_type = p_event_type::match_event_type
    AND event_status != 'voided'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Nenhum evento encontrado para remover');
  END IF;
  
  -- If the event was official, reverse the stats
  IF v_event.event_status = 'official' AND v_event.count_in_stats THEN
    PERFORM apply_event_stats(
      p_delta := -1,
      p_event_type := p_event_type,
      p_match_id := p_game_id,
      p_player_id := p_player_id
    );
  END IF;
  
  -- Mark the event as voided instead of deleting (for audit trail)
  UPDATE match_events 
  SET 
    event_status = 'voided',
    count_in_stats = false,
    void_reason = 'Removido pelo usuário'
  WHERE id = v_event.id;
  
  RETURN json_build_object(
    'success', true,
    'event_id', v_event.id,
    'event_type', p_event_type,
    'message', 'Evento removido com sucesso'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Create index for faster event lookups
CREATE INDEX IF NOT EXISTS idx_match_events_player_type 
ON match_events(match_id, player_id, event_type, created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();