-- Add new monitoring fields to targets table for comprehensive athlete tracking

-- Observation/Monitoring fields
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS observation_context TEXT;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS observation_type TEXT; -- 'video', 'in_person', 'third_party_report', 'referral'
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS games_observed INTEGER DEFAULT 0;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS minutes_observed INTEGER;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS perceived_profile TEXT;

-- Position/Physical fields
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS secondary_position TEXT;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS notable_characteristics TEXT[] DEFAULT '{}';

-- Strategy fields
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS market_strategy TEXT;
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS interest_reason TEXT; -- 'appreciation_potential', 'market_opportunity', 'rare_profile', 'strategic_referral'
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS ideal_approach_window TEXT; -- 'now', '3_6_months', '6_12_months'

-- Structured competition reference (links to competitions table)
ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id);

-- Add comment for documentation
COMMENT ON COLUMN public.targets.observation_type IS 'Type of observation: video, in_person, third_party_report, referral';
COMMENT ON COLUMN public.targets.interest_reason IS 'Reason for interest: appreciation_potential, market_opportunity, rare_profile, strategic_referral';
COMMENT ON COLUMN public.targets.ideal_approach_window IS 'Ideal approach window: now, 3_6_months, 6_12_months';
COMMENT ON COLUMN public.targets.competition_id IS 'Reference to structured competition from competitions table';