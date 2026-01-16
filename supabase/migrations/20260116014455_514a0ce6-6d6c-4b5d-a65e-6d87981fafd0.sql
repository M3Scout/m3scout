-- Create table to store contract history
CREATE TABLE public.player_contract_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_name TEXT NOT NULL,
  club_country TEXT,
  contract_type TEXT NOT NULL DEFAULT 'permanent', -- permanent, loan, youth
  start_date DATE NOT NULL,
  end_date DATE,
  transfer_fee TEXT,
  salary_info TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_contract_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view contract history"
  ON public.player_contract_history FOR SELECT
  USING (public.is_internal_user(auth.uid()));

CREATE POLICY "Scouts and admins can create contract history"
  ON public.player_contract_history FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scout'));

CREATE POLICY "Scouts and admins can update contract history"
  ON public.player_contract_history FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'scout'));

CREATE POLICY "Admins can delete contract history"
  ON public.player_contract_history FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_player_contract_history_player 
  ON public.player_contract_history(player_id, start_date DESC);

-- Add comment
COMMENT ON TABLE public.player_contract_history IS 'Historical records of player contracts with different clubs';