-- Create brazil_state_tiers table for state competition tiers
CREATE TABLE public.brazil_state_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  state_name TEXT,
  tier INTEGER NOT NULL,
  tier_label TEXT,
  base_coefficient DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(state, tier)
);

ALTER TABLE public.brazil_state_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view state tiers"
ON public.brazil_state_tiers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage state tiers"
ON public.brazil_state_tiers FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add unique constraint to competitions for upsert
ALTER TABLE public.competitions 
ADD CONSTRAINT competitions_unique_key 
UNIQUE (country, state, name, division, phase);

-- Create index
CREATE INDEX idx_brazil_state_tiers_state ON public.brazil_state_tiers(state);

-- Trigger for updated_at
CREATE TRIGGER update_brazil_state_tiers_updated_at
  BEFORE UPDATE ON public.brazil_state_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();