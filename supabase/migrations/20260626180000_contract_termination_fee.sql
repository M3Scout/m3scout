ALTER TABLE public.player_contract_history
  ADD COLUMN IF NOT EXISTS termination_fee TEXT;
